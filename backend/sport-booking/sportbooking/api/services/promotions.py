from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from django.db import models
from django.utils import timezone
from typing import Optional
import datetime

from ..models import Promotion, Section, Subscription, User, SportCenter


class PromotionService:

    def get_applicable_promotions(
        self,
        user: User,
        discount_type: str,
        section: Optional[Section] = None,
        subscription: Optional[Subscription] = None,
        center: Optional[SportCenter] = None,
    ) -> list[Promotion]:
        now = timezone.now()
        today = now.date()

        promotions = Promotion.objects.filter(
            is_active=True,
            discount_type=discount_type,
        )
        
        filtered_promotions = []
        for promo in promotions:
            promo_start_date = promo.start_date.date() if promo.start_date else None
            promo_end_date = promo.end_date.date() if promo.end_date else None
            if promo_start_date and promo_end_date:
                if promo_start_date <= today <= promo_end_date:
                    filtered_promotions.append(promo.id)
        
        promotions = promotions.filter(id__in=filtered_promotions)

        promotions = promotions.filter(
            models.Q(scope=Promotion.PromotionScope.GENERAL) |
            models.Q(scope=Promotion.PromotionScope.PERSONAL, target_user=user)
        )

        if discount_type == Promotion.DiscountType.BOOKING:
            if center:
                promotions = promotions.filter(
                    models.Q(target_center__isnull=True) |
                    models.Q(target_center=center)
                )

            if section:
                section_id = section.id if hasattr(section, 'id') else section
                promotions = promotions.filter(
                    models.Q(target_section__isnull=True) |
                    models.Q(target_section_id=section_id)
                )
            
            if section:
                section_age_category = section.ageCategory or ''
                promotions = promotions.filter(
                    models.Q(target_age_category__isnull=True) |
                    models.Q(target_age_category='') |
                    models.Q(target_age_category=section_age_category)
                )

        if discount_type == Promotion.DiscountType.SUBSCRIPTION:
            if subscription:
                promotions = promotions.filter(
                    models.Q(target_subscription__isnull=True) |
                    models.Q(target_subscription=subscription)
                )
            else:
                promotions = promotions.filter(target_subscription__isnull=True)

        return list(promotions.order_by("-discount_value", "-created_at"))

    def calculate_discount(
        self,
        base_price: Decimal,
        promotions: list[Promotion],
    ) -> Decimal:

        if not promotions:
            return Decimal("0.00")

        max_discount = Decimal("0.00")
        for promotion in promotions:
            if promotion.discount_value:
                discount = promotion.calculate_discount(base_price)
                if discount > max_discount:
                    max_discount = discount

        return max_discount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def get_final_price(
        self,
        base_price: Decimal,
        user: User,
        discount_type: str,
        section: Optional[Section] = None,
        subscription: Optional[Subscription] = None,
        center: Optional[SportCenter] = None,
    ) -> tuple[Decimal, Decimal, Optional[Promotion]]:

        promotions = self.get_applicable_promotions(
            user=user,
            discount_type=discount_type,
            section=section,
            subscription=subscription,
            center=center,
        )

        discount = self.calculate_discount(base_price, promotions)
        final_price = (base_price - discount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        applied_promotion = None
        if promotions:
            max_discount_value = Decimal("0.00")
            for promo in promotions:
                if promo.discount_value:
                    promo_discount = promo.calculate_discount(base_price)
                    if promo_discount > max_discount_value:
                        max_discount_value = promo_discount
                        applied_promotion = promo

        return final_price, discount, applied_promotion


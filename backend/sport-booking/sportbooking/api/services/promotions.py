from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from django.db import models
from django.utils import timezone
from typing import Optional

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

        promotions = Promotion.objects.filter(
            is_active=True,
            discount_type=discount_type,
            start_date__lte=now,
            end_date__gte=now,
        )

        promotions = promotions.filter(
            models.Q(scope=Promotion.PromotionScope.GENERAL) |
            models.Q(scope=Promotion.PromotionScope.PERSONAL, target_user=user)
        )

        if center:
            promotions = promotions.filter(
                models.Q(target_center__isnull=True) |
                models.Q(target_center=center)
            )

        if section:
            promotions = promotions.filter(
                models.Q(target_section__isnull=True) |
                models.Q(target_section=section)
            )
        

        if section:
            section_age_category = section.ageCategory or ''
            promotions = promotions.filter(
                models.Q(target_age_category__isnull=True) |
                models.Q(target_age_category='') |
                models.Q(target_age_category=section_age_category)
            )

        if subscription:
            promotions = promotions.filter(
                models.Q(target_subscription__isnull=True) |
                models.Q(target_subscription=subscription)
            )

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


from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
import re
from datetime import date, datetime

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from ..models import Booking, Payment, ScheduleSlot, Subscription, User, UserMembership
from .loyalty import LoyaltyService
from .notifications import NotificationService
from .payments import PaymentService


class BookingService:
    """Coordinates booking workflow using GRASP Controller approach."""

    FREE_CLASSES_PER_MONTH = {
        Subscription.SubscriptionType.MONTHLY: 8,
        Subscription.SubscriptionType.PREMIUM: 16,
        Subscription.SubscriptionType.CORPORATE: 0,
    }
    
    DISCOUNT_AFTER_FREE = {
        Subscription.SubscriptionType.MONTHLY: Decimal("0.50"),
        Subscription.SubscriptionType.PREMIUM: Decimal("0.50"),
        Subscription.SubscriptionType.CORPORATE: Decimal("0.75"),
    }

    def __init__(self) -> None:
        self.payment_service = PaymentService()
        self.loyalty_service = LoyaltyService()
        self.notification_service = NotificationService()

    def create_booking(
        self,
        *,
        user: User,
        schedule_slot: ScheduleSlot,
        payment_method: str = Payment.PaymentMethod.CARD,
        notes: str = "",
    ) -> Booking:
        with transaction.atomic():
            slot = ScheduleSlot.objects.select_for_update().get(pk=schedule_slot.pk)
            if slot.available_spots <= 0:
                raise ValidationError("Немає вільних місць на цей час.")

            # Check if user already has a booking for this slot (not cancelled)
            existing_booking = Booking.objects.filter(
                user=user,
                schedule_slot=slot,
                status__in=[Booking.BookingStatus.PENDING, Booking.BookingStatus.CONFIRMED],
            ).first()
            
            if existing_booking:
                raise ValidationError("Ви вже маєте бронювання на цей час. Неможливо забронювати двічі на один і той самий слот.")

            # Check age restrictions for children's sections
            age_category = slot.section.ageCategory
            
            if "Діти" in age_category or "Kids" in age_category:
                if not user.date_of_birth:
                    raise ValidationError("Для запису на дитячу секцію потрібно вказати дату народження в профілі.")
                
                age = self._calculate_age(user.date_of_birth)
                
                age_match = re.search(r'(\d+)-(\d+)', age_category)
                if age_match:
                    min_age = int(age_match.group(1))
                    max_age = int(age_match.group(2))
                    if age < min_age or age > max_age:
                        if age >= 18:
                            raise ValidationError(
                                f"Ця секція призначена для дітей віком {min_age}-{max_age} років. "
                                f"Вам більше 17 років, тому ви не можете записатися на цю секцію."
                            )
                        else:
                            raise ValidationError(
                                f"Ця секція призначена для дітей віком {min_age}-{max_age} років. "
                                f"Ваш вік: {age} років."
                            )
                elif age >= 18:
                    raise ValidationError(
                        "Ця секція призначена для дітей. Вам більше 17 років, тому ви не можете записатися на цю секцію."
                    )
            elif "Adults" in age_category:
                if not user.date_of_birth:
                    raise ValidationError("Для запису на секцію для дорослих потрібно вказати дату народження в профілі.")
                
                age = self._calculate_age(user.date_of_birth)
                if age < 18:
                    raise ValidationError("Ця секція призначена для дорослих. Дітям не можна записатися на цю секцію.")

            price = self._calculate_price(user, slot)

            booking = Booking.objects.create(
                user=user,
                schedule_slot=slot,
                price=price,
                notes=notes,
                status=Booking.BookingStatus.PENDING,
            )
            slot.available_spots -= 1
            slot.save(update_fields=["available_spots", "updated_at"])

            payment = self.payment_service.create_booking_payment(
                booking=booking, method=payment_method, amount=price
            )
            if payment.status == Payment.PaymentStatus.PAID:
                booking.status = Booking.BookingStatus.CONFIRMED
                booking.save(update_fields=["status", "updated_at"])

            self.loyalty_service.accrue_points(user=user, amount=price)
            self.notification_service.send_booking_confirmation(booking)
        return booking

    def cancel_booking(self, booking: Booking) -> Booking:
        with transaction.atomic():
            if booking.status == Booking.BookingStatus.CANCELLED:
                return booking

            slot = ScheduleSlot.objects.select_for_update().get(pk=booking.schedule_slot.pk)
            slot.available_spots += 1
            slot.save(update_fields=["available_spots", "updated_at"])

            booking.status = Booking.BookingStatus.CANCELLED
            booking.save(update_fields=["status", "updated_at"])
            
            # Calculate time until slot start
            time_until_slot = (slot.start_time - timezone.now()).total_seconds() / 3600  # hours
            
            if hasattr(booking, "payment"):
                # Only refund if cancellation is more than 24 hours before slot
                if time_until_slot >= 24:
                    booking.payment.status = Payment.PaymentStatus.REFUNDED
                    booking.payment.save(update_fields=["status", "updated_at"])
                else:
                    # Keep payment status as is if cancelled less than 24h before
                    pass
            
            self.notification_service.send_booking_cancellation(booking, time_until_slot)
        return booking

    def _calculate_price(self, user: User, slot: ScheduleSlot) -> Decimal:
        base_price = slot.section.base_price or Decimal("0.00")
        
        today = timezone.now().date()
        membership = (
            user.memberships.filter(
                status=UserMembership.MembershipStatus.ACTIVE,
                end_date__gte=today,
            )
            .order_by("-end_date")
            .first()
        )
        
        if not membership:
            return base_price
        
        subscription_type = membership.subscription.type
        free_classes = self.FREE_CLASSES_PER_MONTH.get(subscription_type, 0)
        
        if free_classes == 0:
            discount_multiplier = self.DISCOUNT_AFTER_FREE.get(subscription_type, Decimal("1.00"))
            return (base_price * discount_multiplier).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        
        current_month_start = today.replace(day=1)
        if today.month == 12:
            next_month_start = today.replace(year=today.year + 1, month=1, day=1)
        else:
            next_month_start = today.replace(month=today.month + 1, day=1)
        
        bookings_this_month = Booking.objects.filter(
            user=user,
            schedule_slot__start_time__gte=datetime.combine(current_month_start, datetime.min.time()),
            schedule_slot__start_time__lt=datetime.combine(next_month_start, datetime.min.time()),
            status__in=[Booking.BookingStatus.PENDING, Booking.BookingStatus.CONFIRMED],
        ).count()
        
        if bookings_this_month < free_classes:
            return Decimal("0.00")
        
        discount_multiplier = self.DISCOUNT_AFTER_FREE.get(subscription_type, Decimal("1.00"))
        return (base_price * discount_multiplier).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def _calculate_age(self, date_of_birth: date) -> int:
        """Calculate age from date of birth."""
        today = timezone.now().date()
        return today.year - date_of_birth.year - ((today.month, today.day) < (date_of_birth.month, date_of_birth.day))


from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from api.models import (
    Booking,
    GymHall,
    LoyaltyAccount,
    Notification,
    Payment,
    ScheduleSlot,
    Section,
    SportCenter,
    Subscription,
    Trainer,
    User,
    UserMembership,
)
from api.services.booking import BookingService


class BookingServiceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.center = SportCenter.objects.create(
            name="Pulse Arena",
            city="Kyiv",
            address="Some street",
            contact_phone="+380111111111",
        )
        cls.hall = GymHall.objects.create(
            center=cls.center,
            name="Main Hall",
            type="Football",
            capacity=20,
        )
        cls.trainer = Trainer.objects.create(
            center=cls.center,
            first_name="Andrii",
            last_name="Koval",
            specialization="Football",
        )
        cls.section = Section.objects.create(
            sportType="Football",
            level="Intermediate",
            ageCategory="Adults",
            capacity=cls.hall.capacity,
            hall=cls.hall,
            base_price=Decimal("420.00"),
        )
        cls.section.trainers.add(cls.trainer)

        cls.user = User.objects.create_user(
            username="service-user",
            password="test12345",
            role=User.Role.CUSTOMER,
        )
        cls.subscription = Subscription.objects.create(
            type=Subscription.SubscriptionType.CORPORATE,
            price=Decimal("5000.00"),
            duration=30,
        )
        cls.membership = UserMembership.objects.create(
            user=cls.user,
            subscription=cls.subscription,
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timedelta(days=30),
        )

    def setUp(self):
        self.service = BookingService()

    def _fresh_slot(self):
        return ScheduleSlot.objects.create(
            section=self.section,
            hall=self.hall,
            trainer=self.trainer,
            start_time=timezone.now() + timedelta(days=1),
            end_time=timezone.now() + timedelta(days=1, hours=1),
            capacity=10,
            available_spots=10,
        )

    def test_create_booking_calculates_discount_and_creates_side_effects(self):
        slot = self._fresh_slot()

        booking = self.service.create_booking(
            user=self.user,
            schedule_slot=slot,
            payment_method=Payment.PaymentMethod.CARD,
            notes="Service test",
        )

        expected_price = (self.section.base_price * Decimal("0.75")).quantize(Decimal("0.01"))
        self.assertEqual(booking.price, expected_price)
        self.assertEqual(booking.payment.status, Payment.PaymentStatus.PAID)
        slot.refresh_from_db()
        self.assertEqual(slot.available_spots, 9)

        loyalty_account = LoyaltyAccount.objects.get(user=self.user)
        self.assertGreater(loyalty_account.points, 0)
        self.assertTrue(Notification.objects.filter(user=self.user, title__icontains="Бронювання").exists())

    def test_cancel_booking_refunds_and_restores_capacity(self):
        booking = self.service.create_booking(
            user=self.user,
            schedule_slot=self._fresh_slot(),
            payment_method=Payment.PaymentMethod.CARD,
            notes="cancel me",
        )

        cancelled = self.service.cancel_booking(booking)
        self.assertEqual(cancelled.status, Booking.BookingStatus.CANCELLED)
        self.assertEqual(cancelled.payment.status, Payment.PaymentStatus.REFUNDED)
        slot = cancelled.schedule_slot
        slot.refresh_from_db()
        self.assertEqual(slot.available_spots, slot.capacity)


from datetime import timedelta
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from api.models import (
    Booking,
    GymHall,
    ScheduleSlot,
    Section,
    SportCenter,
    Subscription,
    Trainer,
    User,
    UserMembership,
)
from api.services.booking import BookingService


class CatalogAndBookingAPITests(APITestCase):
    def setUp(self):
        self.center = SportCenter.objects.create(
            name="Move&Fit Hub",
            city="Kyiv",
            address="Main ave",
            contact_phone="+380990000000",
        )
        self.hall = GymHall.objects.create(
            center=self.center,
            name="Zen Studio",
            type="Yoga",
            capacity=25,
        )
        self.trainer = Trainer.objects.create(
            center=self.center,
            first_name="Iryna",
            last_name="Melnyk",
            specialization="Yoga",
        )
        self.section = Section.objects.create(
            sportType="Yoga Flow",
            level="Beginner",
            ageCategory="Adults",
            capacity=self.hall.capacity,
            hall=self.hall,
            base_price=Decimal("320.00"),
        )
        self.section.trainers.add(self.trainer)
        self.slot = ScheduleSlot.objects.create(
            section=self.section,
            hall=self.hall,
            trainer=self.trainer,
            start_time=timezone.now() + timedelta(days=1),
            end_time=timezone.now() + timedelta(days=1, hours=1),
            capacity=15,
            available_spots=15,
        )
        self.user = User.objects.create_user(
            username="api-user",
            password="test12345",
            role=User.Role.CUSTOMER,
        )
        subscription = Subscription.objects.create(
            type=Subscription.SubscriptionType.PREMIUM,
            price=Decimal("3000.00"),
            duration=30,
        )
        UserMembership.objects.create(
            user=self.user,
            subscription=subscription,
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timedelta(days=30),
        )
        self.auth_client = APIClient()
        self.auth_client.force_authenticate(user=self.user)
        self.public_client = APIClient()

    def test_public_section_list_available_without_auth(self):
        url = reverse("public-section-list")
        response = self.public_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["sportType"], "Yoga Flow")

    def test_public_schedule_exposes_price_field(self):
        url = reverse("public-schedule-list")
        response = self.public_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data[0]["price"]), self.section.base_price)

    def test_booking_creation_ignores_client_supplied_price(self):
        url = reverse("user-booking-list")
        payload = {
            "schedule_slot": self.slot.id,
            "notes": "via api",
            "price": "1.00",
            "payment_method": "CARD",
        }
        response = self.auth_client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        booking_price = Decimal(response.data["price"])
        expected = (self.section.base_price * Decimal("0.85")).quantize(Decimal("0.01"))
        self.assertEqual(booking_price, expected)

    def test_booking_cancel_action(self):
        booking = BookingService().create_booking(
            user=self.user,
            schedule_slot=self.slot,
            payment_method="CARD",
            notes="cancel later",
        )
        url = reverse("user-booking-cancel", args=[booking.id])
        response = self.auth_client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.BookingStatus.CANCELLED)

    def test_registration_endpoint_creates_user(self):
        url = reverse("user-register")
        payload = {
            "username": "new_user",
            "password": "StrongPass123",
            "email": "new@example.com",
        }
        response = self.public_client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="new_user").exists())


from django.core.management import call_command
from django.test import TestCase

from api.models import Booking, ScheduleSlot, SportCenter, User


class SeedDemoCommandTests(TestCase):
    def test_seed_demo_force_creates_expected_data(self):
        call_command("seed_demo", "--force")

        self.assertTrue(User.objects.filter(username="admin", is_superuser=True).exists())
        self.assertTrue(SportCenter.objects.exists())
        self.assertTrue(ScheduleSlot.objects.exists())
        self.assertTrue(Booking.objects.exists())

    def test_seed_demo_without_force_preserves_existing_data(self):
        call_command("seed_demo", "--force")
        centers_before = SportCenter.objects.count()

        call_command("seed_demo")

        self.assertEqual(SportCenter.objects.count(), centers_before)


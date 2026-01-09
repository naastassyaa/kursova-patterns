from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from api.models import GymHall, ScheduleSlot, Section, SportCenter, Trainer


class SectionModelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.center = SportCenter.objects.create(
            name="Test Center",
            city="Lviv",
            address="Main street 1",
            contact_phone="+380000000000",
        )
        cls.hall = GymHall.objects.create(
            center=cls.center,
            name="Hall A",
            type="Yoga",
            capacity=20,
        )
        cls.trainer = Trainer.objects.create(
            center=cls.center,
            first_name="Iryna",
            last_name="Trainer",
            specialization="Yoga",
        )
        cls.section = Section.objects.create(
            sportType="Yoga Flow",
            level="Beginner",
            ageCategory="Adults",
            capacity=cls.hall.capacity,
            hall=cls.hall,
            base_price=Decimal("350.00"),
        )
        cls.section.trainers.add(cls.trainer)

    def test_section_string_representation(self):
        self.assertEqual(str(self.section), "Yoga Flow (Beginner)")

    def test_schedule_slot_sets_available_spots_on_first_save(self):
        slot = ScheduleSlot.objects.create(
            section=self.section,
            hall=self.hall,
            trainer=self.trainer,
            start_time=timezone.now() + timedelta(days=1),
            end_time=timezone.now() + timedelta(days=1, hours=1),
            capacity=15,
            available_spots=0,
        )
        slot.refresh_from_db()
        self.assertEqual(slot.available_spots, 15)


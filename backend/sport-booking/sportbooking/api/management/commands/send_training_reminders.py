from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import Booking
from api.services.notifications import NotificationService


class Command(BaseCommand):
    help = "Send training reminders to users for bookings happening tomorrow."

    def handle(self, *args, **options):
        now = timezone.now()
        tomorrow_start = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow_end = tomorrow_start + timedelta(days=1)

        # Get all confirmed bookings happening tomorrow
        bookings = Booking.objects.filter(
            status=Booking.BookingStatus.CONFIRMED,
            schedule_slot__start_time__gte=tomorrow_start,
            schedule_slot__start_time__lt=tomorrow_end,
        ).select_related('user', 'schedule_slot', 'schedule_slot__section')

        count = 0
        for booking in bookings:
            # Check if reminder already sent (not perfect but avoids duplicates)
            existing_reminder = booking.user.notifications.filter(
                title="Нагадування про тренування",
                created_at__date=now.date(),
            ).exists()
            
            if not existing_reminder:
                NotificationService().send_training_reminder(booking)
                count += 1

        self.stdout.write(
            self.style.SUCCESS(f'Successfully sent {count} training reminder(s).')
        )


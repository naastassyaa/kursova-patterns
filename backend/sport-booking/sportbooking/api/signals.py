from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Section, User
from .services.notifications import NotificationService


@receiver(post_save, sender=Section)
def notify_new_section(sender, instance, created, **kwargs):
    """Send notification to all users when a new section is created."""
    if created:
        # Get all active users
        users = User.objects.filter(is_active=True)
        NotificationService().send_new_section_notification(instance, list(users))


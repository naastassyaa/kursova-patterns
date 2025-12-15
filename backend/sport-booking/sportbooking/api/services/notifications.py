from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import List

from ..models import Booking, MembershipInvitation, Notification, Section, Subscription, User, UserMembership

logger = logging.getLogger(__name__)


class NotificationObserver(ABC):
    """Observer interface (GoF Observer pattern)."""

    @abstractmethod
    def notify(self, user: User, *, title: str, message: str, notif_type: Notification.NotificationType) -> None:
        ...


class InAppNotifier(NotificationObserver):
    """Persists notifications in the DB (used by UI + mobile)."""

    def notify(self, user: User, *, title: str, message: str, notif_type: Notification.NotificationType) -> None:
        Notification.objects.create(user=user, title=title, message=message, type=notif_type)


class LoggingNotifier(NotificationObserver):
    """Fallback notifier that writes to logs (simulating email/SMS)."""

    def notify(self, user: User, *, title: str, message: str, notif_type: Notification.NotificationType) -> None:
        logger.info("Notify %s | %s: %s", user.username, title, message)


class NotificationSubject:
    """Observable entity that dispatches events to observers."""

    def __init__(self) -> None:
        self._observers: List[NotificationObserver] = []

    def register(self, observer: NotificationObserver) -> None:
        self._observers.append(observer)

    def notify(self, user: User, *, title: str, message: str, notif_type: Notification.NotificationType) -> None:
        for observer in self._observers:
            observer.notify(user, title=title, message=message, notif_type=notif_type)


subject = NotificationSubject()
subject.register(InAppNotifier())
subject.register(LoggingNotifier())


class NotificationService:
    """Facade that exposes semantic helper methods."""

    def send_booking_confirmation(self, booking: Booking) -> None:
        # Check if this is a personal training session
        is_personal_training = booking.notes and "Персональне тренування" in booking.notes
        
        if is_personal_training:
            # Extract trainer name from notes if available
            trainer_name = ""
            if booking.schedule_slot.trainer:
                trainer_name = f"з {booking.schedule_slot.trainer.first_name} {booking.schedule_slot.trainer.last_name}"
            
            subject.notify(
                booking.user,
                title="Персональне тренування заброньовано",
                message=f"Ваше персональне тренування {trainer_name} заплановано на {booking.schedule_slot.start_time:%d.%m.%Y о %H:%M}. До зустрічі!",
                notif_type=Notification.NotificationType.REMINDER,
            )
        else:
            subject.notify(
                booking.user,
                title="Бронювання секції підтверджене",
                message=f"Ви успішно записалися на секцію {booking.schedule_slot.section.sportType}. Зустрінемось {booking.schedule_slot.start_time:%d.%m.%Y о %H:%M} у залі {booking.schedule_slot.hall.name}.",
                notif_type=Notification.NotificationType.REMINDER,
            )

    def send_booking_cancellation(self, booking: Booking, hours_until_slot: float) -> None:
        if hours_until_slot < 24:
            message = f"Ваше бронювання {booking.id} скасовано. Оскільки скасування відбулося менше ніж за добу до заняття, кошти не повертаються."
        else:
            message = f"Ваше бронювання {booking.id} скасовано. Кошти будуть повернуті на ваш рахунок протягом трьох діб."
        
        subject.notify(
            booking.user,
            title="Бронювання скасовано",
            message=message,
            notif_type=Notification.NotificationType.SYSTEM,
        )

    def send_membership_confirmation(self, membership: UserMembership) -> None:
        subject.notify(
            membership.user,
            title="Абонемент оформлено",
            message=f"Ваш абонемент {membership.subscription.type} активний з {membership.start_date:%d.%m.%Y} до {membership.end_date:%d.%m.%Y}.",
            notif_type=Notification.NotificationType.SYSTEM,
        )

    def send_membership_cancellation(self, membership: UserMembership) -> None:
        subject.notify(
            membership.user,
            title="Абонемент скасовано",
            message=f"Ваш абонемент {membership.subscription.type} скасовано.",
            notif_type=Notification.NotificationType.SYSTEM,
        )

    def send_training_reminder(self, booking: Booking) -> None:
        subject.notify(
            booking.user,
            title="Нагадування про тренування",
            message=f"Не забудьте про тренування завтра {booking.schedule_slot.start_time:%d.%m о %H:%M} - {booking.schedule_slot.section.sportType}.",
            notif_type=Notification.NotificationType.REMINDER,
        )

    def send_new_section_notification(self, section: Section, users: List[User]) -> None:
        """Notify all users about a new section."""
        for user in users:
            subject.notify(
                user,
                title="Нова секція доступна!",
                message=f"Тепер доступна секція {section.sportType} ({section.level}) у залі {section.hall.name}. Записуйтесь!",
                notif_type=Notification.NotificationType.PROMO,
            )

    def send_promotion_notification(self, title: str, message: str, users: List[User]) -> None:
        """Notify all users about a promotion."""
        for user in users:
            subject.notify(
                user,
                title=title,
                message=message,
                notif_type=Notification.NotificationType.PROMO,
            )

    def send_invitation_notification(self, invitation: MembershipInvitation) -> None:
        """Відправити сповіщення про запрошення до корпоративного абонементу."""
        # Шукаємо користувача за email
        try:
            user = User.objects.get(email=invitation.email)
            subject.notify(
                user,
                title="Запрошення до корпоративного абонементу",
                message=f"Вас запрошено до корпоративного абонементу {invitation.membership.subscription.type}. Перевірте розділ 'Абонементи' для прийняття запрошення.",
                notif_type=Notification.NotificationType.SYSTEM,
            )
        except User.DoesNotExist:
            # Якщо користувача немає, логуємо (в майбутньому можна відправити email)
            logger.info(f"Invitation sent to {invitation.email} (user not registered yet)")


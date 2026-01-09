from decimal import Decimal

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    """Common audit fields for every entity."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class User(AbstractUser):
    """
    Custom User model with domain-specific fields.
    """

    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        CUSTOMER = "CUSTOMER", "Customer"
        GUEST = "GUEST", "Guest"

    role = models.CharField(max_length=50, choices=Role.choices, default=Role.CUSTOMER)
    phone = models.CharField(max_length=32, blank=True)
    avatar = models.URLField(blank=True)
    training_level = models.CharField(max_length=100, blank=True)
    preferred_sports = models.CharField(max_length=255, blank=True)
    date_of_birth = models.DateField(null=True, blank=True, help_text="Date of birth for age verification")


class SportCenter(TimeStampedModel):
    """
    Represents a single sports center location.
    """

    name = models.CharField(max_length=255)
    city = models.CharField(max_length=120)
    address = models.CharField(max_length=255)
    contact_phone = models.CharField(max_length=32)
    email = models.EmailField(blank=True)
    description = models.TextField(blank=True)
    opening_hours = models.CharField(max_length=255, blank=True)

    def __str__(self) -> str:
        return self.name


class GymHall(TimeStampedModel):
    """
    Represents a single gym hall or facility.
    """

    center = models.ForeignKey(
        SportCenter,
        on_delete=models.CASCADE,
        related_name="halls"
    )
    name = models.CharField(max_length=255)
    type = models.CharField(
        max_length=100,
        help_text="e.g., basketball court, swimming pool, fitness room",
    )
    capacity = models.PositiveIntegerField()
    equipment = models.TextField(blank=True)
    availability = models.TextField(
        blank=True, help_text="Describe the schedule or availability rules."
    )

    def __str__(self):
        return f"{self.center.name} - {self.name}"


class Trainer(TimeStampedModel):
    """
    Coach/Trainer working in the sports center.
    """

    center = models.ForeignKey(SportCenter, on_delete=models.CASCADE, related_name="trainers")
    first_name = models.CharField(max_length=120)
    last_name = models.CharField(max_length=120)
    specialization = models.CharField(max_length=120)
    experience_years = models.PositiveIntegerField(default=1)
    biography = models.TextField(blank=True)
    photo = models.URLField(blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class Section(TimeStampedModel):
    """
    Represents a sports section or class.
    """

    sportType = models.CharField(max_length=100, help_text="e.g., Football, Yoga, Fitness")
    level = models.CharField(max_length=100, help_text="e.g., Beginner, Intermediate, Advanced")
    ageCategory = models.CharField(max_length=50, help_text="e.g., Adults, Kids 7-10")
    capacity = models.PositiveIntegerField()
    hall = models.ForeignKey(
        GymHall, on_delete=models.CASCADE, related_name="sections", null=True, blank=True
    )
    base_price = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("350.00"))
    description = models.TextField(blank=True)
    trainers = models.ManyToManyField(Trainer, related_name="sections", blank=True)

    def __str__(self):
        return f"{self.sportType} ({self.level})"


class Subscription(TimeStampedModel):
    """
    Represents a type of subscription plan.
    """

    class SubscriptionType(models.TextChoices):
        SINGLE = "SINGLE", "Single Visit"
        MONTHLY = "MONTHLY", "Monthly"
        CORPORATE = "CORPORATE", "Corporate"
        PREMIUM = "PREMIUM", "Premium"

    type = models.CharField(max_length=50, choices=SubscriptionType.choices, default=SubscriptionType.SINGLE)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration = models.PositiveIntegerField(help_text="Duration in days. A single visit might be 1 day.")
    description = models.TextField(blank=True)
    perks = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.get_type_display()} - {self.price}"


class UserMembership(TimeStampedModel):
    """
    Links users to purchased subscriptions/season passes.
    """

    class MembershipStatus(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        EXPIRED = "EXPIRED", "Expired"
        SUSPENDED = "SUSPENDED", "Suspended"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="memberships")
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name="memberships")
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=MembershipStatus.choices, default=MembershipStatus.ACTIVE)
    auto_renew = models.BooleanField(default=False)
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="owned_memberships",
        null=True,
        blank=True,
        help_text="Власник корпоративного абонементу",
    )

    def __str__(self):
        return f"{self.user.username} - {self.subscription.type}"

    @property
    def is_corporate(self):
        return self.subscription.type == Subscription.SubscriptionType.CORPORATE

    @property
    def is_owner(self):
        """Перевіряє, чи є поточний користувач власником абонементу"""
        return self.owner is not None and self.owner == self.user


class MembershipInvitation(TimeStampedModel):
    """
    Запрошення користувачів до корпоративного абонементу.
    """

    class InvitationStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ACCEPTED = "ACCEPTED", "Accepted"
        REJECTED = "REJECTED", "Rejected"
        EXPIRED = "EXPIRED", "Expired"

    membership = models.ForeignKey(
        UserMembership,
        on_delete=models.CASCADE,
        related_name="invitations",
        help_text="Корпоративний абонемент, до якого запрошують",
    )
    email = models.EmailField(help_text="Email запрошеного користувача")
    invited_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_invitations",
        help_text="Користувач, який надіслав запрошення",
    )
    status = models.CharField(
        max_length=20,
        choices=InvitationStatus.choices,
        default=InvitationStatus.PENDING,
    )
    token = models.CharField(max_length=64, unique=True, help_text="Унікальний токен для прийняття запрошення")
    expires_at = models.DateTimeField(help_text="Термін дії запрошення")

    class Meta:
        unique_together = [["membership", "email"]]

    def __str__(self):
        return f"Invitation to {self.email} for {self.membership}"


class LoyaltyTier(TimeStampedModel):
    """
    Loyalty tiers that define multipliers and benefits.
    """

    class TierCode(models.TextChoices):
        STANDARD = "STANDARD", "Standard"
        PREMIUM = "PREMIUM", "Premium"
        CORPORATE = "CORPORATE", "Corporate"

    code = models.CharField(max_length=20, unique=True, choices=TierCode.choices)
    name = models.CharField(max_length=120)
    multiplier = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)
    benefits = models.TextField(blank=True)
    priority = models.PositiveIntegerField(default=1)

    def __str__(self):
        return self.name


class LoyaltyAccount(TimeStampedModel):
    """
    Tracks accrued loyalty points for a user.
    """

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="loyalty_account")
    tier = models.ForeignKey(LoyaltyTier, on_delete=models.SET_NULL, null=True, blank=True)
    points = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.user.username} - {self.points} pts"


class ScheduleSlot(TimeStampedModel):
    """
    Represents a concrete occurrence of a section/training.
    """

    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name="schedule_slots")
    hall = models.ForeignKey(GymHall, on_delete=models.CASCADE, related_name="schedule_slots")
    trainer = models.ForeignKey(Trainer, on_delete=models.SET_NULL, null=True, blank=True, related_name="schedule_slots")
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    capacity = models.PositiveIntegerField()
    available_spots = models.PositiveIntegerField()

    def save(self, *args, **kwargs):
        if not self.pk:
            self.available_spots = self.capacity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.section} | {self.start_time:%Y-%m-%d %H:%M}"


class Booking(TimeStampedModel):
    """
    Reservation of a schedule slot by a user.
    """

    class BookingStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        CANCELLED = "CANCELLED", "Cancelled"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="bookings")
    schedule_slot = models.ForeignKey(ScheduleSlot, on_delete=models.CASCADE, related_name="bookings")
    status = models.CharField(max_length=20, choices=BookingStatus.choices, default=BookingStatus.PENDING)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.schedule_slot}"


class Payment(TimeStampedModel):
    """
    Universal payment information for bookings and memberships.
    """

    class PaymentMethod(models.TextChoices):
        CARD = "CARD", "Card"
        APPLE_PAY = "APPLE_PAY", "Apple Pay"
        GOOGLE_PAY = "GOOGLE_PAY", "Google Pay"
        CASH = "CASH", "Cash"

    class PaymentStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PAID = "PAID", "Paid"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"

    # Optional FK to Booking (for slot bookings)
    booking = models.OneToOneField(
        Booking, on_delete=models.CASCADE, related_name="payment",
        null=True, blank=True
    )
    # Optional FK to UserMembership (for subscription payments)
    membership = models.OneToOneField(
        UserMembership, on_delete=models.CASCADE, related_name="payment",
        null=True, blank=True
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CARD)
    status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    transaction_id = models.CharField(max_length=120, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(booking__isnull=False, membership__isnull=True) |
                    models.Q(booking__isnull=True, membership__isnull=False)
                ),
                name="payment_must_have_booking_or_membership"
            )
        ]

    def __str__(self):
        if self.booking:
            return f"Booking #{self.booking.id} - {self.status}"
        elif self.membership:
            return f"Membership #{self.membership.id} - {self.status}"
        return f"Payment #{self.id} - {self.status}"


class Notification(TimeStampedModel):
    """
    In-app notifications sent to users.
    """

    class NotificationType(models.TextChoices):
        REMINDER = "REMINDER", "Reminder"
        PROMO = "PROMO", "Promotion"
        LOYALTY = "LOYALTY", "Loyalty"
        SYSTEM = "SYSTEM", "System"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=255)
    message = models.TextField()
    type = models.CharField(max_length=20, choices=NotificationType.choices, default=NotificationType.SYSTEM)
    is_read = models.BooleanField(default=False)
    scheduled_for = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.title}"


class Promotion(TimeStampedModel):

    class PromotionScope(models.TextChoices):
        GENERAL = "GENERAL", "Загальна"
        PERSONAL = "PERSONAL", "Персональна"

    class DiscountType(models.TextChoices):
        BOOKING = "BOOKING", "На бронювання"
        SUBSCRIPTION = "SUBSCRIPTION", "На абонемент"
        INFO = "INFO", "Інформаційна"

    class DiscountValueType(models.TextChoices):
        PERCENTAGE = "PERCENTAGE", "Відсоток"
        FIXED = "FIXED", "Фіксована сума"

    title = models.CharField(max_length=255, help_text="Заголовок акції")
    description = models.TextField(help_text="Опис акції")
    scope = models.CharField(
        max_length=20,
        choices=PromotionScope.choices,
        default=PromotionScope.GENERAL,
        help_text="Загальна або персональна акція",
    )
    discount_type = models.CharField(
        max_length=20,
        choices=DiscountType.choices,
        default=DiscountType.INFO,
        help_text="Тип знижки",
    )
    discount_value_type = models.CharField(
        max_length=20,
        choices=DiscountValueType.choices,
        default=DiscountValueType.PERCENTAGE,
        help_text="Тип значення знижки",
    )
    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Значення знижки (відсоток або фіксована сума)",
    )
    start_date = models.DateTimeField(help_text="Дата початку акції")
    end_date = models.DateTimeField(help_text="Дата закінчення акції")
    is_active = models.BooleanField(default=True, help_text="Чи активна акція")
    target_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="personal_promotions",
        null=True,
        blank=True,
        help_text="Цільовий користувач для персональної акції",
    )
    target_subscription = models.ForeignKey(
        Subscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Цільовий абонемент (якщо знижка тільки на конкретний тип)",
    )
    target_center = models.ForeignKey(
        SportCenter,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Цільовий центр (якщо знижка тільки на конкретний центр)",
    )
    target_section = models.ForeignKey(
        Section,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Цільова секція (якщо знижка тільки на конкретну секцію)",
    )
    target_age_category = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="Вікова категорія (Adults, Kids, або порожньо для всіх)",
    )

    class Meta:
        ordering = ["-start_date", "-created_at"]

    def __str__(self):
        return f"{self.title} ({self.get_scope_display()})"

    def is_valid_now(self):
        now = timezone.now()
        return (
            self.is_active
            and self.start_date <= now <= self.end_date
        )

    def calculate_discount(self, base_price: Decimal) -> Decimal:
        if not self.discount_value or not self.is_valid_now():
            return Decimal("0.00")

        if self.discount_value_type == self.DiscountValueType.PERCENTAGE:
            discount = (base_price * self.discount_value) / Decimal("100.00")
        else:
            discount = self.discount_value

        return min(discount, base_price)

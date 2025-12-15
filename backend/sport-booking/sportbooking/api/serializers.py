from django.contrib.auth.hashers import make_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    Booking,
    GymHall,
    LoyaltyAccount,
    LoyaltyTier,
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
from .services.booking import BookingService


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Кастомний serializer для JWT токенів, який додає роль користувача до токену."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Додаємо роль користувача до токену
        token['role'] = user.role
        token['username'] = user.username
        return token


class SportCenterSerializer(serializers.ModelSerializer):
    class Meta:
        model = SportCenter
        fields = "__all__"


class GymHallSerializer(serializers.ModelSerializer):
    center_name = serializers.CharField(source="center.name", read_only=True)
    center = SportCenterSerializer(read_only=True)

    class Meta:
        model = GymHall
        fields = "__all__"


class TrainerSerializer(serializers.ModelSerializer):
    center_detail = SportCenterSerializer(source="center", read_only=True)
    center_id = serializers.PrimaryKeyRelatedField(
        source="center", queryset=SportCenter.objects.all(), write_only=True
    )

    class Meta:
        model = Trainer
        fields = [
            "id",
            "first_name",
            "last_name",
            "specialization",
            "experience_years",
            "biography",
            "photo",
            "center_detail",
            "center_id",
        ]


class SectionSerializer(serializers.ModelSerializer):
    hall_detail = GymHallSerializer(source="hall", read_only=True)
    trainer_ids = serializers.PrimaryKeyRelatedField(
        source="trainers", queryset=Trainer.objects.all(), many=True, required=False
    )
    trainers = TrainerSerializer(many=True, read_only=True)

    class Meta:
        model = Section
        fields = [
            "id",
            "sportType",
            "level",
            "ageCategory",
            "capacity",
            "base_price",
            "description",
            "hall_detail",
            "hall",
            "trainer_ids",
            "trainers",
        ]


class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = "__all__"


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for Payment model - supports both booking and membership payments."""

    class Meta:
        model = Payment
        fields = [
            "id",
            "booking",
            "membership",
            "amount",
            "method",
            "status",
            "transaction_id",
            "paid_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["status", "transaction_id", "paid_at", "created_at", "updated_at"]


class UserMembershipSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    subscription_detail = SubscriptionSerializer(source="subscription", read_only=True)
    subscription = serializers.PrimaryKeyRelatedField(
        queryset=Subscription.objects.all(), write_only=True
    )
    # Payment info - read from related payment
    payment = PaymentSerializer(read_only=True)
    # Payment method for creating new memberships
    payment_method = serializers.ChoiceField(
        choices=Payment.PaymentMethod.choices,
        write_only=True,
        default=Payment.PaymentMethod.CARD
    )

    class Meta:
        model = UserMembership
        fields = [
            "id",
            "user",
            "subscription",
            "subscription_detail",
            "start_date",
            "end_date",
            "status",
            "created_at",
            "updated_at",
            "auto_renew",
            "payment",
            "payment_method",
        ]
        read_only_fields = ["status", "created_at", "updated_at"]


class LoyaltyTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyTier
        fields = "__all__"


class LoyaltyAccountSerializer(serializers.ModelSerializer):
    tier_detail = LoyaltyTierSerializer(source="tier", read_only=True)

    class Meta:
        model = LoyaltyAccount
        fields = ["id", "points", "tier", "tier_detail", "created_at", "updated_at"]
        read_only_fields = ["points", "tier", "created_at", "updated_at"]


class ScheduleSlotSerializer(serializers.ModelSerializer):
    section = SectionSerializer(read_only=True)
    section_id = serializers.PrimaryKeyRelatedField(
        source="section", queryset=Section.objects.all(), write_only=True
    )
    hall = GymHallSerializer(read_only=True)
    hall_id = serializers.PrimaryKeyRelatedField(
        source="hall", queryset=GymHall.objects.all(), write_only=True
    )
    trainer = TrainerSerializer(read_only=True)
    trainer_id = serializers.PrimaryKeyRelatedField(
        source="trainer", queryset=Trainer.objects.all(), write_only=True, required=False
    )

    class Meta:
        model = ScheduleSlot
        fields = [
            "id",
            "section",
            "section_id",
            "hall",
            "hall_id",
            "trainer",
            "trainer_id",
            "start_time",
            "end_time",
            "available_spots",
            "capacity",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["available_spots", "created_at", "updated_at"]


class BookingSerializer(serializers.ModelSerializer):
    schedule_slot_detail = ScheduleSlotSerializer(source="schedule_slot", read_only=True)
    payment = PaymentSerializer(read_only=True)
    payment_method = serializers.ChoiceField(
        choices=Payment.PaymentMethod.choices, write_only=True, default=Payment.PaymentMethod.CARD
    )
    price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "schedule_slot",
            "schedule_slot_detail",
            "status",
            "price",
            "notes",
            "payment",
            "payment_method",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["status", "price", "created_at", "updated_at"]

    def create(self, validated_data):
        payment_method = validated_data.pop("payment_method", Payment.PaymentMethod.CARD)
        user = self.context["request"].user
        booking_service = BookingService()
        try:
            booking = booking_service.create_booking(
                user=user,
                payment_method=payment_method,
                **validated_data,
            )
            return booking
        except DjangoValidationError as e:
            # Re-raise as DRF ValidationError to ensure proper JSON response
            error_message = str(e)
            if hasattr(e, 'messages') and isinstance(e.messages, (list, tuple)) and len(e.messages) > 0:
                error_message = str(e.messages[0])
            raise DRFValidationError({"detail": error_message})


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"
        read_only_fields = ["user", "created_at", "updated_at"]


class PublicGymHallSerializer(serializers.ModelSerializer):
    center = SportCenterSerializer(read_only=True)

    class Meta:
        model = GymHall
        fields = ["id", "name", "type", "capacity", "availability", "equipment", "center"]


class PublicSectionSerializer(serializers.ModelSerializer):
    hall_name = serializers.CharField(source="hall.name", read_only=True)
    center_name = serializers.CharField(source="hall.center.name", read_only=True)
    center_city = serializers.CharField(source="hall.center.city", read_only=True)
    trainers = TrainerSerializer(many=True, read_only=True)

    class Meta:
        model = Section
        fields = [
            "id",
            "sportType",
            "level",
            "ageCategory",
            "capacity",
            "base_price",
            "description",
            "hall_name",
            "center_name",
            "center_city",
            "trainers",
        ]


class PublicScheduleSlotSerializer(serializers.ModelSerializer):
    section = PublicSectionSerializer(read_only=True)
    hall = PublicGymHallSerializer(read_only=True)
    trainer = TrainerSerializer(read_only=True)
    price = serializers.DecimalField(source="section.base_price", max_digits=8, decimal_places=2, read_only=True)

    class Meta:
        model = ScheduleSlot
        fields = [
            "id",
            "section",
            "hall",
            "trainer",
            "start_time",
            "end_time",
            "available_spots",
            "price",
        ]


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={"input_type": "password"})
    date_of_birth = serializers.DateField(required=True)

    class Meta:
        model = User
        fields = (
            "username",
            "password",
            "email",
            "first_name",
            "last_name",
            "phone",
            "preferred_sports",
            "training_level",
            "date_of_birth",
        )

    def validate_email(self, value):
        """Check if email is already registered."""
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Користувач з таким email вже зареєстрований.")
        return value.lower()

    def validate_first_name(self, value):
        """Capitalize first name."""
        return value.strip().capitalize() if value else value

    def validate_last_name(self, value):
        """Capitalize last name."""
        return value.strip().capitalize() if value else value

    def create(self, validated_data):
        validated_data["password"] = make_password(validated_data.get("password"))
        return super().create(validated_data)


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile (excluding sensitive fields)."""

    class Meta:
        model = User
        fields = (
            "first_name",
            "last_name",
            "email",
            "phone",
            "date_of_birth",
            "preferred_sports",
            "training_level",
        )
        read_only_fields = ("email",)  # Email should not be changed via profile update

    def validate_first_name(self, value):
        """Capitalize first name."""
        return value.strip().capitalize() if value else value

    def validate_last_name(self, value):
        """Capitalize last name."""
        return value.strip().capitalize() if value else value

    def update(self, instance, validated_data):
        return super().update(instance, validated_data)

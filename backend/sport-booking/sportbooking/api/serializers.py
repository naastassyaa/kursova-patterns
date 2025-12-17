from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from datetime import datetime

from .models import (
    SportCenter,
    GymHall,
    Section,
    Trainer,
    ScheduleSlot,
    Subscription,
    UserMembership,
    Booking,
    Payment,
    Promotion,
    MembershipInvitation,
    LoyaltyAccount,
    Notification,
)

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["username"] = user.username
        return token


class CustomTokenObtainPairView:
    serializer_class = CustomTokenObtainPairSerializer


class SportCenterSerializer(serializers.ModelSerializer):
    class Meta:
        model = SportCenter
        fields = "__all__"


class GymHallSerializer(serializers.ModelSerializer):
    center = SportCenterSerializer(read_only=True)
    center_name = serializers.CharField(source="center.name", read_only=True)

    class Meta:
        model = GymHall
        fields = "__all__"


class TrainerSerializer(serializers.ModelSerializer):
    center_detail = SportCenterSerializer(source="center", read_only=True)

    class Meta:
        model = Trainer
        fields = "__all__"


class SectionSerializer(serializers.ModelSerializer):
    hall = GymHallSerializer(read_only=True)
    hall_name = serializers.CharField(source="hall.name", read_only=True)
    center_name = serializers.CharField(source="hall.center.name", read_only=True)
    center_city = serializers.CharField(source="hall.center.city", read_only=True)
    trainers = TrainerSerializer(many=True, read_only=True)
    hall_detail = GymHallSerializer(source="hall", read_only=True)
    center_detail = serializers.SerializerMethodField()

    def get_center_detail(self, obj):
        if obj.hall and obj.hall.center:
            return SportCenterSerializer(obj.hall.center).data
        return None

    class Meta:
        model = Section
        fields = "__all__"


class PublicSectionSerializer(serializers.ModelSerializer):
    hall_name = serializers.CharField(source="hall.name", read_only=True)
    center_name = serializers.CharField(source="hall.center.name", read_only=True)
    center_city = serializers.CharField(source="hall.center.city", read_only=True)
    trainers = TrainerSerializer(many=True, read_only=True)

    class Meta:
        model = Section
        fields = "__all__"


class PublicGymHallSerializer(serializers.ModelSerializer):
    center = SportCenterSerializer(read_only=True)

    class Meta:
        model = GymHall
        fields = "__all__"


class PublicScheduleSlotSerializer(serializers.ModelSerializer):
    section = PublicSectionSerializer(read_only=True)
    hall = PublicGymHallSerializer(read_only=True)
    trainer = TrainerSerializer(read_only=True)
    price = serializers.DecimalField(source="section.base_price", max_digits=8, decimal_places=2, read_only=True)
    final_price = serializers.SerializerMethodField()
    discount_amount = serializers.SerializerMethodField()
    discount_percentage = serializers.SerializerMethodField()
    promotion = serializers.SerializerMethodField()

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
            "final_price",
            "discount_amount",
            "discount_percentage",
            "promotion",
        ]

    def get_final_price(self, obj):
        try:
            request = self.context.get("request")
            if not request or not request.user or not request.user.is_authenticated:
                return None

            from decimal import Decimal, ROUND_HALF_UP
            base_price = Decimal(str(obj.section.base_price or 0))

            today = timezone.now().date()
            membership = UserMembership.objects.filter(
                user=request.user,
                status=UserMembership.MembershipStatus.ACTIVE,
                end_date__gte=today
            ).select_related('subscription').order_by('-end_date').first()

            if not membership:
                return None

            subscription_type = membership.subscription.type
            free_classes_map = {
                Subscription.SubscriptionType.MONTHLY: 8,
                Subscription.SubscriptionType.PREMIUM: 16,
                Subscription.SubscriptionType.CORPORATE: 0,
            }
            free_classes = free_classes_map.get(subscription_type, 0)

            if free_classes == 0:
                discount_map = {
                    Subscription.SubscriptionType.CORPORATE: Decimal("0.75"),
                }
                discount_multiplier = discount_map.get(subscription_type, Decimal("1.00"))
                final_price = (base_price * discount_multiplier).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                return float(final_price) if final_price < base_price else None

            current_month_start = today.replace(day=1)
            if today.month == 12:
                next_month_start = today.replace(year=today.year + 1, month=1, day=1)
            else:
                next_month_start = today.replace(month=today.month + 1, day=1)

            bookings_this_month = Booking.objects.filter(
                user=request.user,
                schedule_slot__start_time__gte=datetime.combine(current_month_start, datetime.min.time()),
                schedule_slot__start_time__lt=datetime.combine(next_month_start, datetime.min.time()),
                status__in=[Booking.BookingStatus.PENDING, Booking.BookingStatus.CONFIRMED],
            ).count()

            if bookings_this_month < free_classes:
                return 0.0

            discount_map = {
                Subscription.SubscriptionType.MONTHLY: Decimal("0.50"),
                Subscription.SubscriptionType.PREMIUM: Decimal("0.50"),
            }
            discount_multiplier = discount_map.get(subscription_type, Decimal("1.00"))
            final_price = (base_price * discount_multiplier).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            return float(final_price) if final_price < base_price else None
        except Exception:
            return None

    def get_discount_amount(self, obj):
        try:
            final_price = self.get_final_price(obj)
            if final_price is None:
                return None
            base_price = Decimal(str(obj.section.base_price or 0))
            discount = base_price - Decimal(str(final_price))
            return float(discount) if discount > 0 else None
        except Exception:
            return None

    def get_discount_percentage(self, obj):
        discount_amount = self.get_discount_amount(obj)
        if discount_amount is None or discount_amount == 0:
            return None
        from decimal import Decimal
        base_price = Decimal(str(obj.section.base_price or 0))
        return float((Decimal(str(discount_amount)) / base_price) * 100)

    def get_promotion(self, obj):
        return None


class PublicSubscriptionSerializer(serializers.ModelSerializer):
    final_price = serializers.SerializerMethodField()
    discount_amount = serializers.SerializerMethodField()
    discount_percentage = serializers.SerializerMethodField()
    promotion = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = [
            "id",
            "type",
            "price",
            "duration",
            "description",
            "perks",
            "final_price",
            "discount_amount",
            "discount_percentage",
            "promotion",
        ]

    def get_final_price(self, obj):
        try:
            request = self.context.get("request")
            if not request or not request.user or not request.user.is_authenticated:
                return None

            from .services.promotions import PromotionService
            promotion_service = PromotionService()
            base_price = Decimal(str(obj.price))
            final_price, _, _ = promotion_service.get_final_price(
                base_price=base_price,
                user=request.user,
                discount_type=Promotion.DiscountType.SUBSCRIPTION,
                subscription=obj,
            )

            if final_price < base_price:
                return float(final_price)
            return None
        except Exception:
            return None

    def get_discount_amount(self, obj):
        try:
            final_price = self.get_final_price(obj)
            if final_price is None:
                return None
            base_price = Decimal(str(obj.price))
            discount = base_price - Decimal(str(final_price))
            return float(discount) if discount > 0 else None
        except Exception:
            return None

    def get_discount_percentage(self, obj):
        try:
            discount_amount = self.get_discount_amount(obj)
            if discount_amount is None or discount_amount == 0:
                return None
            base_price = Decimal(str(obj.price))
            return float((Decimal(str(discount_amount)) / base_price) * 100)
        except Exception:
            return None

    def get_promotion(self, obj):
        try:
            request = self.context.get("request")
            if not request or not request.user or not request.user.is_authenticated:
                return None

            from .services.promotions import PromotionService
            promotion_service = PromotionService()
            base_price = Decimal(str(obj.price))
            _, _, promotion = promotion_service.get_final_price(
                base_price=base_price,
                user=request.user,
                discount_type=Promotion.DiscountType.SUBSCRIPTION,
                subscription=obj,
            )

            if promotion:
                return {
                    "id": promotion.id,
                    "title": promotion.title,
                    "description": promotion.description,
                }
            return None
        except Exception:
            return None


class MembershipInvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipInvitation
        fields = "__all__"


class UserMembershipSerializer(serializers.ModelSerializer):
    subscription_detail = PublicSubscriptionSerializer(source="subscription", read_only=True)
    owner_name = serializers.CharField(source="owner.username", read_only=True)
    is_corporate = serializers.ReadOnlyField()
    team_members = serializers.SerializerMethodField()
    invitations = MembershipInvitationSerializer(many=True, read_only=True)

    def get_team_members(self, obj):
        if obj.is_corporate and obj.owner:
            return UserMembershipSerializer(
                UserMembership.objects.filter(owner=obj.owner).exclude(id=obj.id),
                many=True,
            ).data
        return []

    class Meta:
        model = UserMembership
        fields = "__all__"


class PromotionSerializer(serializers.ModelSerializer):
    target_user_email = serializers.EmailField(source="target_user.email", read_only=True)
    target_subscription_type = serializers.CharField(source="target_subscription.type", read_only=True)
    target_center_name = serializers.CharField(source="target_center.name", read_only=True)
    target_section_name = serializers.CharField(source="target_section.sportType", read_only=True)
    is_valid = serializers.SerializerMethodField()

    def get_is_valid(self, obj):
        now = timezone.now()
        return obj.is_active and obj.start_date <= now <= obj.end_date

    class Meta:
        model = Promotion
        fields = "__all__"


class PublicPromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promotion
        fields = [
            "id",
            "title",
            "description",
            "scope",
            "discount_type",
            "discount_value_type",
            "discount_value",
            "start_date",
            "end_date",
            "target_section",
            "target_center",
            "target_age_category",
        ]


class BookingSerializer(serializers.ModelSerializer):
    schedule_slot = PublicScheduleSlotSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = "__all__"


class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for managing subscriptions in admin panel."""

    class Meta:
        model = Subscription
        fields = "__all__"


class ScheduleSlotSerializer(serializers.ModelSerializer):
    """Serializer for managing schedule slots in admin panel."""

    class Meta:
        model = ScheduleSlot
        fields = "__all__"


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for in-app notifications."""

    class Meta:
        model = Notification
        fields = "__all__"
        read_only_fields = ["user", "created_at", "updated_at"]


class LoyaltyAccountSerializer(serializers.ModelSerializer):
    """Serializer for loyalty accounts."""

    class Meta:
        model = LoyaltyAccount
        fields = "__all__"


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer used for user registration."""

    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for viewing and updating current user's profile."""

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone",
            "avatar",
            "training_level",
            "preferred_sports",
            "date_of_birth",
            "role",
        ]
        read_only_fields = ["id", "username", "role"]

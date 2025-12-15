from decimal import Decimal
from datetime import timedelta
import secrets

from django.db import models as django_models
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import (
    Booking,
    GymHall,
    LoyaltyAccount,
    MembershipInvitation,
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
from .permissions import IsAdminUser, IsOwnerOrAdmin
from .services.loyalty import LoyaltyService
from .services.notifications import NotificationService
from .services.payments import PaymentService
from .serializers import (
    BookingSerializer,
    CustomTokenObtainPairSerializer,
    GymHallSerializer,
    LoyaltyAccountSerializer,
    MembershipInvitationSerializer,
    NotificationSerializer,
    PublicGymHallSerializer,
    PublicScheduleSlotSerializer,
    PublicSectionSerializer,
    SectionSerializer,
    SportCenterSerializer,
    SubscriptionSerializer,
    TrainerSerializer,
    UserMembershipSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
    ScheduleSlotSerializer,
)


class UserRegistrationView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]


class CustomTokenObtainPairView(TokenObtainPairView):
    """Кастомний view для отримання JWT токенів з роллю користувача."""
    serializer_class = CustomTokenObtainPairSerializer


# --- Admin CRUD ---
class SportCenterAdminViewSet(viewsets.ModelViewSet):
    queryset = SportCenter.objects.all().order_by("name")
    serializer_class = SportCenterSerializer
    permission_classes = [IsAdminUser]


class GymHallAdminViewSet(viewsets.ModelViewSet):
    queryset = GymHall.objects.select_related("center").all().order_by("center__name", "name")
    serializer_class = GymHallSerializer
    permission_classes = [IsAdminUser]


class TrainerAdminViewSet(viewsets.ModelViewSet):
    queryset = Trainer.objects.select_related("center").all().order_by("last_name")
    serializer_class = TrainerSerializer
    permission_classes = [IsAdminUser]


class SectionAdminViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.select_related("hall", "hall__center").prefetch_related("trainers").all().order_by("sportType")
    serializer_class = SectionSerializer
    permission_classes = [IsAdminUser]


class SubscriptionAdminViewSet(viewsets.ModelViewSet):
    queryset = Subscription.objects.all().order_by("type")
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAdminUser]


class ScheduleSlotAdminViewSet(viewsets.ModelViewSet):
    queryset = ScheduleSlot.objects.select_related("section", "hall", "hall__center", "trainer").all().order_by("start_time")
    serializer_class = ScheduleSlotSerializer
    permission_classes = [IsAdminUser]


class MembershipAdminViewSet(viewsets.ModelViewSet):
    queryset = UserMembership.objects.select_related("user", "subscription")
    serializer_class = UserMembershipSerializer
    permission_classes = [IsAdminUser]


# --- Public Catalog Views ---
class PublicSportCenterViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SportCenter.objects.all().order_by("name")
    serializer_class = SportCenterSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["city"]


class PublicGymHallViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GymHall.objects.select_related("center").all().order_by("name")
    serializer_class = PublicGymHallSerializer
    permission_classes = [permissions.AllowAny]


class PublicSectionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Section.objects.select_related("hall__center").prefetch_related("trainers__center").all().order_by(
        "sportType")
    serializer_class = PublicSectionSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["sportType", "level", "ageCategory"]


class PublicScheduleSlotViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ScheduleSlot.objects.select_related("section", "hall", "trainer")
    serializer_class = PublicScheduleSlotSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["section__sportType", "hall__center__city", "hall", "trainer"]


class PublicSubscriptionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Subscription.objects.all().order_by("type")
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.AllowAny]


# --- User Features ---
class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        queryset = Booking.objects.select_related(
            "user",
            "schedule_slot",
            "schedule_slot__section",
            "schedule_slot__hall",
            "payment",
        )
        if self.request.user.role == User.Role.ADMIN:
            return queryset
        return queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        from .services.booking import BookingService
        from .services.loyalty import LoyaltyService

        service = BookingService()
        service.cancel_booking(booking)
        serializer = self.get_serializer(booking)
        return Response(serializer.data, status=status.HTTP_200_OK)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        queryset = Notification.objects.filter(user=self.request.user).order_by("-created_at")
        if self.request.user.role == User.Role.ADMIN:
            return Notification.objects.all().order_by("-created_at")
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read", "updated_at"])
        return Response({"status": "read"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], permission_classes=[IsAdminUser])
    def broadcast_promotion(self, request):
        """Admin-only endpoint to send promotion notifications to all users."""
        title = request.data.get("title")
        message = request.data.get("message")
        if not title or not message:
            return Response(
                {"error": "Title and message are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        users = User.objects.filter(is_active=True)
        NotificationService().send_promotion_notification(title, message, list(users))
        return Response(
            {"status": "success", "sent_to": users.count()},
            status=status.HTTP_201_CREATED,
        )


class MyMembershipViewSet(viewsets.ModelViewSet):
    serializer_class = UserMembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = UserMembership.objects.select_related("subscription", "user", "payment", "owner").prefetch_related("invitations")
        if self.request.user.role == User.Role.ADMIN:
            return queryset
        # Показуємо абонементи користувача + корпоративні абонементи, де він власник
        return queryset.filter(
            django_models.Q(user=self.request.user) | django_models.Q(owner=self.request.user)
        )

    def perform_create(self, serializer):
        start_date = serializer.validated_data.get("start_date")
        payment_method = serializer.validated_data.pop("payment_method", Payment.PaymentMethod.CARD)
        user = self.request.user

        # Check if user already has an active membership starting in the same month
        if start_date:
            start_month = start_date.replace(day=1)
            # Get first day of next month
            if start_month.month == 12:
                next_month = start_month.replace(year=start_month.year + 1, month=1)
            else:
                next_month = start_month.replace(month=start_month.month + 1)

            existing_memberships = UserMembership.objects.filter(
                user=user,
                start_date__gte=start_month,
                start_date__lt=next_month,
                status=UserMembership.MembershipStatus.ACTIVE,
            )

            if existing_memberships.exists():
                raise ValidationError(
                    {
                        "detail": "У вас вже є активний абонемент на цей місяць. Можна мати лише один абонемент на місяць."}
                )

        membership = serializer.save(user=user)
        
        # Для корпоративних абонементів встановлюємо owner
        if membership.subscription.type == Subscription.SubscriptionType.CORPORATE and not membership.owner:
            membership.owner = user
            membership.save(update_fields=["owner"])

        # Create payment for the membership
        if membership.subscription and membership.subscription.price:
            payment_service = PaymentService()
            payment_service.create_membership_payment(
                membership=membership,
                method=payment_method,
                amount=Decimal(membership.subscription.price)
            )
            # Accrue loyalty points
            LoyaltyService().accrue_points(
                user=user, amount=Decimal(membership.subscription.price)
            )
        NotificationService().send_membership_confirmation(membership)

    @action(detail=True, methods=["post"])
    def invite_user(self, request, pk=None):
        """Запросити користувача до корпоративного абонементу"""
        membership = self.get_object()
        
        if not membership.is_corporate:
            return Response(
                {"error": "Запрошення доступні тільки для корпоративних абонементів."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        if membership.owner != request.user:
            return Response(
                {"error": "Тільки власник абонементу може запрошувати користувачів."},
                status=status.HTTP_403_FORBIDDEN,
            )
        
        email = request.data.get("email")
        if not email:
            return Response(
                {"error": "Email обов'язковий."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Перевіряємо, чи не перевищено ліміт (5 користувачів для корпоративного)
        team_count = UserMembership.objects.filter(
            owner=membership.owner,
            subscription=membership.subscription,
            status=UserMembership.MembershipStatus.ACTIVE,
        ).count()
        
        if team_count >= 5:
            return Response(
                {"error": "Досягнуто максимальну кількість користувачів (5) для корпоративного абонементу."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Перевіряємо, чи не існує вже запрошення
        existing_invitation = MembershipInvitation.objects.filter(
            membership=membership,
            email=email,
            status=MembershipInvitation.InvitationStatus.PENDING,
        ).first()
        
        if existing_invitation:
            return Response(
                {"error": "Запрошення для цього email вже відправлено."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Створюємо запрошення
        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(days=7)
        
        invitation = MembershipInvitation.objects.create(
            membership=membership,
            email=email,
            invited_by=request.user,
            token=token,
            expires_at=expires_at,
        )
        
        # Відправляємо сповіщення
        NotificationService().send_invitation_notification(invitation)
        
        return Response(
            MembershipInvitationSerializer(invitation).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"])
    def accept_invitation(self, request):
        """Прийняти запрошення до корпоративного абонементу"""
        token = request.data.get("token")
        if not token:
            return Response(
                {"error": "Token обов'язковий."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try:
            invitation = MembershipInvitation.objects.get(
                token=token,
                status=MembershipInvitation.InvitationStatus.PENDING,
            )
        except MembershipInvitation.DoesNotExist:
            return Response(
                {"error": "Запрошення не знайдено або вже використано."},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        # Перевіряємо термін дії
        if invitation.expires_at < timezone.now():
            invitation.status = MembershipInvitation.InvitationStatus.EXPIRED
            invitation.save(update_fields=["status"])
            return Response(
                {"error": "Запрошення прострочено."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Перевіряємо, чи email співпадає
        if invitation.email.lower() != request.user.email.lower():
            return Response(
                {"error": "Це запрошення призначене для іншого користувача."},
                status=status.HTTP_403_FORBIDDEN,
            )
        
        # Перевіряємо ліміт
        team_count = UserMembership.objects.filter(
            owner=invitation.membership.owner,
            subscription=invitation.membership.subscription,
            status=UserMembership.MembershipStatus.ACTIVE,
        ).count()
        
        if team_count >= 5:
            return Response(
                {"error": "Досягнуто максимальну кількість користувачів (5) для корпоративного абонементу."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Створюємо абонемент для запрошеного користувача
        new_membership = UserMembership.objects.create(
            user=request.user,
            subscription=invitation.membership.subscription,
            start_date=invitation.membership.start_date,
            end_date=invitation.membership.end_date,
            owner=invitation.membership.owner,
            status=UserMembership.MembershipStatus.ACTIVE,
        )
        
        # Оновлюємо статус запрошення
        invitation.status = MembershipInvitation.InvitationStatus.ACCEPTED
        invitation.save(update_fields=["status"])
        
        # Відправляємо сповіщення
        NotificationService().send_membership_confirmation(new_membership)
        
        return Response(
            UserMembershipSerializer(new_membership).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"])
    def pending_invitations(self, request):
        """Отримати список запрошень, які очікують прийняття для поточного користувача"""
        invitations = MembershipInvitation.objects.filter(
            email=request.user.email,
            status=MembershipInvitation.InvitationStatus.PENDING,
            expires_at__gt=timezone.now(),
        ).select_related("membership", "membership__subscription", "invited_by")
        
        return Response(
            MembershipInvitationSerializer(invitations, many=True).data,
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        membership = self.get_object()
        # Refund payment if exists and was paid
        if hasattr(membership, "payment") and membership.payment:
            if membership.payment.status == Payment.PaymentStatus.PAID:
                membership.payment.status = Payment.PaymentStatus.REFUNDED
                membership.payment.save(update_fields=["status", "updated_at"])
        NotificationService().send_membership_cancellation(membership)
        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LoyaltyAccountViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LoyaltyAccountSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == User.Role.ADMIN:
            return LoyaltyAccount.objects.select_related("user", "tier")
        return LoyaltyAccount.objects.filter(user=self.request.user).select_related("tier")


class UserProfileViewSet(viewsets.GenericViewSet):
    """ViewSet for user profile management."""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def list(self, request, *args, **kwargs):
        """Return current user's profile."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        """Return current user's profile."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['get', 'patch', 'put'])
    def me(self, request):
        """Get or update current user's profile."""
        if request.method == 'GET':
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)
        else:
            # PATCH or PUT
            partial = request.method == 'PATCH'
            serializer = self.get_serializer(request.user, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        """Update user profile."""
        instance = self.get_object()
        partial = kwargs.pop('partial', False) or request.method == 'PATCH'
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        """Partially update user profile."""
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

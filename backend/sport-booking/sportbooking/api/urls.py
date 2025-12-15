from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    BookingViewSet,
    CustomTokenObtainPairView,
    GymHallAdminViewSet,
    LoyaltyAccountViewSet,
    MembershipAdminViewSet,
    MyMembershipViewSet,
    NotificationViewSet,
    PublicGymHallViewSet,
    PublicScheduleSlotViewSet,
    PublicSectionViewSet,
    PublicSportCenterViewSet,
    PublicSubscriptionViewSet,
    ScheduleSlotAdminViewSet,
    SectionAdminViewSet,
    SportCenterAdminViewSet,
    SubscriptionAdminViewSet,
    TrainerAdminViewSet,
    UserProfileViewSet,
    UserRegistrationView,
)

# Router for Admin endpoints
admin_router = DefaultRouter()
admin_router.register(r'centers', SportCenterAdminViewSet, basename='admin-center')
admin_router.register(r'halls', GymHallAdminViewSet, basename='admin-gymhall')
admin_router.register(r'trainers', TrainerAdminViewSet, basename='admin-trainer')
admin_router.register(r'sections', SectionAdminViewSet, basename='admin-section')
admin_router.register(r'schedules', ScheduleSlotAdminViewSet, basename='admin-schedule')
admin_router.register(r'subscriptions', SubscriptionAdminViewSet, basename='admin-subscription')
admin_router.register(r'memberships', MembershipAdminViewSet, basename='admin-membership')

# Router for Public Catalog endpoints
public_router = DefaultRouter()
public_router.register(r'centers', PublicSportCenterViewSet, basename='public-center')
public_router.register(r'halls', PublicGymHallViewSet, basename='public-gymhall')
public_router.register(r'sections', PublicSectionViewSet, basename='public-section')
public_router.register(r'schedules', PublicScheduleSlotViewSet, basename='public-schedule')
public_router.register(r'subscriptions', PublicSubscriptionViewSet, basename='public-subscription')

# Router for authenticated users
user_router = DefaultRouter()
user_router.register(r'bookings', BookingViewSet, basename='user-booking')
user_router.register(r'memberships', MyMembershipViewSet, basename='user-membership')
user_router.register(r'notifications', NotificationViewSet, basename='user-notification')
user_router.register(r'loyalty', LoyaltyAccountViewSet, basename='user-loyalty')
user_router.register(r'profile', UserProfileViewSet, basename='user-profile')

urlpatterns = [
    path('admin/', include(admin_router.urls)),
    path('catalog/', include(public_router.urls)),
    path('me/', include(user_router.urls)),
    path('auth/register/', UserRegistrationView.as_view(), name='user-register'),
    path('auth/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

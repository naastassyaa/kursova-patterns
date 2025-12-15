from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

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


class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_active')
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('role', 'phone', 'preferred_sports', 'training_level')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('role',)}),
    )


@admin.register(SportCenter)
class SportCenterAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'contact_phone')
    search_fields = ('name', 'city')


@admin.register(GymHall)
class GymHallAdmin(admin.ModelAdmin):
    list_display = ('name', 'center', 'type', 'capacity')
    list_filter = ('center__city', 'type')
    search_fields = ('name', 'center__name')


@admin.register(Trainer)
class TrainerAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'specialization', 'center')
    search_fields = ('first_name', 'last_name', 'specialization')
    list_filter = ('center__city',)


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ('sportType', 'level', 'hall', 'capacity', 'base_price')
    list_filter = ('sportType', 'level')
    search_fields = ('sportType', 'level', 'hall__name')


@admin.register(ScheduleSlot)
class ScheduleSlotAdmin(admin.ModelAdmin):
    list_display = ('section', 'hall', 'start_time', 'available_spots')
    list_filter = ('hall__center__city', 'section__sportType')
    autocomplete_fields = ('section', 'hall', 'trainer')


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('type', 'price', 'duration')


@admin.register(UserMembership)
class UserMembershipAdmin(admin.ModelAdmin):
    list_display = ('user', 'subscription', 'status', 'start_date', 'end_date')
    list_filter = ('status', 'subscription__type')


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('user', 'schedule_slot', 'status', 'price')
    list_filter = ('status', 'schedule_slot__section__sportType')
    search_fields = ('user__username',)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('booking', 'method', 'status', 'amount', 'paid_at')
    list_filter = ('method', 'status')


@admin.register(LoyaltyTier)
class LoyaltyTierAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'multiplier', 'priority')


@admin.register(LoyaltyAccount)
class LoyaltyAccountAdmin(admin.ModelAdmin):
    list_display = ('user', 'tier', 'points')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'type', 'is_read')
    list_filter = ('type', 'is_read')


admin.site.register(User, CustomUserAdmin)
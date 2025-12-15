from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict

from django.db import transaction

from ..models import LoyaltyAccount, LoyaltyTier, User


class LoyaltyService:
    """Application service that applies the loyalty strategy."""

    tier_thresholds = {
        LoyaltyTier.TierCode.STANDARD: 0,
        LoyaltyTier.TierCode.PREMIUM: 500,
        LoyaltyTier.TierCode.CORPORATE: 1000,
    }

    loyalty_steps: Dict[int, Decimal] = {
        0: Decimal("0.01"),
        500: Decimal("0.05"),
        1000: Decimal("0.07"),
        5000: Decimal("0.10"),
    }

    def _get_or_create_account(self, user: User) -> LoyaltyAccount:
        tier, _ = LoyaltyTier.objects.get_or_create(
            code=LoyaltyTier.TierCode.STANDARD,
            defaults={
                "name": "Standard",
                "multiplier": 1.0,
                "benefits": "Базові бонуси за кожне бронювання.",
                "priority": 1,
            },
        )
        account, _ = LoyaltyAccount.objects.get_or_create(user=user, defaults={"tier": tier})
        if account.tier is None:
            account.tier = tier
            account.save(update_fields=["tier", "updated_at"])
        return account

    def _current_multiplier(self, points: int) -> Decimal:
        applicable = Decimal("0.01")
        for threshold, multiplier in sorted(self.loyalty_steps.items()):
            if points >= threshold:
                applicable = multiplier
        return applicable

    def accrue_points(self, *, user: User, amount: Decimal) -> LoyaltyAccount:
        with transaction.atomic():
            account = self._get_or_create_account(user)
            multiplier = self._current_multiplier(account.points)
            calculated = (amount * multiplier).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
            points = max(1, int(calculated))
            account.points += points
            account.save(update_fields=["points", "updated_at"])
            self._maybe_upgrade_tier(account)
        return account

    def _maybe_upgrade_tier(self, account: LoyaltyAccount) -> None:
        """Automatic tier upgrades based on thresholds."""
        for tier_code, threshold in sorted(self.tier_thresholds.items(), key=lambda item: item[1]):
            if account.points >= threshold:
                tier, _ = LoyaltyTier.objects.get_or_create(
                    code=tier_code,
                    defaults={
                        "name": tier_code.title(),
                        "multiplier": strategy_multiplier_for(tier_code),
                        "benefits": "Автоматично створена перевага.",
                        "priority": tier_priority_for(tier_code),
                    },
                )
                account.tier = tier
        account.save(update_fields=["tier", "updated_at"])


def strategy_multiplier_for(code: str) -> Decimal:
    if code == LoyaltyTier.TierCode.CORPORATE:
        return Decimal("2.0")
    if code == LoyaltyTier.TierCode.PREMIUM:
        return Decimal("1.5")
    return Decimal("1.0")


def tier_priority_for(code: str) -> int:
    if code == LoyaltyTier.TierCode.CORPORATE:
        return 3
    if code == LoyaltyTier.TierCode.PREMIUM:
        return 2
    return 1


from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Optional

from django.utils import timezone

from ..models import Booking, Payment, UserMembership


class PaymentProcessor(ABC):
    """Abstract base class for payment processors (Factory Method pattern)."""
    method = Payment.PaymentMethod.CARD

    @abstractmethod
    def process(
        self,
        amount,
        booking: Optional[Booking] = None,
        membership: Optional[UserMembership] = None
    ) -> Payment:
        """Process payment for either a booking or membership."""
        ...


class CardProcessor(PaymentProcessor):
    """Processes card payments (instant confirmation)."""
    method = Payment.PaymentMethod.CARD

    def process(
        self,
        amount,
        booking: Optional[Booking] = None,
        membership: Optional[UserMembership] = None
    ) -> Payment:
        return Payment.objects.create(
            booking=booking,
            membership=membership,
            amount=amount,
            method=self.method,
            status=Payment.PaymentStatus.PAID,
            transaction_id=str(uuid.uuid4()),
            paid_at=timezone.now(),
        )


class WalletProcessor(CardProcessor):
    """Processes Google Pay payments."""
    method = Payment.PaymentMethod.GOOGLE_PAY


class ApplePayProcessor(CardProcessor):
    """Processes Apple Pay payments."""
    method = Payment.PaymentMethod.APPLE_PAY


class CashProcessor(PaymentProcessor):
    """Processes cash payments (pending until confirmed)."""
    method = Payment.PaymentMethod.CASH

    def process(
        self,
        amount,
        booking: Optional[Booking] = None,
        membership: Optional[UserMembership] = None
    ) -> Payment:
        return Payment.objects.create(
            booking=booking,
            membership=membership,
            amount=amount,
            method=self.method,
            status=Payment.PaymentStatus.PENDING,
        )


PROCESSORS = {
    Payment.PaymentMethod.CARD: CardProcessor,
    Payment.PaymentMethod.GOOGLE_PAY: WalletProcessor,
    Payment.PaymentMethod.APPLE_PAY: ApplePayProcessor,
    Payment.PaymentMethod.CASH: CashProcessor,
}


class PaymentService:
    """Factory Method pattern that instantiates proper processors."""

    def create_payment(
        self,
        *,
        method: str,
        amount,
        booking: Optional[Booking] = None,
        membership: Optional[UserMembership] = None
    ) -> Payment:
        """
        Create a payment for either a booking or a membership.
        
        Args:
            method: Payment method (CARD, APPLE_PAY, GOOGLE_PAY, CASH)
            amount: Payment amount
            booking: Optional Booking instance
            membership: Optional UserMembership instance
            
        Returns:
            Payment instance
            
        Raises:
            ValueError: If neither booking nor membership is provided
        """
        if booking is None and membership is None:
            raise ValueError("Payment must be associated with either a booking or membership")
        if booking is not None and membership is not None:
            raise ValueError("Payment cannot be associated with both booking and membership")
            
        processor_cls = PROCESSORS.get(method, CardProcessor)
        processor = processor_cls()
        return processor.process(amount, booking=booking, membership=membership)

    def create_booking_payment(self, *, booking: Booking, method: str, amount) -> Payment:
        """Convenience method for booking payments (backwards compatible)."""
        return self.create_payment(method=method, amount=amount, booking=booking)

    def create_membership_payment(self, *, membership: UserMembership, method: str, amount) -> Payment:
        """Convenience method for membership payments."""
        return self.create_payment(method=method, amount=amount, membership=membership)


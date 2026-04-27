"""Stripe platform-fee helpers.

Centralizes the destination-charge pattern so every paid-checkout flow
(plugin marketplace, beat store, film, podcast, live tickets, marketplace,
licensing, music distribution standalone, tips) routes funds correctly:

  90% to creator's connected Stripe account
  10% to StreamPireX platform

Used by SP-1.2 (payment-mode checkouts), SP-1.3 (subscription + tip flows).
"""
import os
from typing import Optional, Tuple, Dict, Any

# Single source of truth for platform fee percentage.
# Mirrors the value used historically in:
#   plugin_marketplace_routes.py, film_routes.py, beat_store_routes.py,
#   academy_routes.py
PLATFORM_CUT = 0.10  # 10% platform fee


def get_creator_destination(user_id) -> Optional[str]:
    """Look up a creator's Stripe Connect destination account ID.

    Reads from CreatorPaymentSettings, matching the pattern in
    plugin_marketplace_routes.py:374. Returns None if the creator has not
    completed Stripe Connect onboarding — caller MUST handle this case
    (typically: skip the destination charge and accept the payment to
    the platform, leaving manual reconciliation as a fallback).
    """
    if user_id is None:
        return None
    try:
        # Local import to avoid circular imports at module load.
        from api.models import CreatorPaymentSettings
        cps = CreatorPaymentSettings.query.filter_by(user_id=user_id).first()
        if cps is None:
            return None
        return getattr(cps, "stripe_account_id", None)
    except Exception:
        # Defensive: if the model lookup fails, do NOT silently skip the fee.
        # Re-raise so the calling route returns a 500 instead of charging
        # the platform 100% by accident.
        raise


def calculate_platform_split(price) -> Tuple[float, float]:
    """Return (platform_cut, creator_earnings) for a given price.

    Both values are rounded to 2 decimal places and sum to ``price`` within
    a cent. Use these for metadata and downstream accounting; Stripe itself
    only needs ``application_fee_amount`` in cents.
    """
    price_f = float(price)
    platform_cut = round(price_f * PLATFORM_CUT, 2)
    creator_earnings = round(price_f - platform_cut, 2)
    return platform_cut, creator_earnings


def build_destination_charge_kwargs(
    price,
    creator_destination: Optional[str],
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Build the ``payment_intent_data`` dict for a destination charge.

    Returns an empty dict when the creator has no connected Stripe account,
    so callers can splat unconditionally::

        kwargs = dict(payment_method_types=["card"], ...)
        kwargs.update(build_destination_charge_kwargs(price, dest, meta))
        stripe.checkout.Session.create(**kwargs)

    For ``mode="subscription"`` checkouts use
    :func:`build_subscription_fee_kwargs` instead — Stripe rejects
    ``payment_intent_data`` on subscription sessions.
    """
    if not creator_destination:
        return {}
    platform_cut, _ = calculate_platform_split(price)
    pid = {
        "application_fee_amount": int(round(platform_cut * 100)),
        "transfer_data": {"destination": creator_destination},
    }
    if metadata:
        pid["metadata"] = metadata
    return {"payment_intent_data": pid}


def build_subscription_fee_kwargs(
    creator_destination: Optional[str],
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Build the ``subscription_data`` dict for a subscription destination charge.

    Stripe subscription mode uses ``application_fee_percent`` (a percentage,
    not a cent amount) since each renewal invoice will have a different total.
    Returns empty dict when no creator destination is set.
    """
    if not creator_destination:
        return {}
    sub_data = {
        "application_fee_percent": PLATFORM_CUT * 100,  # 10.0
        "transfer_data": {"destination": creator_destination},
    }
    if metadata:
        sub_data["metadata"] = metadata
    return {"subscription_data": sub_data}


def build_payment_intent_destination_kwargs(
    price,
    creator_destination: Optional[str],
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Build top-level kwargs for ``stripe.PaymentIntent.create`` (used by tip flow).

    Unlike checkout.Session.create, PaymentIntent.create takes
    ``application_fee_amount`` and ``transfer_data`` as TOP-LEVEL kwargs,
    not nested inside ``payment_intent_data``.
    """
    if not creator_destination:
        return {}
    platform_cut, _ = calculate_platform_split(price)
    out = {
        "application_fee_amount": int(round(platform_cut * 100)),
        "transfer_data": {"destination": creator_destination},
    }
    if metadata:
        # PaymentIntent already takes metadata as top-level — merge here so
        # callers can safely drop both into kwargs without overwriting.
        out["metadata"] = metadata
    return out


def is_event_processed(event_id: str) -> bool:
    """Return True if a Stripe webhook event_id has already been recorded.

    Used by SP-1.3 webhook idempotency check at the top of the webhook
    handler. After successful processing, callers should call
    :func:`mark_event_processed` to record the id.
    """
    if not event_id:
        return False
    try:
        from api.models import ProcessedStripeEvent
        return ProcessedStripeEvent.query.get(event_id) is not None
    except Exception:
        # Defensive: if the lookup fails, treat as not-processed and let
        # the webhook handler proceed. Worst case: a duplicate row that
        # downstream uniqueness constraints will reject anyway.
        return False


def mark_event_processed(event_id: str, event_type: Optional[str] = None) -> bool:
    """Record that a Stripe webhook event has been processed.

    Call after the webhook handler has successfully committed all DB writes
    for this event. Returns True on insert, False if already present (which
    is fine — the dedup check at the top of the handler should have caught
    it, but races are possible).
    """
    if not event_id:
        return False
    try:
        from api.models import db, ProcessedStripeEvent
        existing = ProcessedStripeEvent.query.get(event_id)
        if existing is not None:
            return False
        rec = ProcessedStripeEvent(event_id=event_id, event_type=event_type)
        db.session.add(rec)
        db.session.commit()
        return True
    except Exception:
        # Don't let a logging-tier failure break the webhook response.
        try:
            from api.models import db
            db.session.rollback()
        except Exception:
            pass
        return False

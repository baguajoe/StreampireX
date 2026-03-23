import os
import stripe
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from api.extensions import db
from api.models import (
    User,
    Payout,
    Earnings,
    Revenue,
    CreatorPaymentSettings
)

# Optional imports — guarded so this file still loads if schema differs
try:
    from api.beat_store_models import BeatPurchase
except Exception:
    BeatPurchase = None

try:
    from api.plugin_marketplace_routes import PluginPurchase
except Exception:
    PluginPurchase = None

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

payout_bp = Blueprint("payouts", __name__)


def _frontend_url():
    return os.getenv("FRONTEND_URL", "http://localhost:3000")


def _get_or_create_payment_settings(user_id):
    cps = CreatorPaymentSettings.query.filter_by(user_id=user_id).first()
    if cps:
        return cps
    cps = CreatorPaymentSettings(user_id=user_id)
    db.session.add(cps)
    db.session.commit()
    return cps


def _sum_query(model, column_name, **filters):
    if not model:
        return 0.0
    col = getattr(model, column_name, None)
    if col is None:
        return 0.0
    q = db.session.query(db.func.coalesce(db.func.sum(col), 0))
    try:
        q = q.filter_by(**filters)
        val = q.scalar() or 0
        return float(val)
    except Exception:
        return 0.0


def _get_creator_total_earned(user_id):
    total = 0.0

    # Generic earnings tables if used in your app
    try:
        total += _sum_query(Earnings, "creator_earnings", user_id=user_id)
    except Exception:
        pass

    try:
        total += _sum_query(Revenue, "creator_earnings", user_id=user_id)
    except Exception:
        pass

    # Beat store
    if BeatPurchase:
        total += _sum_query(BeatPurchase, "producer_earnings", producer_id=user_id)

    # Plugin marketplace
    if PluginPurchase:
        total += _sum_query(PluginPurchase, "creator_earnings", creator_id=user_id, status="paid")

    return round(float(total), 2)


@payout_bp.route("/api/payouts/status", methods=["GET"])
@jwt_required()
def payout_status():
    user_id = get_jwt_identity()
    cps = _get_or_create_payment_settings(user_id)

    return jsonify({
        "stripe_account_id": getattr(cps, "stripe_account_id", None),
        "charges_enabled": bool(getattr(cps, "charges_enabled", False)),
        "payouts_enabled": bool(getattr(cps, "payouts_enabled", False)),
        "details_submitted": bool(getattr(cps, "details_submitted", False)),
    }), 200


@payout_bp.route("/api/payouts/connect", methods=["POST"])
@jwt_required()
def connect_payouts():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    cps = _get_or_create_payment_settings(user_id)

    acct_id = getattr(cps, "stripe_account_id", None)
    if not acct_id:
        acct = stripe.Account.create(
            type="express",
            country="US",
            email=getattr(user, "email", None),
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
            business_type="individual",
            metadata={"user_id": str(user_id), "platform": "StreamPireX"}
        )
        acct_id = acct["id"]
        cps.stripe_account_id = acct_id
        db.session.commit()

    account_link = stripe.AccountLink.create(
        account=acct_id,
        refresh_url=f"{_frontend_url()}/payout-dashboard?reconnect=1",
        return_url=f"{_frontend_url()}/payout-dashboard?connected=1",
        type="account_onboarding"
    )

    return jsonify({
        "onboarding_url": account_link.url,
        "stripe_account_id": acct_id
    }), 200


@payout_bp.route("/api/payouts/refresh-status", methods=["POST"])
@jwt_required()
def refresh_payout_status():
    user_id = get_jwt_identity()
    cps = _get_or_create_payment_settings(user_id)

    acct_id = getattr(cps, "stripe_account_id", None)
    if not acct_id:
        return jsonify({"error": "No connected Stripe account"}), 400

    acct = stripe.Account.retrieve(acct_id)

    cps.charges_enabled = bool(acct.get("charges_enabled", False))
    cps.payouts_enabled = bool(acct.get("payouts_enabled", False))
    cps.details_submitted = bool(acct.get("details_submitted", False))
    db.session.commit()

    return jsonify({
        "stripe_account_id": acct_id,
        "charges_enabled": cps.charges_enabled,
        "payouts_enabled": cps.payouts_enabled,
        "details_submitted": cps.details_submitted,
    }), 200


@payout_bp.route("/api/payouts/balance", methods=["GET"])
@jwt_required()
def payouts_balance():
    user_id = get_jwt_identity()
    total_earned = _get_creator_total_earned(user_id)

    total_paid_out = _sum_query(Payout, "amount", user_id=user_id, status="paid")
    pending_payouts = _sum_query(Payout, "amount", user_id=user_id, status="pending")

    available = max(0.0, round(total_earned - total_paid_out - pending_payouts, 2))

    cps = _get_or_create_payment_settings(user_id)

    stripe_status = "not_connected"
    if getattr(cps, "stripe_account_id", None):
        if getattr(cps, "payouts_enabled", False):
            stripe_status = "verified"
        elif getattr(cps, "details_submitted", False):
            stripe_status = "pending"
        else:
            stripe_status = "restricted"

    return jsonify({
        "available_balance": available,
        "pending_balance": round(pending_payouts, 2),
        "total_earned": round(total_earned, 2),
        "total_paid_out": round(total_paid_out, 2),
        "stripe_status": stripe_status,
        "stripe_account_id": getattr(cps, "stripe_account_id", None),
        "charges_enabled": bool(getattr(cps, "charges_enabled", False)),
        "payouts_enabled": bool(getattr(cps, "payouts_enabled", False)),
        "details_submitted": bool(getattr(cps, "details_submitted", False)),
        "sources": {
            "beats_enabled": BeatPurchase is not None,
            "plugins_enabled": PluginPurchase is not None
        }
    }), 200


@payout_bp.route("/api/payouts/request", methods=["POST"])
@jwt_required()
def request_payout():
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    amount = float(data.get("amount") or 0)
    payout_type = data.get("payout_type", "standard")

    if amount < 25:
        return jsonify({"error": "Minimum payout is $25"}), 400

    cps = _get_or_create_payment_settings(user_id)
    if not getattr(cps, "stripe_account_id", None):
        return jsonify({"error": "Stripe Connect not set up"}), 400

    if not getattr(cps, "payouts_enabled", False):
        return jsonify({"error": "Stripe account is not payout-enabled yet"}), 400

    total_earned = _get_creator_total_earned(user_id)
    total_paid_out = _sum_query(Payout, "amount", user_id=user_id, status="paid")
    pending_payouts = _sum_query(Payout, "amount", user_id=user_id, status="pending")
    available = max(0.0, round(total_earned - total_paid_out - pending_payouts, 2))

    if amount > available:
        return jsonify({"error": "Amount exceeds available balance"}), 400

    fee = round(amount * 0.01, 2) if payout_type == "instant" else 0.0
    cents = int(round((amount - fee) * 100))

    payout_obj = stripe.Payout.create(
        amount=cents,
        currency="usd",
        method="instant" if payout_type == "instant" else "standard",
        stripe_account=cps.stripe_account_id,
        metadata={"user_id": str(user_id), "payout_type": payout_type}
    )

    payout = Payout(
        user_id=user_id,
        amount=amount,
        payout_type=payout_type,
        status="pending",
        stripe_payout_id=payout_obj["id"],
        fee=fee,
        created_at=datetime.utcnow()
    )
    db.session.add(payout)
    db.session.commit()

    return jsonify({
        "message": "Payout initiated",
        "payout_id": payout.id,
        "stripe_payout_id": payout.stripe_payout_id,
        "fee": fee
    }), 201


@payout_bp.route("/api/payouts/history", methods=["GET"])
@jwt_required()
def payout_history():
    user_id = get_jwt_identity()
    payouts = Payout.query.filter_by(user_id=user_id).order_by(Payout.created_at.desc()).limit(100).all()

    return jsonify([{
        "id": p.id,
        "amount": float(getattr(p, "amount", 0) or 0),
        "payout_type": getattr(p, "payout_type", "standard"),
        "status": getattr(p, "status", "pending"),
        "stripe_payout_id": getattr(p, "stripe_payout_id", None),
        "fee": float(getattr(p, "fee", 0) or 0),
        "created_at": p.created_at.isoformat() if getattr(p, "created_at", None) else None,
    } for p in payouts]), 200

"""MC-1 + MC-2 (Marketplace Consolidation, Path B): Storefront checkout, orders,
and creator-facing status transitions.

Endpoints (all under /api/storefront):
  POST  /checkout                     - Create Stripe checkout session for a Product
  GET   /orders/<id>                  - Buyer / creator / admin can read
  GET   /orders/me                    - Paginated list of buyer's own orders
  PATCH /orders/<id>/ship             - Creator marks shipped (requires tracking)
  PATCH /orders/<id>/deliver          - Creator marks delivered
  PATCH /orders/<id>/cancel           - Creator OR buyer cancels (refunds if paid)
  POST  /orders/<id>/refund           - Creator OR admin refunds via Stripe

Stripe flow:
  - On /checkout: create StorefrontOrder(status='pending'), then a
    stripe.checkout.Session via build_destination_charge_kwargs (90/10 split).
  - Webhook checkout.session.completed flips status 'pending' -> 'paid';
    digital_download orders auto-advance to 'delivered' and notify the buyer.
  - Refunds use reverse_transfer=True + refund_application_fee=True so the
    creator's 90% is clawed back from their Connect account and the platform's
    10% is also refunded. Without these, refunds leak money.

Status machine (server-gated; client never trusted):
  pending -> paid (via webhook)
  pending -> cancelled (no Stripe call needed)
  paid    -> shipped (creator_ship only)
  paid    -> delivered (pickup only; digital auto-delivers in webhook)
  paid    -> cancelled (with full refund)
  paid    -> refunded
  shipped -> delivered (creator_ship)
  shipped -> refunded
  delivered -> refunded

Polymorphic over Product.product_type - does NOT touch Printful drop-ship
merch (that stays on MerchOrder + creator_products).
"""
import os
from decimal import Decimal
from datetime import datetime

import stripe
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from api.models import db, User, Product, StorefrontOrder
from api.stripe_helpers import (
    get_creator_destination,
    calculate_platform_split,
    build_destination_charge_kwargs,
)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

storefront_bp = Blueprint("storefront", __name__)

VALID_FULFILLMENT_TYPES = {"creator_ship", "digital_download", "pickup"}
WEBHOOK_METADATA_KIND = "storefront_order"


# =============================================================================
# Internal helpers
# =============================================================================

def _is_admin(user_id):
    """Mirror admin check pattern used elsewhere in the codebase."""
    user = User.query.get(user_id)
    return bool(user and getattr(user, "is_admin", False))


def _lock_order(order_id):
    """Load order with row-level lock to prevent race conditions on
    concurrent status transitions (e.g. creator double-clicks 'Mark Shipped').
    Returns None if not found."""
    return StorefrontOrder.query.with_for_update().get(order_id)


def _issue_stripe_refund(order, reason, amount=None):
    """Issue a Stripe refund for the order's payment_intent.

    CRITICAL: Uses reverse_transfer=True and refund_application_fee=True so
    the creator's 90% (in their Connect account) is clawed back AND the
    platform's 10% application_fee is refunded. Without these, refunds
    leak money - the buyer gets refunded but the creator keeps the cash.

    Returns (ok: bool, error_str: str | None, refund_id: str | None).
    Caller is responsible for status update + commit/rollback on failure.
    """
    if not order.stripe_payment_intent:
        return False, "Order has no payment_intent (was it ever paid?)", None

    try:
        kwargs = dict(
            payment_intent=order.stripe_payment_intent,
            reason="requested_by_customer",
            reverse_transfer=True,
            refund_application_fee=True,
        )
        if amount is not None:
            # amount is Decimal of dollars; Stripe wants int cents
            kwargs["amount"] = int(round(float(amount) * 100))

        refund = stripe.Refund.create(**kwargs)
        order.refund_id = refund.id
        order.refunded_at = datetime.utcnow()
        if reason:
            order.cancellation_reason = reason[:255]
        return True, None, refund.id
    except stripe.error.StripeError as e:
        current_app.logger.error(f"Stripe refund failed for order {order.id}: {e}")
        return False, str(e), None
    except Exception as e:
        current_app.logger.error(f"Refund unexpected error for order {order.id}: {e}")
        return False, str(e), None


# =============================================================================
# POST /api/storefront/checkout  (MC-1)
# =============================================================================

@storefront_bp.route("/api/storefront/checkout", methods=["POST"])
@jwt_required()
def storefront_checkout():
    """Create a Stripe Checkout Session for a Product.

    HARD RULES (server-side trust boundary):
      1. creator_id is ALWAYS derived from Product.creator_id, NEVER from
         request body.
      2. unit_price is ALWAYS snapshot from Product.price server-side.
      3. fulfillment_type validated against VALID_FULFILLMENT_TYPES.
         Shipping fields required iff fulfillment_type='creator_ship'.
    """
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    product_id = data.get("product_id")
    if not product_id:
        return jsonify({"error": "product_id is required"}), 400

    try:
        quantity = int(data.get("quantity", 1))
    except (TypeError, ValueError):
        return jsonify({"error": "quantity must be an integer"}), 400
    if quantity < 1:
        return jsonify({"error": "quantity must be >= 1"}), 400

    fulfillment_type = data.get("fulfillment_type")
    if fulfillment_type not in VALID_FULFILLMENT_TYPES:
        return jsonify({
            "error": "fulfillment_type must be one of: " + ", ".join(sorted(VALID_FULFILLMENT_TYPES))
        }), 400

    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404

    creator_id = product.creator_id
    unit_price = Decimal(str(product.price or 0))
    if unit_price <= 0:
        return jsonify({"error": "Product is not purchasable (price <= 0)"}), 400

    if fulfillment_type != "digital_download" and product.stock is not None:
        if product.stock < quantity:
            return jsonify({"error": "Insufficient stock"}), 409

    shipping = data.get("shipping") or {}
    shipping_fields = {}
    if fulfillment_type == "creator_ship":
        required = ["name", "address", "city", "state", "country", "zip"]
        missing = [k for k in required if not shipping.get(k)]
        if missing:
            return jsonify({"error": f"Missing shipping fields: {', '.join(missing)}"}), 400
        shipping_fields = {
            "shipping_name":    shipping.get("name"),
            "shipping_address": shipping.get("address"),
            "shipping_city":    shipping.get("city"),
            "shipping_state":   shipping.get("state"),
            "shipping_country": shipping.get("country"),
            "shipping_zip":     shipping.get("zip"),
        }

    subtotal = unit_price * quantity
    platform_cut, creator_earnings = calculate_platform_split(float(subtotal))

    order = StorefrontOrder(
        product_id=product.id,
        creator_id=creator_id,
        buyer_id=user_id,
        quantity=quantity,
        unit_price=unit_price,
        subtotal=subtotal,
        platform_fee=Decimal(str(platform_cut)),
        creator_earnings=Decimal(str(creator_earnings)),
        fulfillment_type=fulfillment_type,
        status="pending",
        pickup_notes=(data.get("pickup_notes") if fulfillment_type == "pickup" else None),
        notes_to_buyer=data.get("notes_to_buyer"),
        **shipping_fields,
    )
    db.session.add(order)
    db.session.flush()

    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")

    try:
        creator_destination = get_creator_destination(creator_id) if creator_id else None

        metadata = {
            "kind": WEBHOOK_METADATA_KIND,
            "storefront_order_id": str(order.id),
            "product_id": str(product.id),
            "creator_id": str(creator_id) if creator_id else "",
            "buyer_id": str(user_id),
            "platform_cut": str(platform_cut),
            "creator_earnings": str(creator_earnings),
        }

        product_image = getattr(product, "image_url", None)
        checkout_kwargs = dict(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": getattr(product, "title", f"Product {product.id}"),
                        "images": [product_image] if product_image else [],
                    },
                    "unit_amount": int(round(float(unit_price) * 100)),
                },
                "quantity": quantity,
            }],
            mode="payment",
            success_url=f"{frontend_url}/storefront/orders/{order.id}?status=success",
            cancel_url=f"{frontend_url}/storefront/orders/{order.id}?status=cancel",
            metadata=metadata,
        )
        checkout_kwargs.update(
            build_destination_charge_kwargs(float(subtotal), creator_destination, metadata)
        )

        session = stripe.checkout.Session.create(**checkout_kwargs)
        order.stripe_session_id = session.id
        db.session.commit()

        return jsonify({"checkout_url": session.url, "order_id": order.id}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Storefront checkout error: {str(e)}")
        return jsonify({"error": str(e)}), 500


# =============================================================================
# GET /api/storefront/orders/<id>  (MC-1)
# =============================================================================

@storefront_bp.route("/api/storefront/orders/<int:order_id>", methods=["GET"])
@jwt_required()
def get_storefront_order(order_id):
    """Read a single order. Auth-gated to buyer OR creator OR admin."""
    user_id = get_jwt_identity()
    order = StorefrontOrder.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    if not (order.buyer_id == user_id or order.creator_id == user_id or _is_admin(user_id)):
        return jsonify({"error": "Forbidden"}), 403

    return jsonify(order.serialize()), 200


# =============================================================================
# GET /api/storefront/orders/me  (MC-1)
# =============================================================================

@storefront_bp.route("/api/storefront/orders/me", methods=["GET"])
@jwt_required()
def list_my_storefront_orders():
    """Paginated list of buyer's orders. page (default 1), per_page (default 25, max 100)."""
    user_id = get_jwt_identity()

    try:
        page = max(1, int(request.args.get("page", 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        per_page = int(request.args.get("per_page", 25))
    except (TypeError, ValueError):
        per_page = 25
    per_page = max(1, min(per_page, 100))

    q = (StorefrontOrder.query
         .filter_by(buyer_id=user_id)
         .order_by(StorefrontOrder.created_at.desc()))

    pagination = q.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "orders": [o.serialize() for o in pagination.items],
        "page": pagination.page,
        "per_page": pagination.per_page,
        "total": pagination.total,
        "pages": pagination.pages,
    }), 200


# =============================================================================
# PATCH /api/storefront/orders/<id>/ship  (MC-2)
# =============================================================================

@storefront_bp.route("/api/storefront/orders/<int:order_id>/ship", methods=["PATCH"])
@jwt_required()
def ship_storefront_order(order_id):
    """Creator marks order shipped. Requires tracking_number + carrier.

    Allowed: status='paid' AND fulfillment_type='creator_ship'
    Rejects: digital_download (no shipping), pickup (no shipping)
    """
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    tracking_number = (data.get("tracking_number") or "").strip()
    carrier = (data.get("carrier") or "").strip()
    if not tracking_number or not carrier:
        return jsonify({"error": "tracking_number and carrier are required"}), 400

    order = _lock_order(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    if order.creator_id != user_id:
        return jsonify({"error": "Forbidden"}), 403

    if order.fulfillment_type != "creator_ship":
        return jsonify({
            "error": f"Cannot ship orders of type '{order.fulfillment_type}' "
                     f"(only creator_ship has a shipping leg)"
        }), 400

    if order.status != "paid":
        return jsonify({
            "error": f"Cannot ship from status '{order.status}' (must be 'paid')"
        }), 409

    order.status = "shipped"
    order.tracking_number = tracking_number[:100]
    order.carrier = carrier[:50]
    order.shipped_at = datetime.utcnow()
    if data.get("notes_to_buyer"):
        order.notes_to_buyer = data["notes_to_buyer"]

    db.session.commit()

    # Notify buyer (fail-soft)
    from api.notifications import notify
    notify(
        user_id=order.buyer_id,
        type="storefront_order_shipped",
        content=f"Your order #{order.id} has shipped via {carrier}. Tracking: {tracking_number}",
        from_user_id=order.creator_id,
        extra_data={"order_id": order.id, "tracking_number": tracking_number, "carrier": carrier},
    )

    return jsonify(order.serialize()), 200


# =============================================================================
# PATCH /api/storefront/orders/<id>/deliver  (MC-2)
# =============================================================================

@storefront_bp.route("/api/storefront/orders/<int:order_id>/deliver", methods=["PATCH"])
@jwt_required()
def deliver_storefront_order(order_id):
    """Creator marks order delivered.

    Allowed:
      - creator_ship: status='shipped' -> 'delivered'
      - pickup:       status='paid'    -> 'delivered' (in-person handoff)
    Rejects: digital_download (auto-delivers in webhook)
    """
    user_id = get_jwt_identity()

    order = _lock_order(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    if order.creator_id != user_id:
        return jsonify({"error": "Forbidden"}), 403

    if order.fulfillment_type == "digital_download":
        return jsonify({
            "error": "digital_download orders auto-deliver on payment; cannot manually deliver"
        }), 400

    valid_from_status = {
        "creator_ship": "shipped",
        "pickup": "paid",
    }
    expected = valid_from_status.get(order.fulfillment_type)
    if order.status != expected:
        return jsonify({
            "error": f"Cannot deliver {order.fulfillment_type} order from status "
                     f"'{order.status}' (must be '{expected}')"
        }), 409

    order.status = "delivered"
    order.delivered_at = datetime.utcnow()
    db.session.commit()

    from api.notifications import notify
    notify(
        user_id=order.buyer_id,
        type="storefront_order_delivered",
        content=f"Your order #{order.id} was marked delivered.",
        from_user_id=order.creator_id,
        extra_data={"order_id": order.id},
    )

    return jsonify(order.serialize()), 200


# =============================================================================
# PATCH /api/storefront/orders/<id>/cancel  (MC-2)
# =============================================================================

@storefront_bp.route("/api/storefront/orders/<int:order_id>/cancel", methods=["PATCH"])
@jwt_required()
def cancel_storefront_order(order_id):
    """Cancel an order. Creator OR buyer can cancel.

    Allowed: status IN ('pending', 'paid')
    If status='paid', also issues full Stripe refund (with reverse_transfer).
    Notifies the OTHER party.
    """
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    reason = (data.get("cancellation_reason") or "").strip()
    if not reason:
        return jsonify({"error": "cancellation_reason is required"}), 400
    if len(reason) > 255:
        return jsonify({"error": "cancellation_reason max 255 chars"}), 400

    order = _lock_order(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    if order.creator_id != user_id and order.buyer_id != user_id:
        return jsonify({"error": "Forbidden"}), 403

    if order.status not in ("pending", "paid"):
        return jsonify({
            "error": f"Cannot cancel from status '{order.status}' (must be 'pending' or 'paid')"
        }), 409

    # If paid, issue refund FIRST. Only flip status on Stripe success.
    if order.status == "paid":
        ok, err, refund_id = _issue_stripe_refund(order, reason)
        if not ok:
            db.session.rollback()
            return jsonify({"error": f"Refund failed: {err}"}), 502
        # _issue_stripe_refund already set refund_id, refunded_at, cancellation_reason

    order.status = "cancelled"
    order.cancellation_reason = reason  # ensure set even for pending cancels
    db.session.commit()

    # Notify the OTHER party
    canceller_is_buyer = (order.buyer_id == user_id)
    notify_target = order.creator_id if canceller_is_buyer else order.buyer_id

    from api.notifications import notify
    notify(
        user_id=notify_target,
        type="storefront_order_cancelled",
        content=f"Order #{order.id} was cancelled. Reason: {reason}",
        from_user_id=user_id,
        extra_data={"order_id": order.id, "reason": reason},
    )

    return jsonify(order.serialize()), 200


# =============================================================================
# POST /api/storefront/orders/<id>/refund  (MC-2)
# =============================================================================

@storefront_bp.route("/api/storefront/orders/<int:order_id>/refund", methods=["POST"])
@jwt_required()
def refund_storefront_order(order_id):
    """Refund an order. Creator OR admin only.

    Allowed: status IN ('paid', 'shipped', 'delivered')
    Body: cancellation_reason (required), amount (optional - partial refund)
    Partial refund: amount must be > 0 and <= order.subtotal.
    """
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    reason = (data.get("cancellation_reason") or "").strip()
    if not reason:
        return jsonify({"error": "cancellation_reason is required"}), 400
    if len(reason) > 255:
        return jsonify({"error": "cancellation_reason max 255 chars"}), 400

    order = _lock_order(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    if not (order.creator_id == user_id or _is_admin(user_id)):
        return jsonify({"error": "Forbidden"}), 403

    if order.status not in ("paid", "shipped", "delivered"):
        return jsonify({
            "error": f"Cannot refund from status '{order.status}' "
                     f"(must be paid/shipped/delivered)"
        }), 409

    # Validate optional partial-refund amount
    amount = None
    if "amount" in data and data["amount"] is not None:
        try:
            amount = Decimal(str(data["amount"]))
        except Exception:
            return jsonify({"error": "amount must be numeric"}), 400
        if amount <= 0:
            return jsonify({"error": "amount must be > 0"}), 400
        if amount > order.subtotal:
            return jsonify({
                "error": f"amount {amount} exceeds order subtotal {order.subtotal}"
            }), 400

    ok, err, refund_id = _issue_stripe_refund(order, reason, amount=amount)
    if not ok:
        db.session.rollback()
        return jsonify({"error": f"Refund failed: {err}"}), 502

    order.status = "refunded"
    db.session.commit()

    from api.notifications import notify
    refund_amount = float(amount) if amount else float(order.subtotal)
    notify(
        user_id=order.buyer_id,
        type="storefront_order_refunded",
        content=f"Order #{order.id} was refunded (${refund_amount:.2f}).",
        from_user_id=user_id,
        extra_data={
            "order_id": order.id,
            "refund_id": refund_id,
            "amount": refund_amount,
            "reason": reason,
        },
    )

    return jsonify(order.serialize()), 200


# =============================================================================
# Stripe webhook hook (called from main webhook handler in routes.py)  (MC-1)
# =============================================================================

def handle_storefront_checkout_completed(session) -> bool:
    """Called from /api/webhooks/stripe when checkout.session.completed
    arrives with metadata.kind == 'storefront_order'. Idempotent."""
    if not session:
        return False

    metadata = session.get("metadata") or {}
    order_id_str = metadata.get("storefront_order_id")
    session_id = session.get("id")
    payment_intent = session.get("payment_intent")

    order = None
    try:
        if order_id_str:
            order = StorefrontOrder.query.get(int(order_id_str))
    except (TypeError, ValueError):
        order = None
    if not order and session_id:
        order = StorefrontOrder.query.filter_by(stripe_session_id=session_id).first()
    if not order:
        return False

    if order.status != "pending":
        return False

    order.status = "paid"
    if payment_intent and not order.stripe_payment_intent:
        order.stripe_payment_intent = payment_intent

    is_digital_autodeliver = False
    if order.fulfillment_type == "digital_download":
        order.status = "delivered"
        order.delivered_at = datetime.utcnow()
        is_digital_autodeliver = True

    # MC-2: notify buyer when digital_download auto-delivers
    if is_digital_autodeliver:
        try:
            from api.notifications import notify
            notify(
                user_id=order.buyer_id,
                type="storefront_order_delivered",
                content=f"Your order #{order.id} is ready.",
                from_user_id=order.creator_id,
                extra_data={"order_id": order.id, "auto_delivered": True},
            )
        except Exception:
            # notify() is fail-soft, but belt-and-suspenders
            pass

    return True

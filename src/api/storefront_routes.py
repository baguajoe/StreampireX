"""MC-1 (Marketplace Consolidation, Path B): Storefront checkout + orders.

Endpoints (all under /api/storefront):
  POST /checkout                 - Create Stripe checkout session for a Product
  GET  /orders/<id>              - Buyer / creator / admin can read
  GET  /orders/me                - Paginated list of buyer's own orders

Stripe flow:
  - On /checkout: create StorefrontOrder(status='pending'), then a
    stripe.checkout.Session via build_destination_charge_kwargs (90/10
    split routes 90% to creator's Connect account, 10% to platform).
  - On webhook checkout.session.completed (dispatched from routes.py
    /api/webhooks/stripe via metadata.kind == 'storefront_order'):
    handle_storefront_checkout_completed() flips status to 'paid' and
    captures stripe_payment_intent. Idempotent.

Mirrors SP-8 tournament webhook pattern.
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


@storefront_bp.route("/api/storefront/orders/<int:order_id>", methods=["GET"])
@jwt_required()
def get_storefront_order(order_id):
    """Read a single order. Auth-gated to buyer OR creator OR admin."""
    user_id = get_jwt_identity()
    order = StorefrontOrder.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    user = User.query.get(user_id)
    is_admin = bool(user and getattr(user, "is_admin", False))
    if not (order.buyer_id == user_id or order.creator_id == user_id or is_admin):
        return jsonify({"error": "Forbidden"}), 403

    return jsonify(order.serialize()), 200


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

    if order.fulfillment_type == "digital_download":
        order.status = "delivered"
        order.delivered_at = datetime.utcnow()

    return True

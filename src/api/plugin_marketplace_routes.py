import os
import stripe
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_

from api.extensions import db
from api.models import User, CreatorPaymentSettings, Revenue

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

plugin_marketplace_bp = Blueprint("plugin_marketplace", __name__)
PLATFORM_CUT = 0.10


# ------------------------------------------------------------------
# MODELS
# ------------------------------------------------------------------
class Plugin(db.Model):
    __tablename__ = "plugins"

    id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)

    name = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(255), nullable=True, unique=True)

    description = db.Column(db.Text, nullable=True)
    short_description = db.Column(db.String(500), nullable=True)

    plugin_type = db.Column(db.String(50), nullable=False, default="audio")   # audio | video
    category = db.Column(db.String(100), nullable=True)
    format_type = db.Column(db.String(100), nullable=True)                    # VST3, AU, AAX, AE, Premiere, Resolve...
    version = db.Column(db.String(50), nullable=True)

    os_support = db.Column(db.String(255), nullable=True)                     # Windows, macOS, etc.
    host_support = db.Column(db.String(255), nullable=True)                   # Ableton, FL, Premiere, Resolve...
    tags = db.Column(db.String(500), nullable=True)

    price = db.Column(db.Float, nullable=False, default=0.0)
    sale_price = db.Column(db.Float, nullable=True)

    cover_image_url = db.Column(db.String(1000), nullable=True)
    preview_url = db.Column(db.String(1000), nullable=True)
    file_url = db.Column(db.String(1000), nullable=True)
    demo_video_url = db.Column(db.String(1000), nullable=True)
    thumbnail_url = db.Column(db.String(1000), nullable=True)

    is_active = db.Column(db.Boolean, default=True)
    is_featured = db.Column(db.Boolean, default=False)
    is_free = db.Column(db.Boolean, default=False)

    download_count = db.Column(db.Integer, default=0)
    purchase_count = db.Column(db.Integer, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator = db.relationship("User", foreign_keys=[creator_id], backref="plugins")

    def serialize(self):
        effective_price = self.sale_price if self.sale_price is not None else self.price
        return {
            "id": self.id,
            "creator_id": self.creator_id,
            "creator_name": getattr(self.creator, "display_name", None) or getattr(self.creator, "username", None),
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "short_description": self.short_description,
            "plugin_type": self.plugin_type,
            "category": self.category,
            "format_type": self.format_type,
            "version": self.version,
            "os_support": self.os_support,
            "host_support": self.host_support,
            "tags": self.tags.split(",") if self.tags else [],
            "price": float(self.price or 0),
            "sale_price": float(self.sale_price) if self.sale_price is not None else None,
            "effective_price": float(effective_price or 0),
            "cover_image_url": self.cover_image_url,
            "preview_url": self.preview_url,
            "file_url": self.file_url,
            "demo_video_url": self.demo_video_url,
            "thumbnail_url": self.thumbnail_url,
            "is_active": self.is_active,
            "is_featured": self.is_featured,
            "is_free": self.is_free,
            "download_count": self.download_count,
            "purchase_count": self.purchase_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class PluginPurchase(db.Model):
    __tablename__ = "plugin_purchases"

    id = db.Column(db.Integer, primary_key=True)
    plugin_id = db.Column(db.Integer, db.ForeignKey("plugins.id"), nullable=False, index=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    creator_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)

    price_paid = db.Column(db.Float, nullable=False, default=0.0)
    platform_cut = db.Column(db.Float, nullable=False, default=0.10)
    creator_earnings = db.Column(db.Float, nullable=False, default=0.0)

    status = db.Column(db.String(50), nullable=False, default="pending")      # pending | paid | failed
    stripe_session_id = db.Column(db.String(255), nullable=True, index=True)
    stripe_payment_intent_id = db.Column(db.String(255), nullable=True)
    download_token = db.Column(db.String(255), nullable=True)

    purchased_at = db.Column(db.DateTime, default=datetime.utcnow)

    plugin = db.relationship("Plugin", backref="purchases", foreign_keys=[plugin_id])
    buyer = db.relationship("User", foreign_keys=[buyer_id])
    creator = db.relationship("User", foreign_keys=[creator_id])

    def serialize(self):
        return {
            "id": self.id,
            "plugin_id": self.plugin_id,
            "buyer_id": self.buyer_id,
            "creator_id": self.creator_id,
            "price_paid": float(self.price_paid or 0),
            "platform_cut": float(self.platform_cut or 0),
            "creator_earnings": float(self.creator_earnings or 0),
            "status": self.status,
            "stripe_session_id": self.stripe_session_id,
            "stripe_payment_intent_id": self.stripe_payment_intent_id,
            "download_token": self.download_token,
            "purchased_at": self.purchased_at.isoformat() if self.purchased_at else None,
            "plugin": self.plugin.serialize() if self.plugin else None,
        }


def _slugify(value):
    value = (value or "").strip().lower()
    out = []
    for ch in value:
        if ch.isalnum():
            out.append(ch)
        elif ch in (" ", "-", "_"):
            out.append("-")
    slug = "".join(out)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")[:250] or f"plugin-{int(datetime.utcnow().timestamp())}"


def _effective_price(plugin):
    if plugin.is_free:
        return 0.0
    return float(plugin.sale_price if plugin.sale_price is not None else plugin.price or 0.0)


def _get_or_create_payment_settings(user_id):
    cps = CreatorPaymentSettings.query.filter_by(user_id=user_id).first()
    if cps:
        return cps

    cps = CreatorPaymentSettings(user_id=user_id)
    db.session.add(cps)
    db.session.commit()
    return cps


# ------------------------------------------------------------------
# CRUD
# ------------------------------------------------------------------
@plugin_marketplace_bp.route("/api/plugins", methods=["GET"])
def list_plugins():
    q = Plugin.query.filter_by(is_active=True)

    plugin_type = request.args.get("plugin_type")
    category = request.args.get("category")
    format_type = request.args.get("format_type")
    creator_id = request.args.get("creator_id")
    search = request.args.get("search", "").strip()
    sort = request.args.get("sort", "newest")

    if plugin_type:
        q = q.filter(Plugin.plugin_type == plugin_type)

    if category:
        q = q.filter(Plugin.category == category)

    if format_type:
        q = q.filter(Plugin.format_type == format_type)

    if creator_id:
        q = q.filter(Plugin.creator_id == int(creator_id))

    if search:
        like = f"%{search}%"
        q = q.filter(
            or_(
                Plugin.name.ilike(like),
                Plugin.description.ilike(like),
                Plugin.short_description.ilike(like),
                Plugin.category.ilike(like),
                Plugin.format_type.ilike(like),
                Plugin.tags.ilike(like),
            )
        )

    if sort == "price_asc":
        q = q.order_by(Plugin.sale_price.asc().nullslast(), Plugin.price.asc())
    elif sort == "price_desc":
        q = q.order_by(Plugin.sale_price.desc().nullslast(), Plugin.price.desc())
    elif sort == "popular":
        q = q.order_by(Plugin.purchase_count.desc(), Plugin.created_at.desc())
    elif sort == "featured":
        q = q.order_by(Plugin.is_featured.desc(), Plugin.created_at.desc())
    else:
        q = q.order_by(Plugin.created_at.desc())

    items = q.limit(200).all()
    return jsonify([p.serialize() for p in items]), 200


@plugin_marketplace_bp.route("/api/plugins/<int:plugin_id>", methods=["GET"])
def get_plugin(plugin_id):
    plugin = Plugin.query.get_or_404(plugin_id)
    return jsonify(plugin.serialize()), 200


@plugin_marketplace_bp.route("/api/plugins/categories", methods=["GET"])
def get_plugin_categories():
    rows = db.session.query(Plugin.category).filter(
        Plugin.category.isnot(None),
        Plugin.category != "",
        Plugin.is_active == True
    ).distinct().all()
    return jsonify(sorted([r[0] for r in rows if r[0]])), 200


@plugin_marketplace_bp.route("/api/plugins/formats", methods=["GET"])
def get_plugin_formats():
    rows = db.session.query(Plugin.format_type).filter(
        Plugin.format_type.isnot(None),
        Plugin.format_type != "",
        Plugin.is_active == True
    ).distinct().all()
    return jsonify(sorted([r[0] for r in rows if r[0]])), 200


@plugin_marketplace_bp.route("/api/plugins", methods=["POST"])
@jwt_required()
def create_plugin():
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    plugin = Plugin(
        creator_id=user_id,
        name=data.get("name", "").strip(),
        slug=_slugify(data.get("slug") or data.get("name")),
        description=data.get("description"),
        short_description=data.get("short_description"),
        plugin_type=data.get("plugin_type", "audio"),
        category=data.get("category"),
        format_type=data.get("format_type"),
        version=data.get("version"),
        os_support=data.get("os_support"),
        host_support=data.get("host_support"),
        tags=",".join(data.get("tags", [])) if isinstance(data.get("tags"), list) else data.get("tags"),
        price=float(data.get("price", 0) or 0),
        sale_price=float(data.get("sale_price")) if data.get("sale_price") not in (None, "", "null") else None,
        cover_image_url=data.get("cover_image_url"),
        preview_url=data.get("preview_url"),
        file_url=data.get("file_url"),
        demo_video_url=data.get("demo_video_url"),
        thumbnail_url=data.get("thumbnail_url"),
        is_active=bool(data.get("is_active", True)),
        is_featured=bool(data.get("is_featured", False)),
        is_free=bool(data.get("is_free", False)),
    )

    if not plugin.name:
        return jsonify({"error": "Plugin name is required"}), 400

    db.session.add(plugin)
    db.session.commit()
    return jsonify(plugin.serialize()), 201


@plugin_marketplace_bp.route("/api/plugins/<int:plugin_id>", methods=["PUT"])
@jwt_required()
def update_plugin(plugin_id):
    user_id = get_jwt_identity()
    plugin = Plugin.query.get_or_404(plugin_id)

    if plugin.creator_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json() or {}

    fields = [
        "name", "description", "short_description", "plugin_type", "category",
        "format_type", "version", "os_support", "host_support", "cover_image_url",
        "preview_url", "file_url", "demo_video_url", "thumbnail_url"
    ]
    for field in fields:
        if field in data:
            setattr(plugin, field, data.get(field))

    if "slug" in data or "name" in data:
        plugin.slug = _slugify(data.get("slug") or plugin.name)

    if "tags" in data:
        plugin.tags = ",".join(data["tags"]) if isinstance(data["tags"], list) else data["tags"]

    if "price" in data:
        plugin.price = float(data.get("price") or 0)

    if "sale_price" in data:
        plugin.sale_price = float(data.get("sale_price")) if data.get("sale_price") not in (None, "", "null") else None

    if "is_active" in data:
        plugin.is_active = bool(data.get("is_active"))

    if "is_featured" in data:
        plugin.is_featured = bool(data.get("is_featured"))

    if "is_free" in data:
        plugin.is_free = bool(data.get("is_free"))

    plugin.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(plugin.serialize()), 200


@plugin_marketplace_bp.route("/api/plugins/<int:plugin_id>", methods=["DELETE"])
@jwt_required()
def delete_plugin(plugin_id):
    user_id = get_jwt_identity()
    plugin = Plugin.query.get_or_404(plugin_id)

    if plugin.creator_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    plugin.is_active = False
    plugin.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Plugin archived"}), 200


@plugin_marketplace_bp.route("/api/plugins/my-plugins", methods=["GET"])
@jwt_required()
def my_plugins():
    user_id = get_jwt_identity()
    items = Plugin.query.filter_by(creator_id=user_id).order_by(Plugin.created_at.desc()).all()
    return jsonify([p.serialize() for p in items]), 200


# ------------------------------------------------------------------
# CHECKOUT + PURCHASES
# ------------------------------------------------------------------
@plugin_marketplace_bp.route("/api/plugins/<int:plugin_id>/checkout", methods=["POST"])
@jwt_required()
def plugin_checkout(plugin_id):
    user_id = get_jwt_identity()
    plugin = Plugin.query.get_or_404(plugin_id)

    if plugin.creator_id == user_id:
        return jsonify({"error": "You cannot buy your own plugin"}), 400

    price = _effective_price(plugin)
    if price <= 0:
        return jsonify({"error": "This plugin is free. Use direct download flow."}), 400

    payment_settings = _get_or_create_payment_settings(plugin.creator_id)
    creator_destination = getattr(payment_settings, "stripe_account_id", None)

    platform_cut = round(price * PLATFORM_CUT, 2)
    creator_earnings = round(price - platform_cut, 2)

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

    purchase = PluginPurchase(
        plugin_id=plugin.id,
        buyer_id=user_id,
        creator_id=plugin.creator_id,
        price_paid=price,
        platform_cut=platform_cut,
        creator_earnings=creator_earnings,
        status="pending",
    )
    db.session.add(purchase)
    db.session.commit()

    line_item = {
        "price_data": {
            "currency": "usd",
            "product_data": {
                "name": plugin.name,
                "description": plugin.short_description or plugin.description or f"{plugin.plugin_type.title()} plugin on StreamPireX"
            },
            "unit_amount": int(round(price * 100)),
        },
        "quantity": 1,
    }

    metadata = {
        "purchase_type": "plugin",
        "plugin_id": str(plugin.id),
        "plugin_purchase_id": str(purchase.id),
        "buyer_id": str(user_id),
        "creator_id": str(plugin.creator_id),
        "platform_cut": str(platform_cut),
        "creator_earnings": str(creator_earnings),
    }

    checkout_kwargs = dict(
        payment_method_types=["card"],
        line_items=[line_item],
        mode="payment",
        success_url=f"{frontend_url}/plugin-purchase-success?session_id={{CHECKOUT_SESSION_ID}}&plugin_id={plugin.id}",
        cancel_url=f"{frontend_url}/plugins/{plugin.id}",
        metadata=metadata,
    )

    # If creator has a Stripe Connect account, route funds using destination charges
    if creator_destination:
        checkout_kwargs["payment_intent_data"] = {
            "application_fee_amount": int(round(platform_cut * 100)),
            "transfer_data": {"destination": creator_destination},
            "metadata": metadata,
        }

    session = stripe.checkout.Session.create(**checkout_kwargs)

    purchase.stripe_session_id = session.id
    db.session.commit()

    return jsonify({
        "checkout_url": session.url,
        "session_id": session.id,
        "purchase_id": purchase.id,
        "price": price,
        "platform_cut": platform_cut,
        "creator_earnings": creator_earnings,
        "connect_enabled": bool(creator_destination),
    }), 200


@plugin_marketplace_bp.route("/api/plugins/confirm-purchase", methods=["POST"])
@jwt_required()
def confirm_plugin_purchase():
    data = request.get_json() or {}
    session_id = data.get("session_id")
    if not session_id:
        return jsonify({"error": "session_id required"}), 400

    purchase = PluginPurchase.query.filter_by(stripe_session_id=session_id).first()
    if not purchase:
        return jsonify({"error": "Purchase not found"}), 404

    if purchase.status == "paid":
        return jsonify({"message": "Already confirmed", "purchase": purchase.serialize()}), 200

    session = stripe.checkout.Session.retrieve(session_id)
    if session.payment_status != "paid":
        return jsonify({"error": "Payment not completed"}), 400

    purchase.status = "paid"
    purchase.stripe_payment_intent_id = getattr(session, "payment_intent", None)

    plugin = Plugin.query.get(purchase.plugin_id)
    if plugin:
        plugin.purchase_count = (plugin.purchase_count or 0) + 1

    # Optional internal revenue tracking
    try:
        rev = Revenue(
            user_id=purchase.creator_id,
            source="plugin_sale",
            amount=purchase.price_paid,
            platform_cut=purchase.platform_cut,
            creator_earnings=purchase.creator_earnings,
            created_at=datetime.utcnow(),
        )
        db.session.add(rev)
    except Exception:
        # Keep purchase confirmation resilient if Revenue model shape differs
        db.session.rollback()
        db.session.begin()

        purchase = PluginPurchase.query.filter_by(id=purchase.id).first()
        if plugin:
            plugin = Plugin.query.get(plugin.id)
            plugin.purchase_count = (plugin.purchase_count or 0)

    db.session.commit()

    return jsonify({
        "message": "Plugin purchase confirmed",
        "purchase": purchase.serialize()
    }), 200


@plugin_marketplace_bp.route("/api/plugins/my-purchases", methods=["GET"])
@jwt_required()
def my_plugin_purchases():
    user_id = get_jwt_identity()
    rows = PluginPurchase.query.filter_by(buyer_id=user_id, status="paid").order_by(PluginPurchase.purchased_at.desc()).all()
    return jsonify([r.serialize() for r in rows]), 200


@plugin_marketplace_bp.route("/api/plugins/my-sales", methods=["GET"])
@jwt_required()
def my_plugin_sales():
    user_id = get_jwt_identity()
    rows = PluginPurchase.query.filter_by(creator_id=user_id).order_by(PluginPurchase.purchased_at.desc()).all()
    return jsonify([r.serialize() for r in rows]), 200


@plugin_marketplace_bp.route("/api/plugins/purchases/<int:purchase_id>/download", methods=["GET"])
@jwt_required()
def download_plugin(purchase_id):
    user_id = get_jwt_identity()
    purchase = PluginPurchase.query.get_or_404(purchase_id)

    if purchase.buyer_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    if purchase.status != "paid":
        return jsonify({"error": "Purchase not completed"}), 400

    plugin = Plugin.query.get_or_404(purchase.plugin_id)

    if plugin:
        plugin.download_count = (plugin.download_count or 0) + 1
        db.session.commit()

    return jsonify({
        "plugin_id": plugin.id,
        "plugin_name": plugin.name,
        "file_url": plugin.file_url,
        "preview_url": plugin.preview_url,
        "message": "Download authorized"
    }), 200

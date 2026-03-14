from flask import Blueprint, request, jsonify
import requests as req
import os
import stripe

printful_bp = Blueprint('printful', __name__)

PRINTFUL_API = "https://api.printful.com"

def printful_headers():
    key = os.environ.get('PRINTFUL_API_KEY')
    return {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}

# ── 1. Get Printful product catalog ──────────────────────────────────────────
@printful_bp.route('/catalog', methods=['GET'])
def get_catalog():
    """Return available blank product types from Printful"""
    try:
        r = req.get(f"{PRINTFUL_API}/products", headers=printful_headers(), timeout=10)
        data = r.json()
        products = []
        for p in data.get("result", []):
            products.append({
                "id": p["id"],
                "name": p["title"],
                "image": p.get("image", ""),
                "category": p.get("type", ""),
                "base_price": p.get("avg_fulfillment_time", 0)
            })
        return jsonify({"products": products})
    except Exception as e:
        return jsonify({"error": str(e), "products": []}), 500


# ── 2. Get variants for a specific product ────────────────────────────────────
@printful_bp.route('/catalog/<int:product_id>/variants', methods=['GET'])
def get_variants(product_id):
    try:
        r = req.get(f"{PRINTFUL_API}/products/{product_id}", headers=printful_headers(), timeout=10)
        data = r.json().get("result", {})
        variants = []
        for v in data.get("variants", []):
            variants.append({
                "id": v["id"],
                "name": v["name"],
                "size": v.get("size", ""),
                "color": v.get("color", ""),
                "price": v.get("price", "0.00"),
                "image": v.get("image", "")
            })
        product_info = {
            "id": data.get("product", {}).get("id"),
            "name": data.get("product", {}).get("title"),
            "image": data.get("product", {}).get("image"),
            "description": data.get("product", {}).get("description", ""),
            "variants": variants
        }
        return jsonify(product_info)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── 3. Generate mockup preview ────────────────────────────────────────────────
@printful_bp.route('/mockup', methods=['POST'])
def generate_mockup():
    """Generate a product mockup with creator's artwork"""
    from flask_jwt_extended import jwt_required, get_jwt_identity
    from api.models import db, User

    data = request.get_json()
    variant_id = data.get("variant_id")
    artwork_url = data.get("artwork_url")  # R2 URL of uploaded artwork

    if not variant_id or not artwork_url:
        return jsonify({"error": "variant_id and artwork_url required"}), 400

    payload = {
        "variant_ids": [variant_id],
        "format": "jpg",
        "files": [{
            "placement": "front",
            "image_url": artwork_url,
            "position": {
                "area_width": 1800,
                "area_height": 2400,
                "width": 1800,
                "height": 1800,
                "top": 300,
                "left": 0
            }
        }]
    }

    try:
        # Get product id from variant
        product_id = data.get("product_id")
        r = req.post(
            f"{PRINTFUL_API}/mockup-generator/create-task/{product_id}",
            json=payload,
            headers=printful_headers(),
            timeout=15
        )
        result = r.json()
        task_key = result.get("result", {}).get("task_key")
        return jsonify({"task_key": task_key, "status": "pending"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── 4. Poll mockup task result ────────────────────────────────────────────────
@printful_bp.route('/mockup/result/<task_key>', methods=['GET'])
def get_mockup_result(task_key):
    try:
        r = req.get(
            f"{PRINTFUL_API}/mockup-generator/task?task_key={task_key}",
            headers=printful_headers(),
            timeout=10
        )
        result = r.json().get("result", {})
        status = result.get("status")
        mockups = []
        if status == "completed":
            for m in result.get("mockups", []):
                mockups.append({
                    "url": m.get("mockup_url"),
                    "placement": m.get("placement")
                })
        return jsonify({"status": status, "mockups": mockups})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── 5. Creator saves a product to their store ─────────────────────────────────
@printful_bp.route('/store/product', methods=['POST'])
def create_store_product():
    from flask_jwt_extended import jwt_required, get_jwt_identity
    from api.models import db, User, CreatorProduct

    # Get current user
    auth = request.headers.get("Authorization", "")
    token = auth.replace("Bearer ", "")

    data = request.get_json()
    required = ["name", "variant_id", "retail_price", "artwork_url", "mockup_url", "product_id"]
    for f in required:
        if not data.get(f):
            return jsonify({"error": f"{f} is required"}), 400

    try:
        from flask_jwt_extended import decode_token
        decoded = decode_token(token)
        user_id = decoded.get("sub")
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    product = CreatorProduct(
        user_id=user_id,
        name=data["name"],
        description=data.get("description", ""),
        printful_product_id=data["product_id"],
        printful_variant_id=data["variant_id"],
        retail_price=float(data["retail_price"]),
        artwork_url=data["artwork_url"],
        mockup_url=data["mockup_url"],
        category=data.get("category", "Apparel"),
        is_active=True
    )
    db.session.add(product)
    db.session.commit()

    return jsonify({"message": "Product created", "product_id": product.id}), 201


# ── 6. Get a creator's store products (public) ────────────────────────────────
@printful_bp.route('/store/<username>/products', methods=['GET'])
def get_creator_store(username):
    from api.models import User, CreatorProduct

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "Creator not found"}), 404

    products = CreatorProduct.query.filter_by(user_id=user.id, is_active=True).all()
    return jsonify({
        "creator": {
            "username": user.username,
            "name": getattr(user, 'full_name', user.username),
            "avatar": getattr(user, 'profile_image_url', None)
        },
        "products": [{
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "price": p.retail_price,
            "mockup_url": p.mockup_url,
            "category": p.category
        } for p in products]
    })


# ── 7. Fan checkout — Stripe payment + Printful order ────────────────────────
@printful_bp.route('/store/checkout', methods=['POST'])
def store_checkout():
    from api.models import db, CreatorProduct, User, MerchOrder

    data = request.get_json()
    product_id = data.get("product_id")
    quantity = data.get("quantity", 1)
    shipping_address = data.get("shipping_address")  # {name, address1, city, state_code, country_code, zip}

    if not product_id or not shipping_address:
        return jsonify({"error": "product_id and shipping_address required"}), 400

    product = CreatorProduct.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404

    # Printful base cost (you pay this)
    # Retail price set by creator — platform takes 10%
    retail_price = float(product.retail_price)
    platform_fee = round(retail_price * 0.10, 2)
    amount_cents = int(retail_price * 100 * quantity)

    stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

    try:
        # Create Stripe payment intent
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency="usd",
            metadata={
                "product_id": product_id,
                "quantity": quantity,
                "creator_id": product.user_id,
                "type": "merch_order"
            }
        )

        # Save pending order
        order = MerchOrder(
            product_id=product_id,
            creator_id=product.user_id,
            quantity=quantity,
            retail_price=retail_price,
            platform_fee=platform_fee,
            stripe_payment_intent=intent.id,
            shipping_name=shipping_address.get("name"),
            shipping_address=shipping_address.get("address1"),
            shipping_city=shipping_address.get("city"),
            shipping_state=shipping_address.get("state_code"),
            shipping_country=shipping_address.get("country_code", "US"),
            shipping_zip=shipping_address.get("zip"),
            status="pending"
        )
        db.session.add(order)
        db.session.commit()

        return jsonify({
            "client_secret": intent.client_secret,
            "order_id": order.id,
            "amount": retail_price * quantity
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── 8. Webhook — after Stripe confirms payment, submit to Printful ────────────
@printful_bp.route('/store/fulfillment', methods=['POST'])
def fulfill_order():
    """Called after successful Stripe payment to submit order to Printful"""
    from api.models import db, CreatorProduct, MerchOrder

    data = request.get_json()
    order_id = data.get("order_id")

    order = MerchOrder.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    product = CreatorProduct.query.get(order.product_id)

    printful_order = {
        "recipient": {
            "name": order.shipping_name,
            "address1": order.shipping_address,
            "city": order.shipping_city,
            "state_code": order.shipping_state,
            "country_code": order.shipping_country,
            "zip": order.shipping_zip
        },
        "items": [{
            "variant_id": product.printful_variant_id,
            "quantity": order.quantity,
            "files": [{
                "url": product.artwork_url
            }]
        }]
    }

    try:
        r = req.post(
            f"{PRINTFUL_API}/orders",
            json=printful_order,
            headers=printful_headers(),
            timeout=15
        )
        result = r.json()
        printful_order_id = result.get("result", {}).get("id")

        order.printful_order_id = str(printful_order_id)
        order.status = "submitted"
        db.session.commit()

        return jsonify({"message": "Order submitted to Printful", "printful_order_id": printful_order_id})
    except Exception as e:
        order.status = "fulfillment_failed"
        db.session.commit()
        return jsonify({"error": str(e)}), 500


# ── 9. Creator's order dashboard ─────────────────────────────────────────────
@printful_bp.route('/my-products', methods=['GET', 'POST'])
def my_products():
    from api.models import CreatorProduct, MerchOrder, db
    from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

    auth = request.headers.get("Authorization", "")
    token = auth.replace("Bearer ", "")

    try:
        from flask_jwt_extended import decode_token
        decoded = decode_token(token)
        user_id = decoded.get("sub")
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    if request.method == 'POST':
        data = request.get_json()
        product = CreatorProduct(
            user_id=user_id,
            name=data.get('name', 'My Product'),
            printful_product_id=data.get('printful_product_id'),
            retail_price=data.get('retail_price', 29.99),
            mockup_url=data.get('mockup_url', ''),
            category=data.get('category', ''),
            is_active=data.get('is_active', True)
        )
        db.session.add(product)
        db.session.commit()
        return jsonify({"id": product.id, "name": product.name, "message": "Published!"}), 201

    products = CreatorProduct.query.filter_by(user_id=user_id).all()
    result = []
    for p in products:
        orders = MerchOrder.query.filter_by(product_id=p.id).all()
        total_sales = sum(o.retail_price * o.quantity for o in orders if o.status != "pending")
        result.append({
            "id": p.id,
            "name": p.name,
            "price": p.retail_price,
            "mockup_url": p.mockup_url,
            "category": p.category,
            "is_active": p.is_active,
            "total_orders": len([o for o in orders if o.status != "pending"]),
            "total_revenue": round(total_sales * 0.90, 2)  # 90% to creator
        })

    return jsonify({"products": result})

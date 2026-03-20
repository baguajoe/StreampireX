from flask import Blueprint, request, jsonify
import requests, os
from api.models import db, User, Product
from flask_jwt_extended import jwt_required, get_jwt_identity

printful_unified_bp = Blueprint("printful_unified", __name__)

PRINTFUL_API_URL   = "https://api.printful.com"
PRINTFUL_CLIENT_ID = os.environ.get("PRINTFUL_CLIENT_ID", "")
PRINTFUL_SECRET    = os.environ.get("PRINTFUL_CLIENT_SECRET", "")

_catalog_token = {"token": None}

def get_app_token():
    """Get OAuth2 client_credentials token for catalog/public endpoints."""
    if _catalog_token["token"]:
        return _catalog_token["token"]
    try:
        res = requests.post(
            "https://www.printful.com/oauth/token",
            data={
                "grant_type":    "client_credentials",
                "client_id":     PRINTFUL_CLIENT_ID,
                "client_secret": PRINTFUL_SECRET,
            },
            timeout=10
        )
        if res.ok:
            _catalog_token["token"] = res.json().get("access_token", "")
            return _catalog_token["token"]
    except Exception as e:
        print(f"Printful token error: {e}")
    return ""

def pf_headers(user_token=None):
    token = user_token or get_app_token()
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

def get_user_token(user_id):
    """Get per-user OAuth token if they connected their Printful store."""
    user = User.query.get(user_id)
    return getattr(user, "printful_access_token", None)

@printful_unified_bp.route("/catalog", methods=["GET"])
@jwt_required()
def get_catalog():
    category = request.args.get("category", "")
    search   = request.args.get("search", "").lower()
    page     = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 50))

    try:
        # Public endpoint — no auth required
        res = requests.get(f"{PRINTFUL_API_URL}/products", timeout=15)
        if not res.ok:
            return jsonify({"error": "Printful API error", "products": []}), 200
        data = res.json().get("result", [])
    except Exception as e:
        return jsonify({"error": str(e), "products": []}), 200

    products = []
    for item in data:
        cat = CATEGORY_MAP.get(item.get("type", ""), item.get("type", "Other"))
        if category and category != "All" and cat != category:
            continue
        name = item.get("title", "")
        if search and search not in name.lower():
            continue
        products.append({
            "id":          item.get("id"),
            "name":        name,
            "category":    cat,
            "type":        item.get("type", ""),
            "image":       item.get("image", ""),
            "base_price":  item.get("avg_fulfillment_cost", 0),
            "description": item.get("description", ""),
            "techniques":  item.get("techniques", []),
        })

    total = len(products)
    start = (page-1)*per_page
    paginated = products[start:start+per_page]

    return jsonify({
        "products": paginated,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
        "categories": sorted(set(CATEGORY_MAP.values())),
    }), 200

@printful_unified_bp.route("/catalog/<int:product_id>", methods=["GET"])
@jwt_required()
def get_product_detail(product_id):
    try:
        res = requests.get(f"{PRINTFUL_API_URL}/products/{product_id}", timeout=15)  # public endpoint
        if not res.ok:
            return jsonify({"error": "Product not found"}), 404
        data = res.json().get("result", {})
        product  = data.get("product", {})
        variants = data.get("variants", [])

        # Extract unique colors and sizes
        colors = []
        sizes  = []
        color_images = {}
        seen_colors = set()
        seen_sizes  = set()

        for v in variants:
            c = v.get("color", "")
            s = v.get("size", "")
            if c and c not in seen_colors:
                colors.append({"name": c, "code": v.get("color_code", "#888"), "image": v.get("image", "")})
                seen_colors.add(c)
                color_images[c] = v.get("image", "")
            if s and s not in seen_sizes:
                sizes.append(s)
                seen_sizes.add(s)

        size_order = ["XXS","XS","S","M","L","XL","2XL","3XL","4XL","5XL","OS","One Size"]
        sizes.sort(key=lambda x: size_order.index(x) if x in size_order else 99)

        return jsonify({
            "id":           product.get("id"),
            "name":         product.get("title", ""),
            "description":  product.get("description", ""),
            "image":        product.get("image", ""),
            "category":     CATEGORY_MAP.get(product.get("type",""), "Other"),
            "colors":       colors,
            "sizes":        sizes,
            "color_images": color_images,
            "variants":     [{
                "id":         v.get("id"),
                "name":       v.get("name",""),
                "color":      v.get("color",""),
                "color_code": v.get("color_code","#888"),
                "size":       v.get("size",""),
                "price":      v.get("price",""),
                "image":      v.get("image",""),
                "in_stock":   v.get("availability_status","active") == "active",
            } for v in variants],
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@printful_unified_bp.route("/mockup", methods=["POST"])
@jwt_required()
def generate_mockup():
    user_id = get_jwt_identity()
    user_token = get_user_token(user_id)
    data = request.json
    payload = {
        "variant_ids": data.get("variant_ids", []),
        "format": "jpg",
        "files": [{"placement": "front", "image_url": data.get("image_url")}]
    }
    try:
        res = requests.post(
            f"{PRINTFUL_API_URL}/mockup-generator/create-task/{data.get('product_id')}",
            json=payload, headers=pf_headers(user_token), timeout=30
        )
        return jsonify(res.json()), res.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@printful_unified_bp.route("/mockup/result/<task_key>", methods=["GET"])
@jwt_required()
def get_mockup_result(task_key):
    try:
        res = requests.get(
            f"{PRINTFUL_API_URL}/mockup-generator/task?task_key={task_key}",
            headers=pf_headers(), timeout=15
        )
        return jsonify(res.json()), res.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@printful_unified_bp.route("/publish", methods=["POST"])
@jwt_required()
def publish_product():
    user_id = get_jwt_identity()
    data = request.json
    new_product = Product(
        creator_id=user_id,
        title=data.get("title"),
        price=data.get("price"),
        image_url=data.get("mockup_url"),
        is_printful=True,
        printful_product_id=str(data.get("printful_id"))
    )
    db.session.add(new_product)
    db.session.commit()
    return jsonify({"msg": "Product published", "id": new_product.id}), 201

@printful_unified_bp.route("/shipping", methods=["POST"])
@jwt_required()
def get_shipping():
    data = request.json
    try:
        res = requests.post(
            f"{PRINTFUL_API_URL}/shipping/rates",
            json=data, headers=pf_headers(), timeout=15
        )
        return jsonify(res.json()), res.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

import os, uuid, hashlib, time
import jwt as pyjwt
from flask import Blueprint, request, jsonify, redirect
from flask_jwt_extended import jwt_required, get_jwt_identity
from .models import db, User

sonosuite_bp = Blueprint("sonosuite", __name__)

SONOSUITE_SHARED_SECRET = os.environ.get("SONOSUITE_SHARED_SECRET", "")
SONOSUITE_BASE_URL      = os.environ.get("SONOSUITE_BASE_URL", "https://streampirex.sonosuite.com")
FRONTEND_URL            = os.environ.get("FRONTEND_URL", "https://streampirex.sonosuite.com")

def _build_sns_jwt(user, return_to=None):
    now = int(time.time())
    payload = {
        "iat": now,
        "exp": now + 300,
        "jti": hashlib.md5(f"{now}{uuid.uuid4()}".encode()).hexdigest(),
        "email": user.email,
        "externalId": str(user.id),
    }
    token = pyjwt.encode(payload, SONOSUITE_SHARED_SECRET, algorithm="HS256")
    url = f"{SONOSUITE_BASE_URL}/albums?jwt={token}"
    if return_to:
        url += f"&return_to={return_to}"
    return url

@sonosuite_bp.route("/api/sonosuite/sso-login", methods=["GET"])
def sso_login():
    """SonoSuite calls this when user is unauthenticated."""
    return_to = request.args.get("return_to", "")
    spx_token = request.args.get("token", "")

    if not spx_token:
        next_url = f"{FRONTEND_URL}/login?next=/sonosuite-redirect"
        if return_to:
            next_url += f"&sns_return_to={return_to}"
        return redirect(next_url)

    try:
        from flask_jwt_extended import decode_token
        decoded = decode_token(spx_token)
        user_id = decoded.get("sub")
        user = User.query.get(user_id)
        if not user:
            return redirect(f"{FRONTEND_URL}/login?error=user_not_found")
    except Exception:
        return redirect(f"{FRONTEND_URL}/login?error=session_expired")

    return redirect(_build_sns_jwt(user, return_to))

@sonosuite_bp.route("/api/sonosuite/redirect", methods=["GET"])
@jwt_required()
def sonosuite_redirect():
    """Frontend calls this to get SSO redirect URL."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    if not SONOSUITE_SHARED_SECRET:
        return jsonify({"error": "SONOSUITE_SHARED_SECRET not configured"}), 503
    return_to = request.args.get("return_to", "/albums")
    return jsonify({"redirect_url": _build_sns_jwt(user, return_to)}), 200

@sonosuite_bp.route("/api/sonosuite/status", methods=["GET"])
@jwt_required()
def sonosuite_status():
    return jsonify({
        "connected": bool(SONOSUITE_SHARED_SECRET),
        "sso_enabled": bool(SONOSUITE_SHARED_SECRET),
        "sonosuite_url": SONOSUITE_BASE_URL,
    }), 200

@sonosuite_bp.route("/api/sonosuite/connect", methods=["POST"])
@jwt_required()
def sonosuite_connect():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    if not SONOSUITE_SHARED_SECRET:
        return jsonify({"error": "SONOSUITE_SHARED_SECRET not set"}), 503
    return jsonify({
        "success": True, "connected": True,
        "connection": {"email": user.email, "external_id": str(user.id)}
    }), 200

@sonosuite_bp.route("/api/sonosuite/disconnect", methods=["POST"])
@jwt_required()
def sonosuite_disconnect():
    return jsonify({"success": True, "connected": False}), 200

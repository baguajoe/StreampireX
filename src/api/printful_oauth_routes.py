from flask import Blueprint, redirect, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, decode_token
from urllib.parse import urlencode
import os
import requests as req

from src.api.models import db, User

printful_oauth_bp = Blueprint("printful_oauth", __name__)

PRINTFUL_AUTH_URL = "https://www.printful.com/oauth/authorize"
PRINTFUL_TOKEN_URL = "https://www.printful.com/oauth/token"


def _frontend_url():
    return os.getenv("FRONTEND_URL") or os.getenv("REACT_APP_BACKEND_URL", "").replace(":3001", ":3000").replace("-3001.", "-3000.") or "http://localhost:3000"


def _redirect_uri():
    return os.getenv("PRINTFUL_REDIRECT_URI") or "https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev/api/printful/oauth/callback"


@printful_oauth_bp.route("/api/printful/connect", methods=["GET"])
@jwt_required(optional=True)
def connect_printful():
    token = request.args.get("token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth.replace("Bearer ", "", 1)

    if not token:
        return jsonify({"error": "Missing JWT token"}), 401

    try:
        decoded = decode_token(token)
        user_id = decoded.get("sub")
    except Exception:
        return jsonify({"error": "Invalid JWT token"}), 401

    params = {
        "client_id": os.getenv("PRINTFUL_CLIENT_ID"),
        "redirect_url": _redirect_uri(),
        "state": f"{user_id}:{token}"
    }
    return redirect(f"{PRINTFUL_AUTH_URL}?{urlencode(params)}")


@printful_oauth_bp.route("/api/printful/oauth/callback", methods=["GET"])
def printful_oauth_callback():
    code = request.args.get("code")
    state = request.args.get("state", "")
    success = request.args.get("success")

    if success == "0":
        return redirect(f"{_frontend_url()}/settings?printful=denied")

    if not code or ":" not in state:
        return redirect(f"{_frontend_url()}/settings?printful=error")

    user_id, original_token = state.split(":", 1)

    payload = {
        "grant_type": "authorization_code",
        "client_id": os.getenv("PRINTFUL_CLIENT_ID"),
        "client_secret": os.getenv("PRINTFUL_CLIENT_SECRET"),
        "code": code
    }

    try:
        r = req.post(PRINTFUL_TOKEN_URL, data=payload, timeout=20)
        data = r.json()

        if r.status_code >= 400 or "access_token" not in data:
            return redirect(f"{_frontend_url()}/settings?printful=token_error")

        user = User.query.get(int(user_id))
        if not user:
            return redirect(f"{_frontend_url()}/settings?printful=user_missing")

        # Save on user model only if fields exist
        for field, value in {
            "printful_access_token": data.get("access_token"),
            "printful_refresh_token": data.get("refresh_token"),
            "printful_token_type": data.get("token_type", "bearer"),
            "printful_token_expires_at": data.get("expires_at"),
            "printful_connected": True,
        }.items():
            if hasattr(user, field):
                setattr(user, field, value)

        db.session.commit()
        return redirect(f"{_frontend_url()}/settings?printful=connected")
    except Exception:
        db.session.rollback()
        return redirect(f"{_frontend_url()}/settings?printful=server_error")


@printful_oauth_bp.route("/api/printful/status", methods=["GET"])
@jwt_required()
def printful_status():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"connected": False}), 404

    connected = bool(getattr(user, "printful_access_token", None))
    return jsonify({
        "connected": connected,
        "has_refresh_token": bool(getattr(user, "printful_refresh_token", None))
    }), 200

"""
SPX Script — Backend Routes
Add to: src/api/routes/script_routes.py
Register in app.py: from .routes.script_routes import script_bp; app.register_blueprint(script_bp)
"""

import os
import json
import time
import requests
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import db, User

script_bp = Blueprint("script", __name__, url_prefix="/api/script")

REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")
FLUX_MODEL_VERSION = "black-forest-labs/flux-1.1-pro"
CREDITS_PER_PANEL = 2


# ── Generate comic panel via FLUX 1.1 Pro ──────────────────────────────────
@script_bp.route("/generate-panel", methods=["POST"])
@jwt_required()
def generate_panel():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    prompt = data.get("prompt", "").strip()
    width = data.get("width", 1024)
    height = data.get("height", 1024)
    seed = data.get("seed")
    num_panels = int(data.get("num_panels", 1))
    total_cost = num_panels * CREDITS_PER_PANEL

    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400

    # Check credits
    # Wire to your credits system — example assumes user.spx_credits field
    # if user.spx_credits < total_cost:
    #     return jsonify({"error": "Insufficient SPX Credits"}), 402

    if not REPLICATE_API_TOKEN:
        return jsonify({"error": "Replicate API token not configured"}), 500

    headers = {
        "Authorization": f"Token {REPLICATE_API_TOKEN}",
        "Content-Type": "application/json",
    }

    results = []
    for i in range(num_panels):
        payload = {
            "input": {
                "prompt": prompt,
                "width": width,
                "height": height,
                "num_inference_steps": 28,
                "guidance": 3.5,
                "output_format": "webp",
                "output_quality": 90,
            }
        }
        if seed:
            payload["input"]["seed"] = int(seed) + i  # offset seed per panel for variation

        # Start prediction
        resp = requests.post(
            f"https://api.replicate.com/v1/models/{FLUX_MODEL_VERSION}/predictions",
            headers=headers,
            json=payload,
            timeout=30,
        )
        if not resp.ok:
            return jsonify({"error": f"Replicate error: {resp.text}"}), 500

        prediction = resp.json()
        prediction_id = prediction["id"]

        # Poll until done (max 120s)
        for _ in range(80):
            time.sleep(1.5)
            poll = requests.get(
                f"https://api.replicate.com/v1/predictions/{prediction_id}",
                headers=headers,
                timeout=15,
            )
            prediction = poll.json()
            if prediction["status"] in ("succeeded", "failed", "canceled"):
                break

        if prediction["status"] == "succeeded":
            output = prediction.get("output")
            image_url = output[0] if isinstance(output, list) else output
            results.append({
                "status": "succeeded",
                "image_url": image_url,
                "seed": payload["input"].get("seed"),
                "prediction_id": prediction_id,
            })
        else:
            results.append({
                "status": "failed",
                "image_url": None,
                "prediction_id": prediction_id,
            })

    # Deduct credits for successful panels
    succeeded = sum(1 for r in results if r["status"] == "succeeded")
    # user.spx_credits -= succeeded * CREDITS_PER_PANEL
    # db.session.commit()

    return jsonify({
        "panels": results,
        "credits_used": succeeded * CREDITS_PER_PANEL,
        # "credits_remaining": user.spx_credits,
    })


# ── Export script as plain text (Fountain-compatible) ──────────────────────
@script_bp.route("/export-fountain", methods=["POST"])
@jwt_required()
def export_fountain():
    data = request.get_json()
    elements = data.get("elements", [])
    title = data.get("title", "UNTITLED")

    lines = [f"Title: {title}", "Credit: Written by", "Author:", "Draft date:", "Contact:", ""]

    for el in elements:
        t = el.get("type")
        text = el.get("text", "")
        if t == "heading":
            lines.append(f"\n{text.upper()}\n")
        elif t == "action":
            lines.append(f"\n{text}\n")
        elif t == "character":
            lines.append(f"\n{text.upper()}")
        elif t == "dialogue":
            lines.append(text)
        elif t == "paren":
            lines.append(text if text.startswith("(") else f"({text})")
        elif t == "transition":
            lines.append(f"\n{text.upper()}\n")
        elif t == "note":
            lines.append(f"/* {text} */")

    content = "\n".join(lines)
    return jsonify({"content": content, "filename": f"{title.replace(' ', '_')}.fountain"})


# ── Save script draft ────────────────────────────────────────────────────
@script_bp.route("/save-draft", methods=["POST"])
@jwt_required()
def save_draft():
    user_id = get_jwt_identity()
    data = request.get_json()
    # Wire to your projects table — store as JSON blob
    # draft = ScriptDraft(user_id=user_id, title=data.get("title"), content=json.dumps(data))
    # db.session.add(draft)
    # db.session.commit()
    return jsonify({"success": True, "message": "Draft saved (wire to ScriptDraft model)"})


# ── Get user's script drafts ────────────────────────────────────────────────
@script_bp.route("/drafts", methods=["GET"])
@jwt_required()
def get_drafts():
    user_id = get_jwt_identity()
    # drafts = ScriptDraft.query.filter_by(user_id=user_id).order_by(ScriptDraft.updated_at.desc()).all()
    # return jsonify([d.to_dict() for d in drafts])
    return jsonify({"drafts": [], "message": "Wire to ScriptDraft model"})

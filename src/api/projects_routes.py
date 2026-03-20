from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import db
import boto3, json, os, uuid
from datetime import datetime

projects_bp = Blueprint("projects_bp", __name__)

R2_ENDPOINT   = os.environ.get("R2_ENDPOINT_URL", "")
R2_ACCESS_KEY = os.environ.get("R2_ACCESS_KEY", "")
R2_SECRET_KEY = os.environ.get("R2_SECRET_KEY", "")
R2_BUCKET     = os.environ.get("R2_BUCKET_NAME", "streampirex-media")
R2_PUBLIC_URL = os.environ.get('R2_PUBLIC_URL', 'https://pub-3a956be9429449469ec53b73495e.r2.dev')

def get_r2():
    return boto3.client("s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
        region_name="auto"
    )

# ── Save project to R2 ──
@projects_bp.route("/api/projects/save", methods=["POST"])
@jwt_required()
def save_project():
    user_id = get_jwt_identity()
    data = request.get_json()
    tool     = data.get("tool", "unknown")   # canvas|vector|motion|compositor
    name     = data.get("name", "Untitled")
    payload  = data.get("payload", {})

    key = f"projects/{user_id}/{tool}/{uuid.uuid4()}.spxp"
    try:
        r2 = get_r2()
        r2.put_object(
            Bucket=R2_BUCKET,
            Key=key,
            Body=json.dumps(payload).encode(),
            ContentType="application/json",
            Metadata={"name": name, "tool": tool, "user_id": str(user_id)}
        )
        public_url = f"{R2_PUBLIC_URL}/{key}"
        return jsonify({"url": public_url, "key": key, "name": name}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── List user projects by tool ──
@projects_bp.route("/api/projects/list", methods=["GET"])
@jwt_required()
def list_projects():
    user_id = get_jwt_identity()
    tool    = request.args.get("tool", "")
    try:
        r2 = get_r2()
        prefix = f"projects/{user_id}/{tool}/" if tool else f"projects/{user_id}/"
        res = r2.list_objects_v2(Bucket=R2_BUCKET, Prefix=prefix)
        items = []
        for obj in res.get("Contents", []):
            meta = r2.head_object(Bucket=R2_BUCKET, Key=obj["Key"])
            items.append({
                "key":      obj["Key"],
                "url":      f"{R2_PUBLIC_URL}/{obj['Key']}",
                "name":     meta["Metadata"].get("name", "Untitled"),
                "tool":     meta["Metadata"].get("tool", tool),
                "size":     obj["Size"],
                "modified": obj["LastModified"].isoformat()
            })
        items.sort(key=lambda x: x["modified"], reverse=True)
        return jsonify({"projects": items}), 200
    except Exception as e:
        return jsonify({"error": str(e), "projects": []}), 200

# ── Load project from R2 ──
@projects_bp.route("/api/projects/load", methods=["GET"])
@jwt_required()
def load_project():
    user_id = get_jwt_identity()
    key     = request.args.get("key", "")
    if not key.startswith(f"projects/{user_id}/"):
        return jsonify({"error": "Unauthorized"}), 403
    try:
        r2 = get_r2()
        obj = r2.get_object(Bucket=R2_BUCKET, Key=key)
        payload = json.loads(obj["Body"].read())
        return jsonify({"payload": payload}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── Delete project ──
@projects_bp.route("/api/projects/delete", methods=["DELETE"])
@jwt_required()
def delete_project():
    user_id = get_jwt_identity()
    key     = request.get_json().get("key", "")
    if not key.startswith(f"projects/{user_id}/"):
        return jsonify({"error": "Unauthorized"}), 403
    try:
        r2 = get_r2()
        r2.delete_object(Bucket=R2_BUCKET, Key=key)
        return jsonify({"deleted": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

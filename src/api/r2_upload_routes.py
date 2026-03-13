from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import boto3
from botocore.client import Config
import os, uuid, mimetypes

r2_upload_bp = Blueprint('r2_upload', __name__)

def get_r2_client():
    return boto3.client('s3',
        endpoint_url=os.environ.get('R2_ENDPOINT_URL'),
        aws_access_key_id=os.environ.get('R2_ACCESS_KEY'),
        aws_secret_access_key=os.environ.get('R2_SECRET_KEY'),
        config=Config(signature_version='s3v4'),
        region_name='auto'
    )

@r2_upload_bp.route('/api/r2/presign', methods=['POST'])
@jwt_required()
def get_presigned_url():
    user_id = get_jwt_identity()
    data = request.get_json()
    filename = data.get('filename', '')
    content_type = data.get('content_type') or mimetypes.guess_type(filename)[0] or 'application/octet-stream'
    folder = data.get('folder', 'uploads')
    if not filename:
        return jsonify({"error": "filename required"}), 400
    ext = filename.rsplit('.', 1)[-1] if '.' in filename else 'bin'
    key = f"{folder}/{user_id}/{uuid.uuid4().hex}.{ext}"
    bucket = os.environ.get('R2_BUCKET_NAME', 'streampirex-media')
    public_base = os.environ.get('R2_PUBLIC_URL', '').rstrip('/')
    try:
        client = get_r2_client()
        presigned_url = client.generate_presigned_url('put_object',
            Params={'Bucket': bucket, 'Key': key, 'ContentType': content_type},
            ExpiresIn=300)
        return jsonify({"upload_url": presigned_url, "public_url": f"{public_base}/{key}", "key": key})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@r2_upload_bp.route('/api/r2/delete', methods=['DELETE'])
@jwt_required()
def delete_r2_object():
    data = request.get_json()
    key = data.get('key')
    if not key:
        return jsonify({"error": "key required"}), 400
    try:
        get_r2_client().delete_object(Bucket=os.environ.get('R2_BUCKET_NAME', 'streampirex-media'), Key=key)
        return jsonify({"message": "Deleted", "key": key})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

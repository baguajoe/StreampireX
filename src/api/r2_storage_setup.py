import boto3
import os
import uuid
import mimetypes
from botocore.config import Config
from werkzeug.utils import secure_filename

R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "streampirex-media")
R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL", "")
R2_ENDPOINT = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

s3_client = boto3.client(
    "s3",
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    config=Config(signature_version="s3v4", retries={"max_attempts": 3, "mode": "standard"}),
    region_name="auto"
)

FOLDER_MAP = {
    "mp3": "audio", "wav": "audio", "flac": "audio", "m4a": "audio", "aac": "audio", "ogg": "audio",
    "mp4": "video", "avi": "video", "mov": "video", "wmv": "video", "webm": "video", "mkv": "video",
    "jpg": "images", "jpeg": "images", "png": "images", "gif": "images", "webp": "images", "svg": "images",
    "zip": "digital", "rar": "digital", "7z": "digital",
    "pdf": "documents", "doc": "documents", "docx": "documents",
}

CONTENT_TYPES = {
    "mp3": "audio/mpeg", "wav": "audio/wav", "flac": "audio/flac", "m4a": "audio/mp4",
    "aac": "audio/aac", "ogg": "audio/ogg", "mp4": "video/mp4", "mov": "video/quicktime",
    "webm": "video/webm", "avi": "video/x-msvideo", "mkv": "video/x-matroska",
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif",
    "webp": "image/webp", "svg": "image/svg+xml", "zip": "application/zip", "pdf": "application/pdf",
}


def uploadFile(file, filename=None):
    try:
        if filename is None:
            filename = getattr(file, 'filename', 'unknown')
        filename = secure_filename(filename)
        ext = filename.lower().rsplit('.', 1)[-1] if '.' in filename else ''
        folder = FOLDER_MAP.get(ext, "other")
        uid = uuid.uuid4().hex[:12]
        base = filename.rsplit('.', 1)[0][:100] if '.' in filename else filename[:100]
        r2_key = f"{folder}/{base}_{uid}.{ext}"
        content_type = CONTENT_TYPES.get(ext, mimetypes.guess_type(filename)[0] or "application/octet-stream")

        extra = {"ContentType": content_type, "CacheControl": _cache(ext)}
        if folder in ("audio", "video"):
            extra["ContentDisposition"] = "inline"
        elif folder == "digital":
            extra["ContentDisposition"] = f'attachment; filename="{filename}"'

        if hasattr(file, 'seek'):
            file.seek(0)

        s3_client.upload_fileobj(file, R2_BUCKET_NAME, r2_key, ExtraArgs=extra)

        if R2_PUBLIC_URL:
            url = f"{R2_PUBLIC_URL.rstrip('/')}/{r2_key}"
        else:
            url = f"https://{R2_BUCKET_NAME}.{R2_ACCOUNT_ID}.r2.dev/{r2_key}"

        print(f"✅ R2 Upload: {r2_key}")
        return url
    except Exception as e:
        print(f"❌ R2 upload error: {str(e)}")
        raise Exception(f"Failed to upload to R2: {str(e)}")


def deleteFile(file_url):
    try:
        r2_key = _url_to_key(file_url)
        if not r2_key: return False
        s3_client.delete_object(Bucket=R2_BUCKET_NAME, Key=r2_key)
        return True
    except Exception as e:
        print(f"❌ R2 delete error: {str(e)}")
        return False


def getSignedUrl(file_url, expires_in=3600):
    try:
        r2_key = _url_to_key(file_url)
        if not r2_key: return file_url
        return s3_client.generate_presigned_url(
            "get_object", Params={"Bucket": R2_BUCKET_NAME, "Key": r2_key}, ExpiresIn=expires_in
        )
    except Exception as e:
        print(f"❌ R2 signed URL error: {str(e)}")
        return file_url


def getStorageStats():
    try:
        stats = {"total_files": 0, "total_size_bytes": 0, "total_size_gb": 0, "by_folder": {}}
        paginator = s3_client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=R2_BUCKET_NAME):
            for obj in page.get("Contents", []):
                stats["total_files"] += 1
                stats["total_size_bytes"] += obj["Size"]
                folder = obj["Key"].split("/")[0] if "/" in obj["Key"] else "root"
                if folder not in stats["by_folder"]:
                    stats["by_folder"][folder] = {"files": 0, "size_bytes": 0}
                stats["by_folder"][folder]["files"] += 1
                stats["by_folder"][folder]["size_bytes"] += obj["Size"]
        stats["total_size_gb"] = round(stats["total_size_bytes"] / (1024**3), 2)
        stats["estimated_monthly_cost"] = round(stats["total_size_gb"] * 0.015, 2)
        return stats
    except Exception as e:
        return {"error": str(e)}


def _url_to_key(file_url):
    if not file_url: return None
    if R2_PUBLIC_URL and file_url.startswith(R2_PUBLIC_URL):
        return file_url.replace(R2_PUBLIC_URL.rstrip("/") + "/", "")
    r2_dev = f"https://{R2_BUCKET_NAME}.{R2_ACCOUNT_ID}.r2.dev/"
    if file_url.startswith(r2_dev):
        return file_url.replace(r2_dev, "")
    return None


def _cache(ext):
    if ext in ("jpg", "jpeg", "png", "gif", "webp", "svg"): return "public, max-age=31536000"
    if ext in ("mp3", "wav", "flac", "m4a", "aac", "ogg", "mp4", "mov", "webm"): return "public, max-age=2592000"
    return "public, max-age=86400"


# Aliases
upload_file = uploadFile
get_signed_url = getSignedUrl
delete_file = deleteFile
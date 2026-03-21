#!/usr/bin/env python3
"""
Patch routes.py to use R2 instead of Cloudinary for radio station uploads.
Run from: /workspaces/SpectraSphere
"""

import re
import shutil
from datetime import datetime

ROUTES_FILE = "src/api/routes.py"

# ── Backup ──────────────────────────────────────────────────────────────────
ts = datetime.now().strftime("%Y%m%d_%H%M%S")
backup = f"{ROUTES_FILE}.bak.radio_r2.{ts}"
shutil.copy2(ROUTES_FILE, backup)
print(f"✅ Backup created: {backup}")

with open(ROUTES_FILE, "r") as f:
    content = f.read()

# ── 1. Add R2 helper after the cloudinary_setup import ──────────────────────
R2_HELPER = '''
# ── R2 upload helper for radio (matches film_routes.py pattern) ──────────────
import boto3 as _boto3
from botocore.client import Config as _BotoConfig

def _get_radio_r2_client():
    return _boto3.client(
        's3',
        endpoint_url=os.environ.get('R2_ENDPOINT_URL'),
        aws_access_key_id=os.environ.get('R2_ACCESS_KEY'),
        aws_secret_access_key=os.environ.get('R2_SECRET_KEY'),
        config=_BotoConfig(signature_version='s3v4'),
        region_name='auto'
    )

def _upload_radio_file_to_r2(file_obj, folder, filename, content_type):
    """Upload a radio station file to R2 and return the public URL."""
    try:
        import uuid as _uuid
        client = _get_radio_r2_client()
        bucket = os.environ.get('R2_BUCKET_NAME', 'streampirex-media')
        public_base = os.environ.get('R2_PUBLIC_URL', '').rstrip('/')
        ext = filename.rsplit('.', 1)[-1] if '.' in filename else 'bin'
        key = f"{folder}/{_uuid.uuid4().hex}.{ext}"
        client.upload_fileobj(
            file_obj,
            bucket,
            key,
            ExtraArgs={'ContentType': content_type}
        )
        url = f"{public_base}/{key}"
        print(f"✅ Uploaded to R2: {url}")
        return url
    except Exception as e:
        print(f"❌ R2 upload error: {e}")
        return None

# ── end R2 radio helper ──────────────────────────────────────────────────────
'''

# Insert after the cloudinary_setup import line
if '_upload_radio_file_to_r2' not in content:
    content = content.replace(
        'from api.cloudinary_setup import uploadFile',
        'from api.cloudinary_setup import uploadFile' + R2_HELPER,
        1
    )
    print("✅ Added R2 helper function")
else:
    print("⏭️  R2 helper already present, skipping")

# ── 2. Replace logo upload (Cloudinary → R2) ────────────────────────────────
OLD_LOGO = """        # ✅ Handle logo upload with Cloudinary
        if 'logo' in request.files:
            logo_file = request.files['logo']
            if logo_file and logo_file.filename:
                logo_filename = secure_filename(logo_file.filename)
                logo_url = uploadFile(logo_file, logo_filename)
                print(f"✅ Logo uploaded to Cloudinary: {logo_url}")"""

NEW_LOGO = """        # ✅ Handle logo upload with R2
        if 'logo' in request.files:
            logo_file = request.files['logo']
            if logo_file and logo_file.filename:
                import mimetypes as _mt
                logo_filename = secure_filename(logo_file.filename)
                logo_ct = _mt.guess_type(logo_filename)[0] or 'image/jpeg'
                logo_url = _upload_radio_file_to_r2(logo_file, 'radio/logos', logo_filename, logo_ct)
                print(f"✅ Logo uploaded to R2: {logo_url}")"""

if OLD_LOGO in content:
    content = content.replace(OLD_LOGO, NEW_LOGO, 1)
    print("✅ Patched logo upload → R2")
else:
    print("⚠️  Logo upload block not found — may already be patched or whitespace differs")

# ── 3. Replace cover upload (Cloudinary → R2) ───────────────────────────────
OLD_COVER = """        # ✅ Handle cover upload with Cloudinary
        if 'cover' in request.files or 'coverPhoto' in request.files:
            cover_file = request.files.get('cover') or request.files.get('coverPhoto')
            if cover_file and cover_file.filename:
                cover_filename = secure_filename(cover_file.filename)
                cover_url = uploadFile(cover_file, cover_filename)
                print(f"✅ Cover uploaded to Cloudinary: {cover_url}")"""

NEW_COVER = """        # ✅ Handle cover upload with R2
        if 'cover' in request.files or 'coverPhoto' in request.files:
            cover_file = request.files.get('cover') or request.files.get('coverPhoto')
            if cover_file and cover_file.filename:
                import mimetypes as _mt
                cover_filename = secure_filename(cover_file.filename)
                cover_ct = _mt.guess_type(cover_filename)[0] or 'image/jpeg'
                cover_url = _upload_radio_file_to_r2(cover_file, 'radio/covers', cover_filename, cover_ct)
                print(f"✅ Cover uploaded to R2: {cover_url}")"""

if OLD_COVER in content:
    content = content.replace(OLD_COVER, NEW_COVER, 1)
    print("✅ Patched cover upload → R2")
else:
    print("⚠️  Cover upload block not found — may already be patched or whitespace differs")

# ── 4. Replace audio/mix upload (Cloudinary → R2) ───────────────────────────
OLD_AUDIO = """        # ✅ Handle initial mix upload with Cloudinary
        if 'initialMix' in request.files:
            mix_file = request.files['initialMix']
            if mix_file and mix_file.filename:
                mix_filename = secure_filename(mix_file.filename)
                initial_mix_url = uploadFile(mix_file, mix_filename)
                print(f"✅ Audio uploaded to Cloudinary: {initial_mix_url}")"""

NEW_AUDIO = """        # ✅ Handle initial mix upload with R2
        if 'initialMix' in request.files:
            mix_file = request.files['initialMix']
            if mix_file and mix_file.filename:
                mix_filename = secure_filename(mix_file.filename)
                # Detect audio content type
                ext = mix_filename.rsplit('.', 1)[-1].lower() if '.' in mix_filename else ''
                audio_ct_map = {
                    'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'ogg': 'audio/ogg',
                    'flac': 'audio/flac', 'm4a': 'audio/mp4', 'aac': 'audio/aac'
                }
                mix_ct = audio_ct_map.get(ext, 'audio/mpeg')
                initial_mix_url = _upload_radio_file_to_r2(mix_file, 'radio/audio', mix_filename, mix_ct)
                print(f"✅ Audio uploaded to R2: {initial_mix_url}")"""

if OLD_AUDIO in content:
    content = content.replace(OLD_AUDIO, NEW_AUDIO, 1)
    print("✅ Patched audio upload → R2")
else:
    print("⚠️  Audio upload block not found — may already be patched or whitespace differs")

# ── 5. Update the comment on the RadioStation creation block ─────────────────
content = content.replace(
    "        # ✅ Create station with Cloudinary URLs",
    "        # ✅ Create station with R2 URLs",
    1
)

# ── Write patched file ────────────────────────────────────────────────────────
with open(ROUTES_FILE, "w") as f:
    f.write(content)

print("\n🎉 Done! Radio station uploads now use Cloudflare R2.")
print(f"   Backup saved to: {backup}")
print("\nNext steps:")
print("  1. Restart your Flask backend")
print("  2. Create a new radio station with an audio file")
print("  3. Check the debug panel — Audio URL should now be from R2_PUBLIC_URL, not res.cloudinary.com")

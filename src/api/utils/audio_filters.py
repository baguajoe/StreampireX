# ✅ StreampireX Upload Filters (to use in your Flask route)
import os
import hashlib
import wave
import contextlib
from pydub import AudioSegment

# --- Config
MIN_DURATION_SECONDS = 30
MAX_DURATION_SECONDS = 600  # 10 min
SILENCE_THRESHOLD_DB = -50.0  # Silence threshold in dBFS
SILENCE_PERCENT_LIMIT = 0.9  # Reject if 90% is silence

# --- Check 1: Audio duration

def get_audio_duration(path):
    with contextlib.closing(wave.open(path, 'r')) as f:
        frames = f.getnframes()
        rate = f.getframerate()
        return frames / float(rate)

# --- Check 2: Detect silence percentage

def is_mostly_silent(path):
    audio = AudioSegment.from_file(path)
    silent_chunks = [chunk for chunk in audio if chunk.dBFS < SILENCE_THRESHOLD_DB]
    return len(silent_chunks) / len(audio) > SILENCE_PERCENT_LIMIT

# --- Check 3: File duplication via hash

def get_file_hash(path):
    hash_md5 = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

# --- Main Validator

def validate_uploaded_audio(file_path, uploaded_hashes):
    duration = get_audio_duration(file_path)
    if duration < MIN_DURATION_SECONDS or duration > MAX_DURATION_SECONDS:
        return False, f"Invalid duration: {duration:.1f} sec"

    if is_mostly_silent(file_path):
        return False, "Audio rejected: mostly silent"

    track_hash = get_file_hash(file_path)
    if track_hash in uploaded_hashes:
        return False, "Duplicate audio detected"

    return True, "Audio passed all checks"

# --- Example usage in Flask route:
# is_valid, reason = validate_uploaded_audio(file_path, known_hashes_from_db)
# if not is_valid: return jsonify({"error": reason}), 400

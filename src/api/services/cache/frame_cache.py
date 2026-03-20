from pathlib import Path
import hashlib

BASE = Path("uploads/frame_cache")
BASE.mkdir(parents=True, exist_ok=True)

def make_cache_key(payload: str) -> str:
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

def cache_path(key: str) -> Path:
    return BASE / f"{key}.bin"

def has_cache(key: str) -> bool:
    return cache_path(key).exists()

def write_cache(key: str, data: bytes):
    cache_path(key).write_bytes(data)

def read_cache(key: str):
    p = cache_path(key)
    if not p.exists():
        return None
    return p.read_bytes()

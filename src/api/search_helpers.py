"""SP-9: search hardening helpers.

In-memory rate limiter (no new dep) + block-list filter.
For multi-instance deployments later, swap _RATE_LIMIT_BUCKETS for Redis.
"""
import time
from collections import defaultdict, deque
from threading import Lock
from typing import Set

from flask import request, jsonify
from flask_jwt_extended import get_jwt_identity

# {key: deque[timestamps]} - sliding window per (ip, endpoint)
_RATE_LIMIT_BUCKETS = defaultdict(deque)
_RATE_LIMIT_LOCK = Lock()


def _client_ip() -> str:
    """Best-effort client IP. Trusts X-Forwarded-For first hop (Vercel/Railway proxy)."""
    xff = request.headers.get("X-Forwarded-For", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.remote_addr or "unknown"


def check_rate_limit(endpoint: str, max_per_min: int = 30):
    """Returns None if OK, else a Flask response (429).

    Usage at top of a route:
        rl = check_rate_limit("search", max_per_min=30)
        if rl is not None:
            return rl
    """
    ip = _client_ip()
    key = f"{ip}:{endpoint}"
    now = time.time()
    cutoff = now - 60.0

    with _RATE_LIMIT_LOCK:
        bucket = _RATE_LIMIT_BUCKETS[key]
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= max_per_min:
            retry_after = int(60 - (now - bucket[0])) + 1
            return jsonify({
                "error": "Rate limit exceeded",
                "retry_after_seconds": retry_after,
            }), 429
        bucket.append(now)

    # Periodic cleanup so dict doesnt grow unbounded.
    if len(_RATE_LIMIT_BUCKETS) > 10000:
        with _RATE_LIMIT_LOCK:
            stale = [k for k, b in _RATE_LIMIT_BUCKETS.items() if not b]
            for k in stale:
                _RATE_LIMIT_BUCKETS.pop(k, None)

    return None


def blocked_user_ids(viewer_id) -> Set[int]:
    """Return set of user ids that should be excluded from search results
    for this viewer: users they blocked, plus users who blocked them.
    Symmetric on purpose - if A blocked B, neither sees the other.
    """
    if not viewer_id:
        return set()
    try:
        from api.models import Block
        viewer_id = int(viewer_id)
        rows = Block.query.filter(
            (Block.blocker_id == viewer_id) | (Block.blocked_id == viewer_id)
        ).all()
        ids = set()
        for b in rows:
            if b.blocker_id == viewer_id:
                ids.add(b.blocked_id)
            else:
                ids.add(b.blocker_id)
        return ids
    except Exception:
        return set()

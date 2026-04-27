"""
Live stream endpoints for DJMixer broadcast feature.

Currently stubs — return success without actually starting/stopping streams.
When real RTMP infrastructure ships, replace these with real implementations.
The frontend (DJMixer.js) calls these on Go Live / Stop buttons.
"""
from flask import Blueprint, request, jsonify

live_stream_bp = Blueprint("live_stream", __name__)


@live_stream_bp.route("/api/live-stream/start-rtmp", methods=["POST"])
def start_rtmp():
    """
    Start an RTMP stream to an external destination (Twitch, YouTube).
    Stub — real implementation requires:
      - Server-side RTMP relay (e.g., Nginx-RTMP, Wowza, or custom MediaMTX)
      - User-supplied stream keys per destination
      - Stream session tracking in DB
    """
    data = request.get_json(silent=True) or {}
    destination = data.get("destination", "unknown")
    title = data.get("title", "")
    return jsonify({
        "ok": True,
        "stub": True,
        "destination": destination,
        "title": title,
        "note": "RTMP relay not yet wired. Frontend can proceed.",
    }), 200


@live_stream_bp.route("/api/live-stream/create", methods=["POST"])
def create_stream():
    """
    Create a StreamPireX-native live stream (audio-only DJ broadcast).
    Stub — real implementation requires:
      - LiveStream model row insert
      - WebRTC or HLS publishing endpoint
      - Listener-count tracking
    """
    data = request.get_json(silent=True) or {}
    title = data.get("title", "Untitled Stream")
    stream_type = data.get("type", "audio")
    is_live = data.get("is_live", True)
    return jsonify({
        "ok": True,
        "stub": True,
        "stream_id": None,
        "title": title,
        "type": stream_type,
        "is_live": is_live,
        "note": "Native live-stream backend not yet wired. Frontend can proceed.",
    }), 200


@live_stream_bp.route("/api/live-stream/stop", methods=["POST"])
def stop_stream():
    """
    Stop a previously started stream (any destination).
    Stub — real implementation tears down the relay session and updates DB.
    """
    data = request.get_json(silent=True) or {}
    destination = data.get("destination", "unknown")
    return jsonify({
        "ok": True,
        "stub": True,
        "destination": destination,
        "note": "Stream stop call accepted (no real session to tear down yet).",
    }), 200

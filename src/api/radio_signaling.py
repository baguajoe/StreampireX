# =============================================================================
# radio_signaling.py — WebSocket Signaling for WebRTC Radio Broadcasting
# Uses Flask-SocketIO (works with Railway's WebSocket support)
# Add to app.py:
#   from api.radio_signaling import register_radio_socketio
#   register_radio_socketio(socketio)
#
# Railway deployment note: set WEB_CONCURRENCY=1, use gevent or eventlet worker
# =============================================================================

from flask_socketio import SocketIO, emit, join_room, leave_room, rooms
from flask import request
import json

# Track active broadcasters: { station_id: { sid, mode } }
_broadcasters = {}
# Track viewers per station: { station_id: set(sid) }
_viewers = {}


def register_radio_socketio(socketio: SocketIO):

    @socketio.on("connect", namespace="/ws/radio")
    def on_connect(auth=None):
        """CRIT-1 (RAD-1): the prior version had no auth at all, allowing
        any socket to call broadcaster_join and hijack live streams.
        Now requires a JWT in the connect handshake and stores the
        authenticated user_id in the socket session.
        """
        from flask import session as flask_session
        from flask_jwt_extended import decode_token

        # Token can come from auth dict (preferred) or query string fallback.
        token = None
        if isinstance(auth, dict):
            token = auth.get("token")
        if not token:
            token = request.args.get("token")
        if not token:
            return False  # Reject connection

        try:
            decoded = decode_token(token)
            uid = decoded.get("sub") or decoded.get("identity")
            if not uid:
                return False
            # Store on the socketio session for later events
            flask_session["radio_user_id"] = int(uid)
        except Exception:
            return False

    @socketio.on("disconnect", namespace="/ws/radio")
    def on_disconnect():
        sid = request.sid
        # Clean up broadcaster
        for station_id, bc in list(_broadcasters.items()):
            if bc.get("sid") == sid:
                del _broadcasters[station_id]
                # Notify viewers the stream ended
                socketio.emit("stream_ended", {}, room=f"station_{station_id}_viewers", namespace="/ws/radio")
                _update_viewer_count(socketio, station_id)
                break
        # Clean up viewer
        for station_id, viewer_set in list(_viewers.items()):
            if sid in viewer_set:
                viewer_set.discard(sid)
                _update_viewer_count(socketio, station_id)
                break

    # ── BROADCASTER events ────────────────────────────────────────────────────

    @socketio.on("broadcaster_join", namespace="/ws/radio")
    def on_broadcaster_join(data):
        """Broadcaster announces themselves as live.

        CRIT-1 (RAD-1): now verifies the connected user OWNS the station
        before accepting the broadcaster_join. Without this check, anyone
        could hijack any live radio stream.
        """
        from flask import session as flask_session
        from api.models import RadioStation

        station_id = str(data.get("station_id"))
        mode = data.get("mode", "audio")  # audio | video
        sid = request.sid

        # CRIT-1 (RAD-1): authorize broadcaster
        user_id = flask_session.get("radio_user_id")
        if not user_id:
            emit("error", {"message": "Not authenticated"})
            return
        try:
            station = RadioStation.query.filter_by(
                id=int(station_id), user_id=int(user_id)
            ).first()
        except (TypeError, ValueError):
            station = None
        if not station:
            emit("error", {"message": "Not authorized to broadcast on this station"})
            return

        _broadcasters[station_id] = {"sid": sid, "mode": mode, "user_id": user_id}
        join_room(f"station_{station_id}_broadcast")

        # If viewers already waiting, notify them
        if station_id in _viewers and _viewers[station_id]:
            for viewer_sid in list(_viewers[station_id]):
                socketio.emit("broadcaster_joined", {"station_id": station_id, "mode": mode},
                              room=viewer_sid, namespace="/ws/radio")

        emit("broadcaster_ready", {"station_id": station_id})

    @socketio.on("broadcaster_offer", namespace="/ws/radio")
    def on_broadcaster_offer(data):
        """Broadcaster sends WebRTC offer to a specific viewer."""
        viewer_sid = data.get("viewer_sid")
        sdp = data.get("sdp")
        station_id = str(data.get("station_id"))
        socketio.emit("offer", {"sdp": sdp, "station_id": station_id},
                      room=viewer_sid, namespace="/ws/radio")

    @socketio.on("broadcaster_ice", namespace="/ws/radio")
    def on_broadcaster_ice(data):
        """Broadcaster sends ICE candidate to specific viewer."""
        viewer_sid = data.get("viewer_sid")
        candidate = data.get("candidate")
        socketio.emit("ice_candidate", {"candidate": candidate},
                      room=viewer_sid, namespace="/ws/radio")

    # ── VIEWER events ─────────────────────────────────────────────────────────

    @socketio.on("viewer_join", namespace="/ws/radio")
    def on_viewer_join(data):
        """Viewer joins a station's live stream."""
        station_id = str(data.get("station_id"))
        sid = request.sid

        join_room(f"station_{station_id}_viewers")
        if station_id not in _viewers:
            _viewers[station_id] = set()
        _viewers[station_id].add(sid)

        _update_viewer_count(socketio, station_id)

        # If broadcaster is live, tell them a new viewer joined
        bc = _broadcasters.get(station_id)
        if bc:
            socketio.emit("viewer_joined", {"viewer_sid": sid, "station_id": station_id},
                          room=bc["sid"], namespace="/ws/radio")
            # Also send broadcaster info back to viewer
            emit("broadcaster_joined", {"station_id": station_id, "mode": bc["mode"]})
        else:
            emit("no_broadcaster", {"station_id": station_id})

    @socketio.on("viewer_answer", namespace="/ws/radio")
    def on_viewer_answer(data):
        """Viewer sends WebRTC answer back to broadcaster."""
        station_id = str(data.get("station_id"))
        sdp = data.get("sdp")
        bc = _broadcasters.get(station_id)
        if bc:
            socketio.emit("answer", {"sdp": sdp, "viewer_sid": request.sid},
                          room=bc["sid"], namespace="/ws/radio")

    @socketio.on("viewer_ice", namespace="/ws/radio")
    def on_viewer_ice(data):
        """Viewer sends ICE candidate to broadcaster."""
        station_id = str(data.get("station_id"))
        candidate = data.get("candidate")
        bc = _broadcasters.get(station_id)
        if bc:
            socketio.emit("ice_candidate", {"candidate": candidate, "viewer_sid": request.sid},
                          room=bc["sid"], namespace="/ws/radio")

    # ── CHAT ─────────────────────────────────────────────────────────────────

    @socketio.on("chat_message", namespace="/ws/radio")
    def on_chat(data):
        """Broadcast chat message to all in station room.

        HIGH-B1 (RAD-4): the prior version accepted a client-supplied
        'from' label, letting any listener post chat messages tagged
        as "Host" or another user's name. Username is now resolved
        server-side from the JWT-authenticated socket session.
        """
        from flask import session as flask_session
        from api.models import User

        station_id = str(data.get("station_id"))
        message = data.get("message", "")[:500]  # max 500 chars

        # RAD-4: server-side username lookup. Reject if not authenticated.
        user_id = flask_session.get("radio_user_id")
        if not user_id:
            emit("error", {"message": "Not authenticated"})
            return
        user = User.query.get(user_id)
        from_label = user.username if user and user.username else f"user_{user_id}"

        # Broadcast to all viewers + broadcaster
        socketio.emit("chat", {
            "from": from_label,
            "user_id": user_id,
            "message": message,
            "time": __import__("datetime").datetime.utcnow().strftime("%H:%M")
        }, room=f"station_{station_id}_viewers", namespace="/ws/radio")

        bc = _broadcasters.get(station_id)
        if bc:
            socketio.emit("chat", {
                "from": from_label,
                "user_id": user_id,
                "message": message,
            }, room=bc["sid"], namespace="/ws/radio")


def _update_viewer_count(socketio, station_id):
    count = len(_viewers.get(station_id, set()))
    bc = _broadcasters.get(station_id)
    if bc:
        socketio.emit("viewer_count", {"count": count},
                      room=bc["sid"], namespace="/ws/radio")
    socketio.emit("viewer_count", {"count": count},
                  room=f"station_{station_id}_viewers", namespace="/ws/radio")

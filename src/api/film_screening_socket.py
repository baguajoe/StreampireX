# =============================================================================
# film_screening_socket.py — Synchronized Theatre Screening Socket Events
# =============================================================================
# Location: src/api/film_screening_socket.py
#
# Add to app.py (in init_socketio or after socketio is initialized):
#   from api.film_screening_socket import register_screening_events
#   register_screening_events(socketio)
# =============================================================================

from flask_socketio import emit, join_room, leave_room
from flask import request
from datetime import datetime

# Track active screening rooms
# { "screening_123": { "host_sid": "abc", "viewers": {"sid": {"username": "...", "user_id": ...}}, "state": {"playing": False, "timestamp": 0} } }
screening_rooms = {}


def register_screening_events(socketio):
    """Register all screening socket events with the socketio instance."""

    # ── JOIN SCREENING ROOM ────────────────────────────────────────────────────
    @socketio.on("join_screening")
    def on_join_screening(data):
        """
        Fan or filmmaker joins a screening room.
        data: { screening_id, user_id, username, is_host }
        """
        screening_id = str(data.get("screening_id", ""))
        user_id      = data.get("user_id")
        username     = data.get("username", "Guest")
        is_host      = data.get("is_host", False)
        room_key     = f"screening_{screening_id}"

        join_room(room_key)

        # Initialize room if first person
        if room_key not in screening_rooms:
            screening_rooms[room_key] = {
                "host_sid":  None,
                "viewers":   {},
                "state": {
                    "playing":   False,
                    "timestamp": 0,
                    "started_at": None,
                }
            }

        room = screening_rooms[room_key]

        # Register as host or viewer
        if is_host:
            room["host_sid"] = request.sid
            print(f"🎬 Host {username} joined screening room {room_key}")
        else:
            room["viewers"][request.sid] = {
                "user_id":  user_id,
                "username": username,
                "joined_at": datetime.utcnow().isoformat(),
            }
            print(f"👤 Viewer {username} joined screening room {room_key}")

        # Send current playback state to the new joiner
        emit("screening_state", {
            "playing":   room["state"]["playing"],
            "timestamp": _get_current_timestamp(room),
            "viewer_count": len(room["viewers"]),
            "host_online": room["host_sid"] is not None,
        })

        # Notify everyone of updated viewer count
        emit("screening_viewers_update", {
            "viewer_count": len(room["viewers"]),
            "viewers": [
                {"username": v["username"], "user_id": v["user_id"]}
                for v in room["viewers"].values()
            ]
        }, room=room_key)

    # ── LEAVE SCREENING ROOM ───────────────────────────────────────────────────
    @socketio.on("leave_screening")
    def on_leave_screening(data):
        screening_id = str(data.get("screening_id", ""))
        room_key     = f"screening_{screening_id}"

        leave_room(room_key)

        if room_key in screening_rooms:
            room = screening_rooms[room_key]
            room["viewers"].pop(request.sid, None)

            if room["host_sid"] == request.sid:
                room["host_sid"] = None
                emit("screening_host_left", {}, room=room_key)

            emit("screening_viewers_update", {
                "viewer_count": len(room["viewers"]),
            }, room=room_key)

    # ── HOST: PLAY ─────────────────────────────────────────────────────────────
    @socketio.on("screening_play")
    def on_screening_play(data):
        """
        Host pressed play. Sync all viewers.
        data: { screening_id, timestamp }
        """
        screening_id = str(data.get("screening_id", ""))
        timestamp    = float(data.get("timestamp", 0))
        room_key     = f"screening_{screening_id}"

        if room_key not in screening_rooms:
            return

        room = screening_rooms[room_key]

        # Only host can control playback
        if request.sid != room["host_sid"]:
            return

        room["state"]["playing"]    = True
        room["state"]["timestamp"]  = timestamp
        room["state"]["started_at"] = datetime.utcnow().isoformat()

        print(f"▶ Screening {screening_id} PLAY at {timestamp}s")

        # Broadcast to ALL viewers in the room (skip host)
        emit("screening_sync_play", {
            "timestamp":  timestamp,
            "server_time": datetime.utcnow().isoformat(),
        }, room=room_key, skip_sid=request.sid)

    # ── HOST: PAUSE ────────────────────────────────────────────────────────────
    @socketio.on("screening_pause")
    def on_screening_pause(data):
        """
        Host paused. Pause all viewers.
        data: { screening_id, timestamp }
        """
        screening_id = str(data.get("screening_id", ""))
        timestamp    = float(data.get("timestamp", 0))
        room_key     = f"screening_{screening_id}"

        if room_key not in screening_rooms:
            return

        room = screening_rooms[room_key]

        if request.sid != room["host_sid"]:
            return

        room["state"]["playing"]   = False
        room["state"]["timestamp"] = timestamp

        print(f"⏸ Screening {screening_id} PAUSE at {timestamp}s")

        emit("screening_sync_pause", {
            "timestamp": timestamp,
        }, room=room_key, skip_sid=request.sid)

    # ── HOST: SEEK ─────────────────────────────────────────────────────────────
    @socketio.on("screening_seek")
    def on_screening_seek(data):
        """
        Host seeked to a new position.
        data: { screening_id, timestamp }
        """
        screening_id = str(data.get("screening_id", ""))
        timestamp    = float(data.get("timestamp", 0))
        room_key     = f"screening_{screening_id}"

        if room_key not in screening_rooms:
            return

        room = screening_rooms[room_key]

        if request.sid != room["host_sid"]:
            return

        room["state"]["timestamp"] = timestamp

        print(f"⏩ Screening {screening_id} SEEK to {timestamp}s")

        emit("screening_sync_seek", {
            "timestamp": timestamp,
        }, room=room_key, skip_sid=request.sid)

    # ── HOST: END FILM / START Q&A ─────────────────────────────────────────────
    @socketio.on("screening_end")
    def on_screening_end(data):
        """
        Host ended the film. Open Q&A for everyone.
        data: { screening_id }
        """
        screening_id = str(data.get("screening_id", ""))
        room_key     = f"screening_{screening_id}"

        if room_key not in screening_rooms:
            return

        room = screening_rooms[room_key]

        if request.sid != room["host_sid"]:
            return

        room["state"]["playing"] = False

        print(f"🎬 Screening {screening_id} ENDED — Q&A mode")

        emit("screening_film_ended", {
            "message": "The film has ended. Q&A is now open!",
        }, room=room_key)

    # ── HOST: ANNOUNCE ─────────────────────────────────────────────────────────
    @socketio.on("screening_announce")
    def on_screening_announce(data):
        """
        Host sends an announcement to all viewers.
        data: { screening_id, message }
        """
        screening_id = str(data.get("screening_id", ""))
        message      = data.get("message", "")
        room_key     = f"screening_{screening_id}"

        if room_key not in screening_rooms:
            return

        room = screening_rooms[room_key]

        if request.sid != room["host_sid"]:
            return

        emit("screening_announcement", {
            "message":   message,
            "timestamp": datetime.utcnow().isoformat(),
        }, room=room_key)

    # ── CHAT MESSAGE ───────────────────────────────────────────────────────────
    @socketio.on("screening_chat")
    def on_screening_chat(data):
        """
        Fan or host sends a chat message.
        data: { screening_id, username, message, user_id }
        """
        screening_id = str(data.get("screening_id", ""))
        room_key     = f"screening_{screening_id}"
        username     = data.get("username", "Guest")
        message      = data.get("message", "").strip()

        if not message:
            return

        room    = screening_rooms.get(room_key, {})
        is_host = request.sid == room.get("host_sid")

        emit("screening_chat_message", {
            "username":  username,
            "message":   message,
            "is_host":   is_host,
            "user_id":   data.get("user_id"),
            "timestamp": datetime.utcnow().strftime("%I:%M %p"),
        }, room=room_key)

    # ── Q&A: SUBMIT QUESTION ───────────────────────────────────────────────────
    @socketio.on("screening_question")
    def on_screening_question(data):
        """
        Fan submits a Q&A question.
        data: { screening_id, username, question, user_id }
        """
        screening_id = str(data.get("screening_id", ""))
        room_key     = f"screening_{screening_id}"

        emit("screening_new_question", {
            "id":        f"q_{request.sid}_{datetime.utcnow().timestamp()}",
            "username":  data.get("username", "Guest"),
            "question":  data.get("question", ""),
            "user_id":   data.get("user_id"),
            "votes":     0,
            "answered":  False,
            "timestamp": datetime.utcnow().strftime("%I:%M %p"),
        }, room=room_key)

    # ── Q&A: VOTE QUESTION ─────────────────────────────────────────────────────
    @socketio.on("screening_vote_question")
    def on_vote_question(data):
        """
        Fan upvotes a question.
        data: { screening_id, question_id }
        """
        screening_id = str(data.get("screening_id", ""))
        room_key     = f"screening_{screening_id}"

        emit("screening_question_voted", {
            "question_id": data.get("question_id"),
        }, room=room_key)

    # ── Q&A: MARK ANSWERED ────────────────────────────────────────────────────
    @socketio.on("screening_answer_question")
    def on_answer_question(data):
        """
        Host marks a question as answered.
        data: { screening_id, question_id }
        """
        screening_id = str(data.get("screening_id", ""))
        room_key     = f"screening_{screening_id}"

        if room_key not in screening_rooms:
            return

        if request.sid != screening_rooms[room_key].get("host_sid"):
            return

        emit("screening_question_answered", {
            "question_id": data.get("question_id"),
        }, room=room_key)

    # ── SYNC REQUEST (viewer asks for current state) ───────────────────────────
    @socketio.on("screening_sync_request")
    def on_sync_request(data):
        """
        Viewer requests current playback position (e.g. late joiner).
        data: { screening_id }
        """
        screening_id = str(data.get("screening_id", ""))
        room_key     = f"screening_{screening_id}"

        if room_key not in screening_rooms:
            return

        room = screening_rooms[room_key]

        emit("screening_state", {
            "playing":     room["state"]["playing"],
            "timestamp":   _get_current_timestamp(room),
            "viewer_count": len(room["viewers"]),
            "host_online": room["host_sid"] is not None,
        })

    # ── DISCONNECT CLEANUP ─────────────────────────────────────────────────────
    # Note: Add this to your existing disconnect handler in socketio.py:
    # _remove_sid_from_screening_rooms(request.sid)


def _get_current_timestamp(room):
    """
    Calculate current video timestamp accounting for elapsed time since play.
    """
    state = room["state"]
    if not state["playing"] or not state["started_at"]:
        return state["timestamp"]

    # Add elapsed seconds since play was pressed
    started = datetime.fromisoformat(state["started_at"])
    elapsed = (datetime.utcnow() - started).total_seconds()
    return state["timestamp"] + elapsed


def remove_sid_from_screening_rooms(sid):
    """
    Call this from your main disconnect handler in socketio.py.
    Add this line to the disconnect event:
        from api.film_screening_socket import remove_sid_from_screening_rooms
        remove_sid_from_screening_rooms(request.sid)
    """
    for room_key, room in list(screening_rooms.items()):
        if sid == room.get("host_sid"):
            room["host_sid"] = None
            emit("screening_host_left", {}, room=room_key)

        if sid in room.get("viewers", {}):
            room["viewers"].pop(sid, None)
            emit("screening_viewers_update", {
                "viewer_count": len(room["viewers"]),
            }, room=room_key)

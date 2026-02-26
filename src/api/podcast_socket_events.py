"""
=============================================================================
podcast_socket_events.py — Socket.IO Events for Podcast Studio
=============================================================================
Location: src/api/podcast_socket_events.py

Register with: register_podcast_events(socketio)
Call this in your app.py after creating the SocketIO instance.

Handles:
  - Room creation/joining with invite codes
  - WebRTC signaling (offer/answer/ICE)
  - Recording sync timestamps
  - Guest management
=============================================================================
"""

from flask_socketio import emit, join_room, leave_room, Namespace


class PodcastNamespace(Namespace):
    """Socket.IO namespace for podcast recording sessions."""

    # Active sessions: { session_id: { host_sid, host_name, host_id, invite_code, guests: {} } }
    sessions = {}

    def on_connect(self):
        print(f"[Podcast] Client connected: {self.sid if hasattr(self, 'sid') else 'unknown'}")

    def on_disconnect(self):
        # Remove from any sessions
        for session_id, session in list(self.sessions.items()):
            # Check if disconnected user was a guest
            for guest_id, guest in list(session.get("guests", {}).items()):
                if guest.get("socket_id") == getattr(self, "sid", None):
                    del session["guests"][guest_id]
                    emit("guest_left", {"guestId": guest_id}, room=session_id)
                    print(f"[Podcast] Guest {guest.get('name')} left session {session_id}")
                    break

    def on_create_podcast_room(self, data):
        """Host creates a recording session."""
        session_id = data.get("sessionId")
        invite_code = data.get("inviteCode")
        host_name = data.get("hostName", "Host")
        host_id = data.get("hostId")

        join_room(session_id)

        self.sessions[session_id] = {
            "host_sid": getattr(self, "sid", None),
            "host_name": host_name,
            "host_id": host_id,
            "invite_code": invite_code,
            "guests": {},
            "is_recording": False,
        }

        print(f"[Podcast] Session created: {session_id} by {host_name}")

    def on_join_podcast_room(self, data):
        """Guest joins a recording session."""
        session_id = data.get("sessionId")
        invite_code = data.get("inviteCode")
        guest_name = data.get("guestName", "Guest")
        guest_id = data.get("guestId")

        session = self.sessions.get(session_id)

        if not session:
            emit("invalid_code", {"error": "Session not found"})
            return

        if session["invite_code"] and invite_code != session["invite_code"]:
            emit("invalid_code", {"error": "Invalid invite code"})
            return

        if len(session["guests"]) >= 3:
            emit("invalid_code", {"error": "Session is full (max 3 guests)"})
            return

        join_room(session_id)

        session["guests"][guest_id] = {
            "name": guest_name,
            "socket_id": getattr(self, "sid", None),
        }

        # Tell guest about the host
        emit("session_info", {
            "hostName": session["host_name"],
            "sessionId": session_id,
            "isRecording": session.get("is_recording", False),
        })

        # Tell host about the guest
        emit("guest_joined", {
            "guestId": guest_id,
            "guestName": guest_name,
            "guestSocketId": getattr(self, "sid", None),
        }, room=session_id, include_self=False)

        print(f"[Podcast] {guest_name} joined session {session_id}")

        # If already recording, tell the guest to start
        if session.get("is_recording"):
            emit("recording_started", {"timestamp": session.get("record_start_time", 0)})

    def on_podcast_offer(self, data):
        """Forward WebRTC offer to target peer."""
        session_id = data.get("sessionId")
        target = data.get("targetSocketId")
        from_id = data.get("fromId")

        emit("podcast_offer", {
            "offer": data.get("offer"),
            "from": getattr(self, "sid", None),
            "fromId": from_id,
        }, to=target)

    def on_podcast_answer(self, data):
        """Forward WebRTC answer to target peer."""
        target = data.get("targetSocketId")
        from_id = data.get("fromId")

        emit("podcast_answer", {
            "answer": data.get("answer"),
            "fromId": from_id,
        }, to=target)

    def on_podcast_ice(self, data):
        """Forward ICE candidate to target peer."""
        target = data.get("targetSocketId")
        from_id = data.get("fromId")

        emit("podcast_ice", {
            "candidate": data.get("candidate"),
            "fromId": from_id,
        }, to=target)

    def on_recording_started(self, data):
        """Host started recording — notify all guests to start local recording."""
        session_id = data.get("sessionId")
        timestamp = data.get("timestamp", 0)

        session = self.sessions.get(session_id)
        if session:
            session["is_recording"] = True
            session["record_start_time"] = timestamp

        emit("recording_started", {
            "timestamp": timestamp,
        }, room=session_id, include_self=False)

        print(f"[Podcast] Recording started in session {session_id}")

    def on_recording_stopped(self, data):
        """Host stopped recording — notify all guests to stop and upload."""
        session_id = data.get("sessionId")

        session = self.sessions.get(session_id)
        if session:
            session["is_recording"] = False

        emit("recording_stopped", {}, room=session_id, include_self=False)

        print(f"[Podcast] Recording stopped in session {session_id}")


def register_podcast_events(socketio):
    """Register the podcast namespace with your SocketIO instance.

    Usage in app.py:
        from api.podcast_socket_events import register_podcast_events
        register_podcast_events(socketio)
    """
    socketio.on_namespace(PodcastNamespace("/podcast"))
    print("[Podcast] Socket.IO namespace /podcast registered")
# Alias for app.py import compatibility
register_podcast_socket_events = register_podcast_events

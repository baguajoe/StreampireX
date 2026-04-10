"""
script_collab_ws.py — WebSocket collaboration server for SPX Script
Add to your Flask app using flask-sock or gevent-websocket.

Install: pip install flask-sock

In app.py:
  from flask_sock import Sock
  from .routes.script_collab_ws import register_collab_ws
  sock = Sock(app)
  register_collab_ws(sock)
"""

import json
import threading
from datetime import datetime

# room_id → set of (ws, user_info) connections
_rooms = {}
_rooms_lock = threading.Lock()


def register_collab_ws(sock):
    @sock.route("/ws/script/<script_id>")
    def script_collab(ws, script_id):
        user_id = None
        user_name = "Writer"
        user_color = "#00ffc8"

        try:
            # Read join message
            raw = ws.receive(timeout=10)
            if raw:
                msg = json.loads(raw)
                if msg.get("type") == "join":
                    user_id = msg.get("userId", f"anon_{id(ws)}")
                    user_name = msg.get("userName", "Writer")
                    user_color = msg.get("color", "#00ffc8")

            if not user_id:
                user_id = f"anon_{id(ws)}"

            user_info = {
                "userId": user_id,
                "userName": user_name,
                "color": user_color,
                "joinedAt": datetime.utcnow().isoformat(),
            }

            # Register in room
            with _rooms_lock:
                if script_id not in _rooms:
                    _rooms[script_id] = {}
                _rooms[script_id][user_id] = {"ws": ws, "info": user_info}

            # Broadcast join to everyone else
            _broadcast(script_id, user_id, {
                "type": "user_joined",
                "userId": user_id,
                "userName": user_name,
                "color": user_color,
            })

            # Send current presence list to new joiner
            _send_presence(ws, script_id, user_id)

            # Main message loop
            while True:
                raw = ws.receive(timeout=60)
                if raw is None:
                    break

                try:
                    msg = json.loads(raw)
                except json.JSONDecodeError:
                    continue

                msg_type = msg.get("type")

                if msg_type == "ping":
                    ws.send(json.dumps({"type": "pong"}))

                elif msg_type == "element_edit":
                    # Broadcast edit to all other collaborators in room
                    _broadcast(script_id, user_id, {
                        "type": "element_edit",
                        "userId": user_id,
                        "elementId": msg.get("elementId"),
                        "text": msg.get("text"),
                        "elementType": msg.get("elementType"),
                        "timestamp": msg.get("timestamp"),
                    })

                elif msg_type == "cursor_move":
                    _broadcast(script_id, user_id, {
                        "type": "cursor_move",
                        "userId": user_id,
                        "elementId": msg.get("elementId"),
                        "offset": msg.get("offset"),
                    })

                elif msg_type == "comment_add":
                    _broadcast(script_id, user_id, {
                        "type": "comment_add",
                        "comment": msg.get("comment"),
                    })

                elif msg_type == "comment_resolve":
                    _broadcast(script_id, user_id, {
                        "type": "comment_resolve",
                        "commentId": msg.get("commentId"),
                        "userId": user_id,
                    })

                elif msg_type == "comment_reply":
                    _broadcast(script_id, user_id, {
                        "type": "comment_reply",
                        "commentId": msg.get("commentId"),
                        "reply": msg.get("reply"),
                    })

                elif msg_type == "comment_delete":
                    _broadcast(script_id, user_id, {
                        "type": "comment_delete",
                        "commentId": msg.get("commentId"),
                    })

                elif msg_type == "leave":
                    break

        except Exception as e:
            pass

        finally:
            # Clean up
            with _rooms_lock:
                if script_id in _rooms and user_id in _rooms[script_id]:
                    del _rooms[script_id][user_id]
                    if not _rooms[script_id]:
                        del _rooms[script_id]

            if user_id:
                _broadcast(script_id, user_id, {
                    "type": "user_left",
                    "userId": user_id,
                    "userName": user_name,
                })


def _broadcast(script_id, sender_id, message):
    """Send message to all connections in room except sender."""
    with _rooms_lock:
        room = _rooms.get(script_id, {})
        connections = [(uid, conn) for uid, conn in room.items() if uid != sender_id]

    payload = json.dumps(message)
    for uid, conn in connections:
        try:
            conn["ws"].send(payload)
        except Exception:
            pass


def _send_presence(ws, script_id, exclude_id):
    """Send full presence list to a single connection."""
    with _rooms_lock:
        room = _rooms.get(script_id, {})
        collaborators = [
            conn["info"] for uid, conn in room.items() if uid != exclude_id
        ]
    try:
        ws.send(json.dumps({"type": "presence", "collaborators": collaborators}))
    except Exception:
        pass

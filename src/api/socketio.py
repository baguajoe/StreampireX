# src/api/socketio.py

from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import request
from datetime import datetime

socketio = SocketIO(cors_allowed_origins="*", allow_credentials=True)

# -----------------------------------------------------------------------------
# In-memory tracking
# -----------------------------------------------------------------------------

# WebRTC signaling rooms (simple list of SIDs)
active_rooms = {}  # { room_id: [sid, sid, ...] }

# Gamers chat rooms
chat_rooms = {}    # { stream_id: { sid: user_info, ... } }

# Team rooms
team_rooms = {}    # { room_id: { sid: user_info, ... } }

# Podcast collab rooms
podcast_collab_rooms = {}  # { room_id: { sid: user_info, ... } }


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

def _safe_room(room_id: str):
    return (room_id or "").strip()

def _emit_team_participants(room_id: str):
    """Broadcast full participant list to everyone in a team room."""
    if room_id in team_rooms:
        participants = list(team_rooms[room_id].values())
        emit("team_room_participants", participants, room=room_id)

def _set_team_host_if_needed(room_id: str):
    """Ensure exactly one host exists when room has members."""
    if room_id not in team_rooms or not team_rooms[room_id]:
        return

    # If any host exists, keep it.
    any_host = any(u.get("role") == "host" for u in team_rooms[room_id].values())
    if any_host:
        return

    # Promote first sid to host
    first_sid = next(iter(team_rooms[room_id]))
    team_rooms[room_id][first_sid]["role"] = "host"
    emit("host-transferred", {"newHostId": team_rooms[room_id][first_sid].get("id")}, room=room_id)

def _remove_sid_from_webrtc_rooms(sid: str):
    """Remove sid from active WebRTC rooms and notify peers."""
    for room_id, sids in list(active_rooms.items()):
        if sid in sids:
            sids.remove(sid)
            emit("user-left", {"userId": sid, "sid": sid}, room=room_id, skip_sid=sid)
            if not sids:
                del active_rooms[room_id]
                print(f"🗑️  Cleaned up empty WebRTC room: {room_id}")

def _remove_sid_from_chat_rooms(sid: str):
    """Remove sid from chat rooms and broadcast updated roster."""
    for stream_id, users in list(chat_rooms.items()):
        if sid in users:
            user_info = users.pop(sid, {})
            username = user_info.get("gamertag") or user_info.get("username", "Someone")

            emit("receive_message", {
                "type": "system",
                "message": f"🔴 {username} disconnected",
                "timestamp": datetime.utcnow().isoformat()
            }, room=stream_id)

            if users:
                users_list = list(users.values())
                emit("users_update", users_list, room=stream_id)

                active_games = list(set(
                    u.get("current_game") for u in users_list if u.get("current_game")
                ))
                emit("games_update", active_games, room=stream_id)
            else:
                del chat_rooms[stream_id]
                print(f"🗑️  Cleaned up empty chat room: {stream_id}")

def _remove_sid_from_team_rooms(sid: str):
    """Remove sid from team rooms, transfer host if needed, broadcast roster."""
    for room_id, users in list(team_rooms.items()):
        if sid in users:
            user_info = users.pop(sid, {})
            user_name = user_info.get("name", "Someone")
            was_host = user_info.get("role") == "host"

            if users:
                if was_host:
                    # Promote next sid
                    next_sid = next(iter(users))
                    users[next_sid]["role"] = "host"
                    emit("host-transferred", {"newHostId": users[next_sid].get("id")}, room=room_id)
                    print(f"👑 Auto-transferred host to {users[next_sid].get('name')} in {room_id}")

                _emit_team_participants(room_id)
            else:
                del team_rooms[room_id]
                print(f"🗑️  Cleaned up empty team room: {room_id}")

            print(f"👋 {user_name} removed from team room {room_id} via disconnect")

def _remove_sid_from_podcast_rooms(sid: str):
    """Remove sid from podcast collab rooms and broadcast updated roster."""
    for room_id, users in list(podcast_collab_rooms.items()):
        if sid in users:
            user_info = users.pop(sid, {})
            user_name = user_info.get("userName", "Someone")

            if users:
                emit("podcast_collab_user_left", {
                    "userId": user_info.get("userId"),
                    "userName": user_name,
                    "sid": sid,
                    "participants": list(users.values())
                }, room=f"podcast_{room_id}")
            else:
                del podcast_collab_rooms[room_id]
                print(f"🗑️  Cleaned up empty podcast room: {room_id}")

            print(f"🎙️ {user_name} removed from podcast collab room {room_id} via disconnect")


# -----------------------------------------------------------------------------
# Core connect/disconnect
# -----------------------------------------------------------------------------

@socketio.on("connect")
def handle_connect():
    print(f"✅ Client connected: {request.sid}")
    emit("connected", {"sid": request.sid})

@socketio.on("disconnect")
def handle_disconnect():
    """Unified disconnect cleanup for ALL room types."""
    sid = request.sid
    print(f"❌ Client disconnected: {sid}")

    _remove_sid_from_webrtc_rooms(sid)
    _remove_sid_from_chat_rooms(sid)
    _remove_sid_from_team_rooms(sid)
    _remove_sid_from_podcast_rooms(sid)


# -----------------------------------------------------------------------------
# 0) WebRTC generic room membership + signaling (multi-peer)
#    NOTE: For stable multi-peer, client should include targetSid where possible.
# -----------------------------------------------------------------------------

@socketio.on("join_webrtc_room")
def handle_join_webrtc_room(data):
    room_id = _safe_room(data.get("roomId"))
    user_id = data.get("userId")
    user_name = data.get("userName", "User")

    if not room_id:
        return

    join_room(room_id)

    if room_id not in active_rooms:
        active_rooms[room_id] = []

    if request.sid not in active_rooms[room_id]:
        active_rooms[room_id].append(request.sid)

    # 1) Tell JOINER who is already in the room (so they can create offers)
    existing_sids = [s for s in active_rooms[room_id] if s != request.sid]
    emit("webrtc-existing-peers", {
        "roomId": room_id,
        "peers": existing_sids
    })

    # 2) Notify others that a new user joined (so they can create answers)
    emit("user-joined", {
        "userId": user_id,
        "userName": user_name,
        "sid": request.sid
    }, room=room_id, skip_sid=request.sid)

    print(f"✅ WebRTC: {user_name} joined {room_id} (sids={len(active_rooms[room_id])})")


@socketio.on("leave_webrtc_room")
def handle_leave_webrtc_room(data):
    room_id = _safe_room(data.get("roomId"))
    if not room_id:
        return

    if room_id in active_rooms and request.sid in active_rooms[room_id]:
        active_rooms[room_id].remove(request.sid)

        leave_room(room_id)

        emit("user-left", {"userId": request.sid, "sid": request.sid}, room=room_id, skip_sid=request.sid)

        if not active_rooms[room_id]:
            del active_rooms[room_id]
            print(f"🗑️  Cleaned up empty WebRTC room: {room_id}")

        print(f"👋 WebRTC: {request.sid} left {room_id}")


@socketio.on("offer")
def handle_offer(data):
    room_id = _safe_room(data.get("roomId"))
    offer = data.get("offer")
    target_sid = data.get("targetSid")  # recommended for multi-peer

    if not room_id or not offer:
        return

    payload = {"offer": offer, "from": request.sid, "roomId": room_id}

    if target_sid:
        emit("offer", payload, to=target_sid)
    else:
        emit("offer", payload, room=room_id, skip_sid=request.sid)

    print(f"📡 Offer relayed in {room_id} (target={target_sid or 'broadcast'})")


@socketio.on("answer")
def handle_answer(data):
    room_id = _safe_room(data.get("roomId"))
    answer = data.get("answer")
    target_sid = data.get("targetSid")  # required if you want stable multi-peer

    if not room_id or not answer:
        return

    payload = {"answer": answer, "from": request.sid, "roomId": room_id}

    if target_sid:
        emit("answer", payload, to=target_sid)
    else:
        emit("answer", payload, room=room_id, skip_sid=request.sid)

    print(f"📡 Answer relayed in {room_id} (target={target_sid or 'broadcast'})")


@socketio.on("ice-candidate")
def handle_ice_candidate(data):
    room_id = _safe_room(data.get("roomId"))
    candidate = data.get("candidate")
    target_sid = data.get("targetSid")  # recommended for multi-peer

    if not room_id or not candidate:
        return

    payload = {"candidate": candidate, "from": request.sid, "roomId": room_id}

    if target_sid:
        emit("ice-candidate", payload, to=target_sid)
    else:
        emit("ice-candidate", payload, room=room_id, skip_sid=request.sid)

    # keep logs light (ICE can be chatty)
    # print(f"🧊 ICE relayed in {room_id} (target={target_sid or 'broadcast'})")


@socketio.on("chat-message")
def handle_chat_message(data):
    room_id = _safe_room(data.get("roomId"))
    message = data.get("message")
    if not room_id or not message:
        return
    emit("chat-message", message, room=room_id)


# -----------------------------------------------------------------------------
# 1) Team Room — participant tracking & roles
# -----------------------------------------------------------------------------

@socketio.on("join_team_room")
def handle_join_team_room(data):
    room_id = _safe_room(data.get("room_id"))
    user_id = data.get("user_id")
    user_name = data.get("user_name", "Anonymous")
    video_enabled = bool(data.get("video_enabled", True))
    audio_enabled = bool(data.get("audio_enabled", True))

    if not room_id:
        return

    join_room(room_id)

    if room_id not in team_rooms:
        team_rooms[room_id] = {}

    # first user becomes host
    is_first = len(team_rooms[room_id]) == 0
    role = "host" if is_first else "participant"

    team_rooms[room_id][request.sid] = {
        "id": user_id,
        "name": user_name,
        "role": role,
        "videoEnabled": video_enabled,
        "audioEnabled": audio_enabled,
        "sid": request.sid,
        "joinedAt": datetime.utcnow().isoformat()
    }

    # send role assignment to joining socket
    emit("role-update", {"userId": user_id, "newRole": role})

    # broadcast full roster
    _emit_team_participants(room_id)

    print(f"🧑‍🤝‍🧑 {user_name} joined team room {room_id} as {role} ({len(team_rooms[room_id])} users)")


@socketio.on("leave_team_room")
def handle_leave_team_room(data):
    room_id = _safe_room(data.get("room_id"))
    user_id = data.get("user_id")
    user_name = data.get("user_name", "Someone")

    if not room_id:
        return

    # remove this sid
    was_host = False
    if room_id in team_rooms and request.sid in team_rooms[room_id]:
        was_host = team_rooms[room_id][request.sid].get("role") == "host"
        del team_rooms[room_id][request.sid]

        if not team_rooms[room_id]:
            del team_rooms[room_id]
        else:
            # host transfer if needed
            if was_host:
                _set_team_host_if_needed(room_id)
            _emit_team_participants(room_id)

    leave_room(room_id)
    print(f"👋 {user_name} left team room {room_id} (user_id={user_id})")


@socketio.on("role-update")
def handle_role_update(data):
    room_id = _safe_room(data.get("roomId"))
    target_user_id = data.get("userId")
    new_role = data.get("newRole")

    if not room_id or not target_user_id or not new_role:
        return

    if room_id in team_rooms:
        for sid, user_info in team_rooms[room_id].items():
            if str(user_info.get("id")) == str(target_user_id):
                team_rooms[room_id][sid]["role"] = new_role
                break

    emit("role-update", {"userId": target_user_id, "newRole": new_role}, room=room_id)
    print(f"🔄 Role update in {room_id}: user {target_user_id} → {new_role}")


@socketio.on("kick-user")
def handle_kick_user(data):
    room_id = _safe_room(data.get("roomId"))
    target_user_id = data.get("userId")
    if not room_id or not target_user_id:
        return

    if room_id in team_rooms:
        target_sid = None
        for sid, user_info in team_rooms[room_id].items():
            if str(user_info.get("id")) == str(target_user_id):
                target_sid = sid
                break

        if target_sid:
            # remove from tracking
            del team_rooms[room_id][target_sid]

            # notify kicked user + force them out client-side
            emit("kicked", {"userId": target_user_id}, to=target_sid)

            # transfer host if needed
            _set_team_host_if_needed(room_id)

            # update roster
            if team_rooms.get(room_id):
                _emit_team_participants(room_id)
            else:
                team_rooms.pop(room_id, None)

    print(f"🚪 User {target_user_id} kicked from {room_id}")


@socketio.on("transfer-host")
def handle_transfer_host(data):
    room_id = _safe_room(data.get("roomId"))
    new_host_id = data.get("newHostId")
    if not room_id or not new_host_id:
        return

    if room_id in team_rooms:
        for sid, user_info in team_rooms[room_id].items():
            if str(user_info.get("id")) == str(new_host_id):
                team_rooms[room_id][sid]["role"] = "host"
            elif user_info.get("role") == "host":
                team_rooms[room_id][sid]["role"] = "participant"

    emit("host-transferred", {"newHostId": new_host_id}, room=room_id)
    _emit_team_participants(room_id)
    print(f"👑 Host transferred to {new_host_id} in {room_id}")


@socketio.on("update_video_status")
def handle_update_video_status(data):
    room_id = _safe_room(data.get("room_id"))
    user_id = data.get("user_id")
    if not room_id or room_id not in team_rooms:
        return

    video_enabled = bool(data.get("video_enabled", True))
    audio_enabled = bool(data.get("audio_enabled", True))

    # update by matching user_id
    for sid, user_info in team_rooms[room_id].items():
        if str(user_info.get("id")) == str(user_id):
            team_rooms[room_id][sid]["videoEnabled"] = video_enabled
            team_rooms[room_id][sid]["audioEnabled"] = audio_enabled
            break

    emit("user_status_update", {
        "userId": user_id,
        "videoEnabled": video_enabled,
        "audioEnabled": audio_enabled
    }, room=room_id, skip_sid=request.sid)


# -----------------------------------------------------------------------------
# 2) Screen Share signaling (separate PC recommended client-side)
# -----------------------------------------------------------------------------

@socketio.on("screen-share-start")
def handle_screen_share_start(data):
    room_id = _safe_room(data.get("roomId"))
    user_id = data.get("userId")
    user_name = data.get("userName")
    if not room_id:
        return
    emit("screen-share-start", {"userId": user_id, "userName": user_name, "sid": request.sid},
         room=room_id, skip_sid=request.sid)

@socketio.on("screen-share-stop")
def handle_screen_share_stop(data):
    room_id = _safe_room(data.get("roomId"))
    user_id = data.get("userId")
    if not room_id:
        return
    emit("screen-share-stop", {"userId": user_id, "sid": request.sid},
         room=room_id, skip_sid=request.sid)

@socketio.on("screen-share-offer")
def handle_screen_share_offer(data):
    room_id = _safe_room(data.get("roomId"))
    offer = data.get("offer")
    target_sid = data.get("targetSid")
    if not room_id or not offer:
        return
    payload = {"offer": offer, "from": request.sid, "roomId": room_id}
    if target_sid:
        emit("screen-share-offer", payload, to=target_sid)
    else:
        emit("screen-share-offer", payload, room=room_id, skip_sid=request.sid)

@socketio.on("screen-share-answer")
def handle_screen_share_answer(data):
    room_id = _safe_room(data.get("roomId"))
    answer = data.get("answer")
    target_sid = data.get("targetSid")
    if not room_id or not answer:
        return
    payload = {"answer": answer, "from": request.sid, "roomId": room_id}
    if target_sid:
        emit("screen-share-answer", payload, to=target_sid)
    else:
        emit("screen-share-answer", payload, room=room_id, skip_sid=request.sid)

@socketio.on("screen-share-ice")
def handle_screen_share_ice(data):
    room_id = _safe_room(data.get("roomId"))
    candidate = data.get("candidate")
    target_sid = data.get("targetSid")
    if not room_id or not candidate:
        return
    payload = {"candidate": candidate, "from": request.sid, "roomId": room_id}
    if target_sid:
        emit("screen-share-ice", payload, to=target_sid)
    else:
        emit("screen-share-ice", payload, room=room_id, skip_sid=request.sid)


# -----------------------------------------------------------------------------
# 3) Voice Chat signaling (separate PC recommended client-side)
# -----------------------------------------------------------------------------

@socketio.on("voice-user-joined")
def handle_voice_user_joined(data):
    room_id = _safe_room(data.get("roomId"))
    user_id = data.get("userId")
    user_name = data.get("userName")
    if room_id:
        emit("voice-user-joined", {"userId": user_id, "userName": user_name, "sid": request.sid},
             room=room_id, include_self=False)

@socketio.on("voice-user-left")
def handle_voice_user_left(data):
    room_id = _safe_room(data.get("roomId"))
    user_id = data.get("userId")
    if room_id:
        emit("voice-user-left", {"userId": user_id, "sid": request.sid},
             room=room_id, include_self=False)

@socketio.on("voice-offer")
def handle_voice_offer(data):
    room_id = _safe_room(data.get("roomId"))
    offer = data.get("offer")
    target_sid = data.get("targetSid")
    if room_id and offer:
        payload = {"offer": offer, "from": request.sid, "roomId": room_id}
        if target_sid:
            emit("voice-offer", payload, to=target_sid)
        else:
            emit("voice-offer", payload, room=room_id, include_self=False)

@socketio.on("voice-answer")
def handle_voice_answer(data):
    room_id = _safe_room(data.get("roomId"))
    answer = data.get("answer")
    target_sid = data.get("targetSid")
    if answer:
        payload = {"answer": answer, "from": request.sid, "roomId": room_id}
        if target_sid:
            emit("voice-answer", payload, to=target_sid)
        elif room_id:
            emit("voice-answer", payload, room=room_id, include_self=False)

@socketio.on("voice-ice")
def handle_voice_ice(data):
    room_id = _safe_room(data.get("roomId"))
    candidate = data.get("candidate")
    target_sid = data.get("targetSid")
    if candidate:
        payload = {"candidate": candidate, "from": request.sid, "roomId": room_id}
        if target_sid:
            emit("voice-ice", payload, to=target_sid)
        elif room_id:
            emit("voice-ice", payload, room=room_id, include_self=False)


# -----------------------------------------------------------------------------
# 4) Podcast Collab Room
# -----------------------------------------------------------------------------

@socketio.on("podcast_collab_join")
def handle_podcast_collab_join(data):
    room_id = _safe_room(data.get("roomId"))
    user_id = data.get("userId")
    user_name = data.get("userName")
    avatar = data.get("avatar", "")
    is_host = bool(data.get("isHost", False))

    if not room_id or not user_id:
        return

    join_room(f"podcast_{room_id}")

    if room_id not in podcast_collab_rooms:
        podcast_collab_rooms[room_id] = {}

    podcast_collab_rooms[room_id][request.sid] = {
        "userId": user_id,
        "userName": user_name,
        "avatar": avatar,
        "isHost": is_host,
        "sid": request.sid,
        "handRaised": False,
        "isMuted": False,
        "videoOff": False
    }

    emit("podcast_collab_user_joined", {
        "userId": user_id,
        "userName": user_name,
        "avatar": avatar,
        "isHost": is_host,
        "sid": request.sid,
        "participants": list(podcast_collab_rooms[room_id].values())
    }, room=f"podcast_{room_id}")

    print(f"🎙️ {user_name} joined podcast collab room {room_id} (Total: {len(podcast_collab_rooms[room_id])})")


@socketio.on("podcast_collab_leave")
def handle_podcast_collab_leave(data):
    room_id = _safe_room(data.get("roomId"))
    if not room_id:
        return

    leave_room(f"podcast_{room_id}")

    if room_id in podcast_collab_rooms and request.sid in podcast_collab_rooms[room_id]:
        user_info = podcast_collab_rooms[room_id].pop(request.sid, {})

        if not podcast_collab_rooms[room_id]:
            del podcast_collab_rooms[room_id]

        emit("podcast_collab_user_left", {
            "userId": user_info.get("userId"),
            "userName": user_info.get("userName"),
            "sid": request.sid,
            "participants": list(podcast_collab_rooms.get(room_id, {}).values())
        }, room=f"podcast_{room_id}")


@socketio.on("podcast_collab_offer")
def handle_podcast_collab_offer(data):
    room_id = _safe_room(data.get("roomId"))
    target_sid = data.get("targetSid")
    offer = data.get("offer")
    if target_sid and offer:
        emit("podcast_collab_offer", {"offer": offer, "from": request.sid, "roomId": room_id}, to=target_sid)

@socketio.on("podcast_collab_answer")
def handle_podcast_collab_answer(data):
    room_id = _safe_room(data.get("roomId"))
    target_sid = data.get("targetSid")
    answer = data.get("answer")
    if target_sid and answer:
        emit("podcast_collab_answer", {"answer": answer, "from": request.sid, "roomId": room_id}, to=target_sid)

@socketio.on("podcast_collab_ice")
def handle_podcast_collab_ice(data):
    room_id = _safe_room(data.get("roomId"))
    target_sid = data.get("targetSid")
    candidate = data.get("candidate")
    if target_sid and candidate:
        emit("podcast_collab_ice", {"candidate": candidate, "from": request.sid, "roomId": room_id}, to=target_sid)

@socketio.on("podcast_collab_chat")
def handle_podcast_collab_chat(data):
    room_id = _safe_room(data.get("roomId"))
    message = data.get("message")
    if room_id and message:
        emit("podcast_collab_chat", message, room=f"podcast_{room_id}")


@socketio.on("podcast_collab_reaction")
def handle_podcast_collab_reaction(data):
    room_id = _safe_room(data.get("roomId"))
    if room_id:
        emit("podcast_collab_reaction", {
            "userId": data.get("userId"),
            "userName": data.get("userName"),
            "emoji": data.get("emoji", "👍"),
            "sid": request.sid
        }, room=f"podcast_{room_id}")


@socketio.on("podcast_collab_hand_raise")
def handle_podcast_collab_hand_raise(data):
    room_id = _safe_room(data.get("roomId"))
    raised = bool(data.get("raised", False))
    if room_id:
        if room_id in podcast_collab_rooms and request.sid in podcast_collab_rooms[room_id]:
            podcast_collab_rooms[room_id][request.sid]["handRaised"] = raised

        emit("podcast_collab_hand_raise", {
            "userId": data.get("userId"),
            "userName": data.get("userName"),
            "raised": raised,
            "sid": request.sid
        }, room=f"podcast_{room_id}")


@socketio.on("podcast_collab_layout_sync")
def handle_podcast_collab_layout_sync(data):
    room_id = _safe_room(data.get("roomId"))
    if room_id:
        emit("podcast_collab_layout_sync", {
            "layout": data.get("layout"),
            "orientation": data.get("orientation"),
            "spotlightUser": data.get("spotlightUser"),
            "fromHost": bool(data.get("fromHost", False))
        }, room=f"podcast_{room_id}", skip_sid=request.sid)


@socketio.on("podcast_collab_recording_start")
def handle_podcast_collab_recording_start(data):
    room_id = _safe_room(data.get("roomId"))
    if room_id:
        emit("podcast_collab_recording_start", {
            "startedBy": data.get("userId"),
            "timestamp": data.get("timestamp", datetime.utcnow().isoformat())
        }, room=f"podcast_{room_id}")

@socketio.on("podcast_collab_recording_stop")
def handle_podcast_collab_recording_stop(data):
    room_id = _safe_room(data.get("roomId"))
    if room_id:
        emit("podcast_collab_recording_stop", {
            "stoppedBy": data.get("userId"),
            "timestamp": data.get("timestamp", datetime.utcnow().isoformat())
        }, room=f"podcast_{room_id}")


# -----------------------------------------------------------------------------
# 5) Gamers Chatroom (joinRoom/leaveRoom/send_message)
# -----------------------------------------------------------------------------

@socketio.on("joinRoom")
def handle_join_chat_room(data):
    stream_id = _safe_room(data.get("stream_id"))
    user_info = data.get("user_info", {}) or {}
    if not stream_id:
        return

    join_room(stream_id)

    if stream_id not in chat_rooms:
        chat_rooms[stream_id] = {}

    chat_rooms[stream_id][request.sid] = {
        "id": user_info.get("id"),
        "username": user_info.get("username", "Anonymous"),
        "gamertag": user_info.get("gamertag", ""),
        "current_game": user_info.get("current_game", ""),
        "sid": request.sid,
        "joined_at": datetime.utcnow().isoformat()
    }

    users_list = list(chat_rooms[stream_id].values())
    emit("users_update", users_list, room=stream_id)

    active_games = list(set(u.get("current_game") for u in users_list if u.get("current_game")))
    emit("games_update", active_games, room=stream_id)

    emit("receive_message", {
        "type": "system",
        "message": f"🟢 {user_info.get('gamertag') or user_info.get('username', 'Someone')} joined the room",
        "timestamp": datetime.utcnow().isoformat()
    }, room=stream_id, skip_sid=request.sid)

    print(f"💬 {user_info.get('username')} joined chat room {stream_id} ({len(chat_rooms[stream_id])} users)")


@socketio.on("leaveRoom")
def handle_leave_chat_room(data):
    stream_id = _safe_room(data.get("stream_id"))
    if not stream_id:
        return

    user_info = {}
    if stream_id in chat_rooms and request.sid in chat_rooms[stream_id]:
        user_info = chat_rooms[stream_id].pop(request.sid, {})
        if not chat_rooms[stream_id]:
            del chat_rooms[stream_id]

    leave_room(stream_id)

    if stream_id in chat_rooms:
        users_list = list(chat_rooms[stream_id].values())
        emit("users_update", users_list, room=stream_id)

        active_games = list(set(u.get("current_game") for u in users_list if u.get("current_game")))
        emit("games_update", active_games, room=stream_id)

    username = user_info.get("gamertag") or user_info.get("username", "Someone")
    emit("receive_message", {
        "type": "system",
        "message": f"🔴 {username} left the room",
        "timestamp": datetime.utcnow().isoformat()
    }, room=stream_id)

    print(f"👋 {username} left chat room {stream_id}")


@socketio.on("send_message")
def handle_send_message(data):
    stream_id = _safe_room(data.get("stream_id"))
    message = data.get("message")
    user_info = data.get("user_info", {}) or {}

    if not stream_id or not message:
        return

    msg_payload = {
        "type": "user",
        "message": message,
        "username": user_info.get("gamertag") or user_info.get("username", "Anonymous"),
        "user_id": user_info.get("id") or chat_rooms.get(stream_id, {}).get(request.sid, {}).get("id"),
        "gamertag": user_info.get("gamertag", ""),
        "current_game": user_info.get("current_game", ""),
        "gamer_rank": user_info.get("gamer_rank", ""),
        "isGameInvite": bool(user_info.get("isGameInvite", False)),
        "timestamp": datetime.utcnow().isoformat(),
        "sid": request.sid
    }

    emit("receive_message", msg_payload, room=stream_id)
    print(f'💬 [{stream_id}] {msg_payload["username"]}: {message[:80]}')


@socketio.on("typing")
def handle_typing(data):
    stream_id = _safe_room(data.get("stream_id"))
    username = data.get("username")
    if stream_id and username:
        emit("user_typing", {"username": username, "timestamp": datetime.utcnow().isoformat()},
             room=stream_id, skip_sid=request.sid)

@socketio.on("stop_typing")
def handle_stop_typing(data):
    stream_id = _safe_room(data.get("stream_id") or data.get("room"))
    username = data.get("from") or data.get("username")
    if stream_id:
        emit("stop_typing", {"username": username}, room=stream_id, skip_sid=request.sid)

@socketio.on("update_game_status")
def handle_game_status_update(data):
    stream_id = _safe_room(data.get("stream_id"))
    game_status = data.get("game_status", "")

    if not stream_id:
        return

    if stream_id in chat_rooms and request.sid in chat_rooms[stream_id]:
        chat_rooms[stream_id][request.sid]["current_game"] = game_status

    if stream_id in chat_rooms:
        active_games = list(set(
            u.get("current_game") for u in chat_rooms[stream_id].values()
            if u.get("current_game")
        ))
        emit("games_update", active_games, room=stream_id)

    emit("user_status_update", {"sid": request.sid, "game_status": game_status},
         room=stream_id, skip_sid=request.sid)


# -----------------------------------------------------------------------------
# Debug: room stats
# -----------------------------------------------------------------------------

@socketio.on("get_room_stats")
def handle_get_room_stats():
    stats = {
        "total_webrtc_rooms": len(active_rooms),
        "webrtc_rooms": [
            {"roomId": rid, "userCount": len(sids), "sids": sids}
            for rid, sids in active_rooms.items()
        ],
        "total_team_rooms": len(team_rooms),
        "team_rooms": [
            {"roomId": rid, "userCount": len(users), "users": list(users.values())}
            for rid, users in team_rooms.items()
        ],
    }
    emit("room_stats", stats)
    print(f"📊 Room stats: {len(active_rooms)} webrtc rooms, {len(team_rooms)} team rooms")



# =============================================================================
# DAW Collaboration Socket.IO Handlers
# =============================================================================
daw_sessions = {}

@socketio.on('daw:create_session')
def on_daw_create_session(data):
    import json
    from api.models import DAWSession, db
    session_id = data['sessionId']
    join_room(session_id)
    collaborators = [{'id': data['hostId'], 'username': data['hostName']}]
    daw_sessions[session_id] = {
        'host_id': data['hostId'],
        'project_id': data['projectId'],
        'state': data.get('initialState', {}),
        'collaborators': collaborators,
    }
    try:
        existing = DAWSession.query.filter_by(session_id=session_id).first()
        if existing:
            existing.is_active = True
            existing.collaborators_json = json.dumps(collaborators)
            existing.state_json = json.dumps(data.get('initialState', {}))
        else:
            sess_db = DAWSession(
                session_id=session_id,
                session_code=data.get('sessionCode', ''),
                host_id=data['hostId'],
                project_id=data.get('projectId'),
                state_json=json.dumps(data.get('initialState', {})),
                collaborators_json=json.dumps(collaborators),
                is_active=True,
            )
            db.session.add(sess_db)
        db.session.commit()
    except Exception as e:
        print(f'[DAW] DB persist error: {e}')
    emit('daw:session_created', {'sessionId': session_id, 'sessionCode': data['sessionCode']})

@socketio.on('daw:join_session')
def on_daw_join_session(data):
    import json
    from api.models import DAWSession, db
    session_id = data['sessionId']
    join_room(session_id)
    if session_id not in daw_sessions:
        sess_db = DAWSession.query.filter_by(session_id=session_id, is_active=True).first()
        if sess_db:
            daw_sessions[session_id] = {
                'host_id': sess_db.host_id,
                'project_id': sess_db.project_id,
                'state': json.loads(sess_db.state_json or '{}'),
                'collaborators': json.loads(sess_db.collaborators_json or '[]'),
            }
    if session_id in daw_sessions:
        sess = daw_sessions[session_id]
        sess['collaborators'].append({'id': data['userId'], 'username': data['username']})
        try:
            sess_db = DAWSession.query.filter_by(session_id=session_id).first()
            if sess_db:
                sess_db.collaborators_json = json.dumps(sess['collaborators'])
                db.session.commit()
        except Exception as e:
            print(f'[DAW] DB update error: {e}')
        emit('daw:request_state', {'userId': data['userId']}, room=str(sess['host_id']))
        emit('daw:user_joined', data, room=session_id, include_self=False)
    else:
        emit('daw:error', {'message': 'Session not found'})

@socketio.on('daw:leave_session')
def on_daw_leave_session(data):
    import json
    from api.models import DAWSession, db
    session_id = data.get('sessionId')
    if session_id:
        leave_room(session_id)
        if session_id in daw_sessions:
            sess = daw_sessions[session_id]
            sess['collaborators'] = [
                c for c in sess['collaborators']
                if c['id'] != data.get('userId')
            ]
            # If no collaborators left, mark inactive
            is_empty = len(sess['collaborators']) == 0
            try:
                sess_db = DAWSession.query.filter_by(session_id=session_id).first()
                if sess_db:
                    sess_db.collaborators_json = json.dumps(sess['collaborators'])
                    if is_empty:
                        sess_db.is_active = False
                    db.session.commit()
            except Exception as e:
                print(f'[DAW] Leave persist error: {e}')
            if is_empty:
                daw_sessions.pop(session_id, None)
        emit('daw:user_left', data, room=session_id)

@socketio.on('daw:op')
def on_daw_op(data):
    import json
    from api.models import DAWSession, db
    session_id = data.get('sessionId')
    if session_id:
        emit('daw:op', data, room=session_id, include_self=False)
        # Persist state update to DB periodically (on track changes)
        if data.get('type') in ('track_update', 'bpm_change', 'tracks_set'):
            try:
                sess_db = DAWSession.query.filter_by(session_id=session_id).first()
                if sess_db and session_id in daw_sessions:
                    sess_db.state_json = json.dumps(daw_sessions[session_id].get('state', {}))
                    db.session.commit()
            except Exception as e:
                print(f'[DAW] State persist error: {e}')

@socketio.on('daw:cursor')
def on_daw_cursor(data):
    session_id = data.get('sessionId')
    if session_id:
        emit('daw:cursor', data, room=session_id, include_self=False)

@socketio.on('daw:full_state_response')
def on_daw_full_state_response(data):
    target_id = data.get('targetUserId')
    if target_id:
        emit('daw:full_state', data, room=target_id)

@socketio.on('daw:chat')
def on_daw_chat(data):
    session_id = data.get('sessionId')
    if session_id:
        emit('daw:chat', data, room=session_id, include_self=False)


# -----------------------------------------------------------------------------
# init
# -----------------------------------------------------------------------------

def init_socketio(app):
    """Initialize SocketIO with Flask app."""
    socketio.init_app(
        app,
        cors_allowed_origins="*",
        allow_credentials=True,
        logger=True,
        engineio_logger=True,
        manage_session=False,
        # IMPORTANT:
        # If you can install eventlet, use async_mode="eventlet" for best websocket support.
        # If not, threading works but can be less reliable under load.
        async_mode="eventlet"
    )
    print("✅ SocketIO initialized")
    return socketio
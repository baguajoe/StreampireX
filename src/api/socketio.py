# src/api/socketio.py
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import request

socketio = SocketIO(cors_allowed_origins="*", allow_credentials=True)
active_rooms = {}

@socketio.on('connect')
def handle_connect():
    print(f'✅ Client connected: {request.sid}')
    emit('connected', {'sid': request.sid})

@socketio.on('disconnect')
def handle_disconnect():
    print(f'❌ Client disconnected: {request.sid}')
    for room_id, users in list(active_rooms.items()):
        if request.sid in users:
            users.remove(request.sid)
            emit('user-left', {'userId': request.sid}, room=room_id, skip_sid=request.sid)
            if not users:
                del active_rooms[room_id]
                print(f'🗑️  Cleaned up empty room: {room_id}')

@socketio.on('join_webrtc_room')
def handle_join_room(data):
    room_id = data.get('roomId')
    user_id = data.get('userId')
    user_name = data.get('userName')
    
    join_room(room_id)
    
    if room_id not in active_rooms:
        active_rooms[room_id] = []
    
    if request.sid not in active_rooms[room_id]:
        active_rooms[room_id].append(request.sid)
    
    emit('user-joined', {
        'userId': user_id,
        'userName': user_name,
        'sid': request.sid
    }, room=room_id, skip_sid=request.sid)
    
    print(f'✅ User {user_name} joined room {room_id} (Users: {len(active_rooms[room_id])})')

@socketio.on('leave_webrtc_room')
def handle_leave_room(data):
    room_id = data.get('roomId')
    
    if room_id and room_id in active_rooms:
        if request.sid in active_rooms[room_id]:
            active_rooms[room_id].remove(request.sid)
            leave_room(room_id)
            
            if not active_rooms[room_id]:
                del active_rooms[room_id]
            
            emit('user-left', {'userId': request.sid}, room=room_id, skip_sid=request.sid)
            print(f'👋 User {request.sid} left room {room_id}')

@socketio.on('offer')
def handle_offer(data):
    room_id = data.get('roomId')
    offer = data.get('offer')
    
    if not room_id or not offer:
        return
    
    emit('offer', {'offer': offer, 'from': request.sid}, room=room_id, skip_sid=request.sid)
    print(f'📡 Offer sent in room {room_id}')

@socketio.on('answer')
def handle_answer(data):
    room_id = data.get('roomId')
    answer = data.get('answer')
    
    if not room_id or not answer:
        return
    
    emit('answer', {'answer': answer, 'from': request.sid}, room=room_id, skip_sid=request.sid)
    print(f'📡 Answer sent in room {room_id}')

@socketio.on('ice-candidate')
def handle_ice_candidate(data):
    room_id = data.get('roomId')
    candidate = data.get('candidate')
    
    if not room_id or not candidate:
        return
    
    emit('ice-candidate', {'candidate': candidate, 'from': request.sid}, room=room_id, skip_sid=request.sid)
    print(f'🧊 ICE candidate sent in room {room_id}')

@socketio.on('chat-message')
def handle_chat_message(data):
    room_id = data.get('roomId')
    message = data.get('message')
    
    if not room_id or not message:
        return
    
    emit('chat-message', message, room=room_id)
    print(f'💬 Chat message in room {room_id}')

# =====================================================
# SCREEN SHARE SIGNALING ADDITIONS FOR socketio.py
# =====================================================
# Add these events to your existing src/api/socketio.py
# They work alongside your existing offer/answer/ice-candidate handlers
# =====================================================

# --- Paste these ABOVE your existing 'chat-message' handler ---

@socketio.on('screen-share-start')
def handle_screen_share_start(data):
    """Notify room that someone started sharing their screen"""
    room_id = data.get('roomId')
    user_id = data.get('userId')
    user_name = data.get('userName')
    
    if not room_id:
        return
    
    emit('screen-share-start', {
        'userId': user_id,
        'userName': user_name,
        'sid': request.sid
    }, room=room_id, skip_sid=request.sid)
    
    print(f'🖥️ Screen share started by {user_name} in room {room_id}')


@socketio.on('screen-share-stop')
def handle_screen_share_stop(data):
    """Notify room that someone stopped sharing their screen"""
    room_id = data.get('roomId')
    user_id = data.get('userId')
    
    if not room_id:
        return
    
    emit('screen-share-stop', {
        'userId': user_id,
        'sid': request.sid
    }, room=room_id, skip_sid=request.sid)
    
    print(f'🖥️ Screen share stopped by {user_id} in room {room_id}')


@socketio.on('screen-share-offer')
def handle_screen_share_offer(data):
    """Relay WebRTC offer for screen share stream"""
    room_id = data.get('roomId')
    offer = data.get('offer')
    
    if not room_id or not offer:
        return
    
    emit('screen-share-offer', {
        'offer': offer,
        'from': request.sid
    }, room=room_id, skip_sid=request.sid)
    
    print(f'📡 Screen share offer sent in room {room_id}')


@socketio.on('screen-share-answer')
def handle_screen_share_answer(data):
    """Relay WebRTC answer for screen share stream"""
    room_id = data.get('roomId')
    answer = data.get('answer')
    target_sid = data.get('targetSid')
    
    if not room_id or not answer:
        return
    
    # Send answer back to the sharer specifically
    if target_sid:
        emit('screen-share-answer', {
            'answer': answer,
            'from': request.sid
        }, to=target_sid)
    else:
        emit('screen-share-answer', {
            'answer': answer,
            'from': request.sid
        }, room=room_id, skip_sid=request.sid)
    
    print(f'📡 Screen share answer sent in room {room_id}')


@socketio.on('screen-share-ice')
def handle_screen_share_ice(data):
    """Relay ICE candidates for screen share peer connection"""
    room_id = data.get('roomId')
    candidate = data.get('candidate')
    target_sid = data.get('targetSid')
    
    if not room_id or not candidate:
        return
    
    if target_sid:
        emit('screen-share-ice', {
            'candidate': candidate,
            'from': request.sid
        }, to=target_sid)
    else:
        emit('screen-share-ice', {
            'candidate': candidate,
            'from': request.sid
        }, room=room_id, skip_sid=request.sid)

# Admin endpoint for debugging
@socketio.on('get_room_stats')
def handle_get_room_stats():
    stats = {
        'total_rooms': len(active_rooms),
        'rooms': [
            {
                'roomId': room_id,
                'userCount': len(users),
                'users': users
            }
            for room_id, users in active_rooms.items()
        ]
    }
    emit('room_stats', stats)
    print(f'📊 Room stats: {len(active_rooms)} active rooms')

def init_socketio(app):
    """Initialize SocketIO with Flask app"""
    socketio.init_app(
        app,
        cors_allowed_origins="*",
        async_mode='threading',
        logger=True,
        engineio_logger=True,
        manage_session=False
    )
    print("✅ WebRTC SocketIO initialized")
    return socketio
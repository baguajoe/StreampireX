from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import request

socketio = SocketIO(cors_allowed_origins="*", allow_credentials=True)
active_rooms = {}

@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')
    emit('connected', {'sid': request.sid})

@socketio.on('disconnect')
def handle_disconnect():
    print(f'Client disconnected: {request.sid}')
    for room_id, users in list(active_rooms.items()):
        if request.sid in users:
            users.remove(request.sid)
            emit('user-left', {'userId': request.sid}, room=room_id, skip_sid=request.sid)
            if not users:
                del active_rooms[room_id]

@socketio.on('join_webrtc_room')
def handle_join_room(data):
    room_id = data.get('roomId')
    user_id = data.get('userId')
    user_name = data.get('userName')
    
    join_room(room_id)
    
    if room_id not in active_rooms:
        active_rooms[room_id] = []
    active_rooms[room_id].append(request.sid)
    
    emit('user-joined', {
        'userId': user_id,
        'userName': user_name,
        'sid': request.sid
    }, room=room_id, skip_sid=request.sid)
    
    print(f'User {user_name} joined room {room_id}')

@socketio.on('offer')
def handle_offer(data):
    room_id = data.get('roomId')
    offer = data.get('offer')
    emit('offer', {'offer': offer, 'from': request.sid}, room=room_id, skip_sid=request.sid)

@socketio.on('answer')
def handle_answer(data):
    room_id = data.get('roomId')
    answer = data.get('answer')
    emit('answer', {'answer': answer, 'from': request.sid}, room=room_id, skip_sid=request.sid)

@socketio.on('ice-candidate')
def handle_ice_candidate(data):
    room_id = data.get('roomId')
    candidate = data.get('candidate')
    emit('ice-candidate', {'candidate': candidate, 'from': request.sid}, room=room_id, skip_sid=request.sid)

@socketio.on('chat-message')
def handle_chat_message(data):
    room_id = data.get('roomId')
    message = data.get('message')
    emit('chat-message', message, room=room_id)
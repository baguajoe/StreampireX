from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

@socketio.on('call_request')
def handle_call(data):
    emit('incoming_call', data, broadcast=True)

if __name__ == "__main__":
    socketio.run(app, debug=True)

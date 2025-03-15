from flask import Flask, request, jsonify
from flask_socketio import SocketIO

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

votes = {}

@app.route("/vote", methods=["POST"])
def vote():
    data = request.json
    song = data.get("song")
    
    if song in votes:
        votes[song] += 1
    else:
        votes[song] = 1
    
    socketio.emit("vote_update", votes)
    return jsonify({"message": "Vote counted!"}), 200

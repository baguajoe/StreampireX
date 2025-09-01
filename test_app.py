from flask import Flask, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

@app.route('/health')
def health():
    return jsonify({"status": "ok", "message": "Flask is working!"})

@app.route('/')
def home():
    return jsonify({"message": "SpectraSphere API is running"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)

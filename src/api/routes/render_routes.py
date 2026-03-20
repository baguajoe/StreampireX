from flask import Blueprint, request, jsonify
from src.api.services.rendering.pro_render_backend import queue_backend_render

render_api = Blueprint("render_api", __name__)

@render_api.route("/render", methods=["POST"])
def render_project():
    data = request.get_json(silent=True) or {}
    job = queue_backend_render(data)
    return jsonify(job), 200

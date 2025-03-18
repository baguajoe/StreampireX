from flask import jsonify, url_for
from flask_jwt_extended import get_jwt_identity
from api.models import User

class APIException(Exception):
    status_code = 400

    def __init__(self, message, status_code=None, payload=None):
        Exception.__init__(self)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        rv = dict(self.payload or ())
        rv['message'] = self.message
        return rv

def has_no_empty_params(rule):
    defaults = rule.defaults if rule.defaults is not None else ()
    arguments = rule.arguments if rule.arguments is not None else ()
    return len(defaults) >= len(arguments)

def generate_sitemap(app):
    """ Generate a sitemap of all API endpoints except for admin routes """
    links = []
    for rule in app.url_map.iter_rules():
        if "GET" in rule.methods and has_no_empty_params(rule):
            url = url_for(rule.endpoint, **(rule.defaults or {}))
            if "/admin/" not in url:  # Exclude admin routes
                links.append(url)

    links_html = "".join([f"<li><a href='{y}'>{y}</a></li>" for y in links])
    
    return f"""
        <div style="text-align: center;">
            <img style="max-height: 80px" src='https://your-cdn.com/streampirex-logo.png' />
            <h1>Welcome to StreampireX API</h1>
            <p>This is the API gateway for StreampireX. Explore available endpoints below:</p>
            <ul style="text-align: left;">{links_html}</ul>
            <p>Check out the <a href="https://streampirex.com/docs" target="_blank">API Documentation</a> for more details.</p>
        </div>
    """

def is_admin(user_id=None):
    """Check if the user is an admin."""
    if user_id is None:
        user_id = get_jwt_identity()

    user = User.query.get(user_id)
    return user and user.role == "admin"

# utils.py

from flask import jsonify, url_for, current_app
from flask_jwt_extended import get_jwt_identity
from flask_mail import Mail, Message
from src.api.models import User

def calculate_split(amount, revenue_type):
    """
    Calculate the platform cut and creator earnings based on the amount and revenue type.

    Args:
    - amount (float): The total amount of revenue generated.
    - revenue_type (str): The type of revenue ("ad_revenue", "tip_jar", "live_tickets", "subscription", etc.)

    Returns:
    - dict: A dictionary containing the platform cut and creator earnings.
    """
    # Define revenue splits for different types of revenue
    splits = {
        "ad_revenue": 0.10,      # 10% platform cut for ad revenue
        "tip_jar": 0.10,         # 10% platform cut for tip jar
        "live_tickets": 0.10,    # 10% platform cut for live tickets
        "subscription": 0.10,    # 10% platform cut for subscription revenue
        "merch_sales": 0.10,     # 10% platform cut for merchandise
        "digital_sales": 0.10    # 10% platform cut for digital products
    }

    # Default to a 15% platform cut if no specific type is matched
    platform_cut_percentage = splits.get(revenue_type, 0.15)
    platform_cut = amount * platform_cut_percentage
    creator_earnings = amount - platform_cut

    return {
        "platform_cut": platform_cut,
        "creator_earnings": creator_earnings
    }


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

def send_email(recipient, subject, body):
    """
    Send an email using Flask-Mail.

    Args:
        recipient (str): The email address of the recipient.
        subject (str): The subject of the email.
        body (str): The body/content of the email.
    """
    global mail  # Declare 'mail' as global before using it.

    try:
        # Initialize 'mail' if it hasn't been done yet
        if not mail:
            mail = Mail(current_app)  # Initialize mail with the app context

        msg = Message(subject, recipients=[recipient])
        msg.body = body
        mail.send(msg)
    except Exception as e:
        print(f"Error sending email: {e}")
        raise ValueError("Failed to send email.")

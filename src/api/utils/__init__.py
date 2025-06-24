# Utility functions for the API

class APIException(Exception):
    """Custom API Exception class"""
    def __init__(self, message, status_code=400, payload=None):
        super().__init__()
        self.message = message
        self.status_code = status_code
        self.payload = payload

def generate_sitemap(app):
    """Generate sitemap for the application"""
    # TODO: Implement sitemap generation
    return []

def send_email(to, subject, body):
    """Send email functionality"""
    # TODO: Implement email sending
    print(f"Email would be sent to: {to}, Subject: {subject}")
    return True

def calculate_split(amount, split_percentage):
    """Calculate split amount based on percentage"""
    if not isinstance(amount, (int, float)) or not isinstance(split_percentage, (int, float)):
        return 0
    return amount * (split_percentage / 100)
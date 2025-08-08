# error_handling.py - Add comprehensive error handling for SonoSuite integration

from functools import wraps
from flask import jsonify, request
import logging
import time
from datetime import datetime

# Setup logging for SonoSuite integration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
sonosuite_logger = logging.getLogger('sonosuite_integration')

from flask import jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.routes import api  # Make sure `api` is your Blueprint
from api.models import db, User, Subscription, SonoSuiteUser, DistributionSubmission, Audio
from api.utils import generate_sonosuite_jwt, plan_required, check_upload_limit
import jwt  # If you're using PyJWT for token error classes
import re
import os

SONOSUITE_SHARED_SECRET = os.getenv("SONOSUITE_SHARED_SECRET")
SONOSUITE_BASE_URL = os.getenv("SONOSUITE_BASE_URL", "https://your-default-sonosuite-url.com")

class SonoSuiteIntegrationError(Exception):
    """Custom exception for SonoSuite integration errors"""
    def __init__(self, message, error_code=None, user_id=None):
        self.message = message
        self.error_code = error_code
        self.user_id = user_id
        self.timestamp = datetime.utcnow()
        super().__init__(self.message)

def log_sonosuite_action(action_type):
    """Decorator to log SonoSuite actions for monitoring"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            start_time = time.time()
            user_id = get_jwt_identity() if 'get_jwt_identity' in globals() else 'unknown'
            
            try:
                sonosuite_logger.info(f"SonoSuite {action_type} started for user {user_id}")
                result = f(*args, **kwargs)
                
                execution_time = time.time() - start_time
                sonosuite_logger.info(
                    f"SonoSuite {action_type} completed for user {user_id} in {execution_time:.2f}s"
                )
                
                return result
                
            except Exception as e:
                execution_time = time.time() - start_time
                sonosuite_logger.error(
                    f"SonoSuite {action_type} failed for user {user_id} after {execution_time:.2f}s: {str(e)}"
                )
                raise
                
        return decorated_function
    return decorator

def handle_sonosuite_errors(f):
    """Decorator to handle and format SonoSuite-specific errors"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
            
        except SonoSuiteIntegrationError as e:
            sonosuite_logger.error(f"SonoSuite Integration Error: {e.message} for user {e.user_id}")
            return jsonify({
                "error": e.message,
                "error_code": e.error_code,
                "timestamp": e.timestamp.isoformat(),
                "support_message": "If this issue persists, please contact support with the error code above."
            }), 400
            
        except jwt.ExpiredSignatureError:
            sonosuite_logger.warning(f"Expired JWT token for user {get_jwt_identity()}")
            return jsonify({
                "error": "Session expired",
                "error_code": "JWT_EXPIRED",
                "action_required": "Please refresh your connection to the distribution system"
            }), 401
            
        except jwt.InvalidTokenError as e:
            sonosuite_logger.error(f"Invalid JWT token: {str(e)}")
            return jsonify({
                "error": "Authentication failed",
                "error_code": "JWT_INVALID",
                "action_required": "Please reconnect to the distribution system"
            }), 401
            
        except Exception as e:
            sonosuite_logger.error(f"Unexpected error in SonoSuite integration: {str(e)}")
            return jsonify({
                "error": "An unexpected error occurred",
                "error_code": "INTERNAL_ERROR",
                "support_message": "Please try again later or contact support if the issue persists"
            }), 500
            
    return decorated_function

def validate_sonosuite_connection(f):
    """Decorator to validate SonoSuite connection before proceeding"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        
        # Check if user has SonoSuite connection
        connection = SonoSuiteUser.query.filter_by(
            streampirex_user_id=user_id,
            is_active=True
        ).first()
        
        if not connection:
            raise SonoSuiteIntegrationError(
                "SonoSuite account not connected. Please connect your account first.",
                error_code="NOT_CONNECTED",
                user_id=user_id
            )
        
        # Validate connection data
        if not connection.sonosuite_email or not connection.sonosuite_external_id:
            raise SonoSuiteIntegrationError(
                "SonoSuite connection is incomplete. Please reconnect your account.",
                error_code="INCOMPLETE_CONNECTION",
                user_id=user_id
            )
        
        return f(*args, **kwargs)
    return decorated_function

def rate_limit_sonosuite(requests_per_minute=30):
    """Rate limiting decorator for SonoSuite endpoints"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_id = get_jwt_identity()
            cache_key = f"sonosuite_rate_limit:{user_id}"
            
            # Simple in-memory rate limiting (use Redis in production)
            # This is a basic implementation - consider using Flask-Limiter
            current_time = time.time()
            
            # For production, implement proper rate limiting with Redis
            # For now, we'll log and continue
            sonosuite_logger.debug(f"Rate limit check for user {user_id}")
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Enhanced route implementations with error handling

@api.route('/api/sonosuite/connect', methods=['POST'])
@jwt_required()
@plan_required("sonosuite_access")
@handle_sonosuite_errors
@log_sonosuite_action("CONNECTION")
@rate_limit_sonosuite(requests_per_minute=10)  # Lower limit for connection attempts
def connect_sonosuite_account_enhanced():
    """Enhanced SonoSuite connection with comprehensive error handling"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()
    
    # Validate input data
    if not data:
        raise SonoSuiteIntegrationError(
            "No connection data provided",
            error_code="MISSING_DATA",
            user_id=user_id
        )
    
    required_fields = ['sonosuite_email', 'external_id']
    missing_fields = [field for field in required_fields if not data.get(field)]
    
    if missing_fields:
        raise SonoSuiteIntegrationError(
            f"Missing required fields: {', '.join(missing_fields)}",
            error_code="MISSING_FIELDS",
            user_id=user_id
        )
    
    # Validate email format
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, data['sonosuite_email']):
        raise SonoSuiteIntegrationError(
            "Invalid email format",
            error_code="INVALID_EMAIL",
            user_id=user_id
        )
    
    try:
        # Check for existing connection
        existing_connection = SonoSuiteUser.query.filter_by(
            streampirex_user_id=user_id
        ).first()
        
        if existing_connection:
            # Update existing connection
            existing_connection.sonosuite_email = data['sonosuite_email']
            existing_connection.sonosuite_external_id = data['external_id']
            existing_connection.is_active = True
            existing_connection.jwt_secret = SONOSUITE_SHARED_SECRET
            
            db.session.commit()
            
            sonosuite_logger.info(f"Updated SonoSuite connection for user {user_id}")
            
            return jsonify({
                "message": "SonoSuite connection updated successfully",
                "connection": existing_connection.serialize()
            }), 200
        
        # Create new connection
        sonosuite_user = SonoSuiteUser(
            streampirex_user_id=user_id,
            sonosuite_external_id=data['external_id'],
            sonosuite_email=data['sonosuite_email'],
            jwt_secret=SONOSUITE_SHARED_SECRET,
            is_active=True
        )
        
        db.session.add(sonosuite_user)
        db.session.commit()
        
        sonosuite_logger.info(f"Created new SonoSuite connection for user {user_id}")
        
        return jsonify({
            "message": "SonoSuite account connected successfully",
            "connection": sonosuite_user.serialize()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        raise SonoSuiteIntegrationError(
            f"Failed to connect SonoSuite account: {str(e)}",
            error_code="CONNECTION_FAILED",
            user_id=user_id
        )

@api.route('/api/sonosuite/redirect', methods=['GET'])
@jwt_required()
@plan_required("sonosuite_access")
@handle_sonosuite_errors
@validate_sonosuite_connection
@log_sonosuite_action("SSO_REDIRECT")
@rate_limit_sonosuite(requests_per_minute=60)
def redirect_to_sonosuite_enhanced():
    """Enhanced SSO redirect with comprehensive error handling"""
    user_id = get_jwt_identity()
    
    # Get SonoSuite connection
    sonosuite_profile = SonoSuiteUser.query.filter_by(
        streampirex_user_id=user_id,
        is_active=True
    ).first()
    
    # Generate JWT token
    try:
        jwt_token = generate_sonosuite_jwt(
            user_email=sonosuite_profile.sonosuite_email,
            external_id=sonosuite_profile.sonosuite_external_id
        )
        
        if not jwt_token:
            raise SonoSuiteIntegrationError(
                "Failed to generate authentication token",
                error_code="JWT_GENERATION_FAILED",
                user_id=user_id
            )
        
        # Validate return_to parameter
        return_to = request.args.get('return_to', '/albums')
        
        # Sanitize return_to to prevent open redirects
        allowed_paths = ['/albums', '/releases', '/analytics', '/catalog', '/releases/create']
        if return_to not in allowed_paths:
            sonosuite_logger.warning(f"Invalid return_to path attempted: {return_to}")
            return_to = '/albums'
        
        # Build SonoSuite URL
        sonosuite_url = f"{SONOSUITE_BASE_URL}{return_to}?jwt={jwt_token}"
        
        sonosuite_logger.info(f"Generated SSO redirect for user {user_id} to {return_to}")
        
        return jsonify({
            "redirect_url": sonosuite_url,
            "message": "Redirecting to SonoSuite...",
            "expires_in": 3600  # 1 hour
        }), 200
        
    except Exception as e:
        raise SonoSuiteIntegrationError(
            f"Failed to generate SSO redirect: {str(e)}",
            error_code="SSO_REDIRECT_FAILED",
            user_id=user_id
        )

@api.route('/api/distribution/submit', methods=['POST'])
@jwt_required()
@plan_required("includes_music_distribution")
@handle_sonosuite_errors
@validate_sonosuite_connection
@log_sonosuite_action("DISTRIBUTION_SUBMIT")
@rate_limit_sonosuite(requests_per_minute=10)  # Lower limit for submissions
def submit_for_distribution_enhanced():
    """Enhanced distribution submission with comprehensive error handling"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # Validate input data
    if not data:
        raise SonoSuiteIntegrationError(
            "No submission data provided",
            error_code="MISSING_SUBMISSION_DATA",
            user_id=user_id
        )
    
    # Check upload limits
    upload_check = check_upload_limit(user_id, "music")
    if not upload_check["allowed"]:
        raise SonoSuiteIntegrationError(
            f"Upload limit reached: {upload_check.get('error', 'Monthly limit exceeded')}",
            error_code="UPLOAD_LIMIT_EXCEEDED",
            user_id=user_id
        )
    
    # Validate required fields
    required_fields = ['track_id', 'release_title', 'artist_name', 'genre']
    missing_fields = [field for field in required_fields if not data.get(field)]
    
    if missing_fields:
        raise SonoSuiteIntegrationError(
            f"Missing required fields: {', '.join(missing_fields)}",
            error_code="MISSING_REQUIRED_FIELDS",
            user_id=user_id
        )
    
    # Validate track exists and belongs to user
    track = Audio.query.filter_by(id=data['track_id'], user_id=user_id).first()
    if not track:
        raise SonoSuiteIntegrationError(
            "Track not found or access denied",
            error_code="TRACK_NOT_FOUND",
            user_id=user_id
        )
    
    try:
        # Create submission record
        submission = DistributionSubmission(
            user_id=user_id,
            track_id=data["track_id"],
            release_title=data["release_title"],
            artist_name=data["artist_name"],
            genre=data["genre"],
            release_date=data.get("release_date"),
            label=data.get("label", "StreampireX Records"),
            explicit=data.get("explicit", False),
            platforms=data.get("platforms", []),
            territories=data.get("territories", ["worldwide"]),
            status="pending",
            sonosuite_submission_id=f"spx_{user_id}_{int(time.time())}",
            submitted_at=datetime.utcnow()
        )
        
        db.session.add(submission)
        db.session.commit()
        
        sonosuite_logger.info(f"Distribution submission created for user {user_id}: {submission.sonosuite_submission_id}")
        
        return jsonify({
            "message": "Track submitted successfully for distribution",
            "submission_id": submission.sonosuite_submission_id,
            "status": "pending",
            "estimated_live_date": "24-48 hours",
            "remaining_uploads": upload_check["remaining"]
        }), 201
        
    except Exception as e:
        db.session.rollback()
        raise SonoSuiteIntegrationError(
            f"Failed to submit track for distribution: {str(e)}",
            error_code="SUBMISSION_FAILED",
            user_id=user_id
        )

# Health check endpoint for monitoring
@api.route('/api/sonosuite/health', methods=['GET'])
def sonosuite_health_check():
    """Health check endpoint for SonoSuite integration monitoring"""
    try:
        # Check database connectivity
        db.session.execute('SELECT 1')
        
        # Check if we can generate a test JWT
        test_jwt = generate_sonosuite_jwt("test@example.com", "12345")
        
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "database": "up",
                "jwt_generation": "up" if test_jwt else "down",
                "sonosuite_config": "up" if SONOSUITE_SHARED_SECRET else "down"
            }
        }
        
        return jsonify(health_status), 200
        
    except Exception as e:
        health_status = {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }
        
        sonosuite_logger.error(f"Health check failed: {str(e)}")
        return jsonify(health_status), 503
    
@api.route('/subscriptions/status', methods=['GET'])
@jwt_required()
def get_subscription_status():
    user_id = get_jwt_identity()
    
    subscription = Subscription.query.filter_by(
        user_id=user_id,
        status="active"
    ).first()
    
    if not subscription:
        # Check if user is on trial
        user = User.query.get(user_id)
        if user and user.is_on_trial:
            return jsonify({
                "subscription": None,
                "trial": {
                    "active": user.is_on_trial,
                    "end_date": user.trial_end_date.isoformat() if user.trial_end_date else None
                },
                "plan": None
            }), 200
        
        return jsonify({
            "subscription": None,
            "trial": {"active": False},
            "plan": None
        }), 200
    
    return jsonify({
        "subscription": subscription.serialize(),
        "trial": {"active": False},
        "plan": subscription.plan.serialize() if subscription.plan else None
    }), 200
from functools import wraps
from flask_jwt_extended import get_jwt_identity
from flask import jsonify
from api.models import Subscription, PricingPlan

def get_user_plan(user_id):
    """Fetch the current active plan for a given user."""
    subscription = Subscription.query.filter_by(user_id=user_id, active=True).first()
    if subscription and subscription.plan:
        return subscription.plan
    return None

def plan_required(feature_field):
    """
    Restrict route access to users with a specific feature in their subscription plan.
    
    Usage:
        @plan_required("includes_merch_sales")
    """
    def wrapper(fn):
        @wraps(fn)
        def decorated_function(*args, **kwargs):
            user_id = get_jwt_identity()
            plan = get_user_plan(user_id)

            if not plan:
                return jsonify({"error": "Subscription plan not found."}), 403

            has_feature = getattr(plan, feature_field, False)
            if not has_feature:
                return jsonify({
                    "error": f"This feature requires a subscription that includes '{feature_field.replace('_', ' ')}'."
                }), 403

            return fn(*args, **kwargs)
        return decorated_function
    return wrapper

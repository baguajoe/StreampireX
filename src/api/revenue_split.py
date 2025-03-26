# revenue_split.py

from datetime import datetime
from .utils import calculate_split  # Import the calculate_split function from utils
from api.models import AdRevenue, db  # Ensure you import the AdRevenue model and db session

def calculate_ad_revenue(amount, creator_id):
    revenue_type = "ad_revenue"  # This is for ad revenue
    split = calculate_split(amount, revenue_type)

    # Store the split in the AdRevenue model
    ad_revenue = AdRevenue(
        creator_id=creator_id,  # The actual creator ID (usually from the logged-in user)
        amount=amount,
        source="Ad Network",  # This can be dynamic based on the ad network
        created_at=datetime.utcnow()
    )
    db.session.add(ad_revenue)
    db.session.commit()

    return {
        "platform_cut": split['platform_cut'],
        "creator_earnings": split['creator_earnings'],
    }

from api.models import db, PricingPlan
from datetime import datetime
from src.app import app  # Ensure this initializes Flask app & db

with app.app_context():
    plans = [
        PricingPlan(
            name="Starter",
            price_monthly=9.99,
            price_yearly=99.99,
            trial_days=7,
            includes_podcasts=True,
            includes_radio=False,
            includes_digital_sales=False,
            includes_merch_sales=False,
            created_at=datetime.utcnow()
        ),
        PricingPlan(
            name="Creator",
            price_monthly=19.99,
            price_yearly=199.99,
            trial_days=14,
            includes_podcasts=True,
            includes_radio=True,
            includes_digital_sales=True,
            includes_merch_sales=False,
            created_at=datetime.utcnow()
        ),
        PricingPlan(
            name="Pro",
            price_monthly=29.99,
            price_yearly=299.99,
            trial_days=30,
            includes_podcasts=True,
            includes_radio=True,
            includes_digital_sales=True,
            includes_merch_sales=True,
            created_at=datetime.utcnow()
        )
    ]

    for plan in plans:
        if not PricingPlan.query.filter_by(name=plan.name).first():
            db.session.add(plan)

    db.session.commit()
    print("✅ Pricing plans seeded!")

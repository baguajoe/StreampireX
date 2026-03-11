
import click
from src.api.models import db, User

"""
In this file, you can add as many commands as you want using the @app.cli.command decorator
Flask commands are usefull to run cronjobs or tasks outside of the API but sill in integration 
with youy database, for example: Import the price of bitcoin every night as 12am
"""
def setup_commands(app):
    
    """ 
    This is an example command "insert-test-users" that you can run from the command line
    by typing: $ flask insert-test-users 5
    Note: 5 is the number of users to add
    """
    @app.cli.command("insert-test-users") # name of our command
    @click.argument("count") # argument of out command
    def insert_test_users(count):
        print("Creating test users")
        for x in range(1, int(count) + 1):
            user = User()
            user.email = "test_user" + str(x) + "@test.com"
            user.password = "123456"
            user.is_active = True
            db.session.add(user)
            db.session.commit()
            print("User: ", user.email, " created.")

        print("All test users created")

    @app.cli.command("insert-test-data")
    def insert_test_data():
        pass
    @app.cli.command("update-prices")
def update_prices():
    """Update pricing tiers to new 2026 prices"""
    from src.api.models import db, PricingPlan
    renames = [
        ("Creator", "Pro",     34.99, 349.00),
        ("Pro",     "Studio",  49.99, 499.00),
        ("Starter", "Starter", 19.99, 199.00),
    ]
    for old_name, new_name, monthly, yearly in renames:
        plan = PricingPlan.query.filter_by(name=old_name).first()
        if plan:
            plan.name = new_name
            plan.price_monthly = monthly
            plan.price_yearly = yearly
            print(f"Updated {old_name} -> {new_name} ${monthly}/mo")
        else:
            print(f"NOT FOUND: {old_name}")
    db.session.commit()
    for p in PricingPlan.query.order_by(PricingPlan.sort_order).all():
        print(f"  {p.name}: ${p.price_monthly}/mo")
    print("Done.")

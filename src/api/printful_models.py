"""
Add these two models to src/api/models.py
Place them near the bottom before the last line
"""

# ── CreatorProduct model ──────────────────────────────────────────────────────
CREATOR_PRODUCT_MODEL = '''
class CreatorProduct(db.Model):
    __tablename__ = "creator_products"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default="")
    printful_product_id = db.Column(db.Integer, nullable=False)
    printful_variant_id = db.Column(db.Integer, nullable=False)
    retail_price = db.Column(db.Float, nullable=False)
    artwork_url = db.Column(db.String(500), nullable=False)
    mockup_url = db.Column(db.String(500), nullable=False)
    category = db.Column(db.String(100), default="Apparel")
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "description": self.description,
            "price": self.retail_price,
            "mockup_url": self.mockup_url,
            "category": self.category,
            "is_active": self.is_active
        }
'''

# ── MerchOrder model ──────────────────────────────────────────────────────────
MERCH_ORDER_MODEL = '''
class MerchOrder(db.Model):
    __tablename__ = "merch_orders"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("creator_products.id"), nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    retail_price = db.Column(db.Float, nullable=False)
    platform_fee = db.Column(db.Float, default=0.0)
    stripe_payment_intent = db.Column(db.String(200))
    printful_order_id = db.Column(db.String(100))
    shipping_name = db.Column(db.String(200))
    shipping_address = db.Column(db.String(300))
    shipping_city = db.Column(db.String(100))
    shipping_state = db.Column(db.String(50))
    shipping_country = db.Column(db.String(10), default="US")
    shipping_zip = db.Column(db.String(20))
    status = db.Column(db.String(50), default="pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
'''

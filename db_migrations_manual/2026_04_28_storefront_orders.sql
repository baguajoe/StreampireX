-- MC-1 (Marketplace Consolidation, Path B): storefront_orders table.
-- Idempotent migration. Run before next Railway redeploy.

CREATE TABLE IF NOT EXISTS storefront_orders (
    id                      SERIAL PRIMARY KEY,
    product_id              INTEGER NOT NULL REFERENCES product(id),
    creator_id              INTEGER NOT NULL REFERENCES "user"(id),
    buyer_id                INTEGER NOT NULL REFERENCES "user"(id),
    quantity                INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price              NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    subtotal                NUMERIC(10,2) NOT NULL CHECK (subtotal  >= 0),
    platform_fee            NUMERIC(10,2) NOT NULL DEFAULT 0,
    creator_earnings        NUMERIC(10,2) NOT NULL DEFAULT 0,
    fulfillment_type        VARCHAR(32) NOT NULL
                                CHECK (fulfillment_type IN
                                       ('creator_ship','digital_download','pickup')),
    status                  VARCHAR(32) NOT NULL DEFAULT 'pending'
                                CHECK (status IN
                                       ('pending','paid','shipped','delivered',
                                        'cancelled','refunded')),
    shipping_name           VARCHAR(200),
    shipping_address        VARCHAR(300),
    shipping_city           VARCHAR(100),
    shipping_state          VARCHAR(50),
    shipping_country        VARCHAR(10),
    shipping_zip            VARCHAR(20),
    tracking_number         VARCHAR(100),
    carrier                 VARCHAR(50),
    shipped_at              TIMESTAMP,
    delivered_at            TIMESTAMP,
    pickup_notes            TEXT,
    notes_to_buyer          TEXT,
    cancellation_reason     VARCHAR(255),
    stripe_session_id       VARCHAR(200),
    stripe_payment_intent   VARCHAR(200),
    refund_id               VARCHAR(200),
    refunded_at             TIMESTAMP,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_storefront_orders_buyer_id    ON storefront_orders(buyer_id);
CREATE INDEX IF NOT EXISTS ix_storefront_orders_creator_id  ON storefront_orders(creator_id);
CREATE INDEX IF NOT EXISTS ix_storefront_orders_product_id  ON storefront_orders(product_id);
CREATE INDEX IF NOT EXISTS ix_storefront_orders_status      ON storefront_orders(status);
CREATE INDEX IF NOT EXISTS ix_storefront_orders_created_at  ON storefront_orders(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS ux_storefront_orders_session
    ON storefront_orders(stripe_session_id)
    WHERE stripe_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_storefront_orders_pi
    ON storefront_orders(stripe_payment_intent)
    WHERE stripe_payment_intent IS NOT NULL;

SELECT 'storefront_orders' AS tbl,
       EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_name = 'storefront_orders') AS exists;

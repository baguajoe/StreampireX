-- =============================================================================
-- StreamPireX — AI Credits Migration SQL
-- =============================================================================
-- Creates new ai_credits + ai_credit_usage tables
-- Migrates existing video_credits data
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_credits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES "user"(id),
    balance INTEGER DEFAULT 0 NOT NULL,
    monthly_free_credits INTEGER DEFAULT 0,
    monthly_credits_used INTEGER DEFAULT 0,
    monthly_reset_date TIMESTAMP,
    total_purchased INTEGER DEFAULT 0,
    total_used INTEGER DEFAULT 0,
    total_spent FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migrate existing video_credits into ai_credits (preserves all balances)
INSERT INTO ai_credits (user_id, balance, monthly_free_credits, monthly_credits_used,
    monthly_reset_date, total_purchased, total_used, total_spent, created_at)
SELECT user_id, balance, monthly_free_credits, monthly_credits_used,
    monthly_reset_date, total_purchased, total_used, total_spent, created_at
FROM video_credits
ON CONFLICT (user_id) DO NOTHING;

-- Usage tracking table
CREATE TABLE IF NOT EXISTS ai_credit_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id),
    feature VARCHAR(50) NOT NULL,
    credits_used INTEGER NOT NULL,
    metadata_json TEXT,
    storage_provider VARCHAR(20),
    storage_url VARCHAR(500),
    storage_size_bytes BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_credit_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature ON ai_credit_usage(feature);
CREATE INDEX IF NOT EXISTS idx_ai_usage_date ON ai_credit_usage(created_at);

-- Credit pack purchases (skip if already exists from old system)
CREATE TABLE IF NOT EXISTS credit_pack_purchases (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id),
    pack_id VARCHAR(20) NOT NULL,
    pack_name VARCHAR(50),
    credits_amount INTEGER NOT NULL,
    price FLOAT NOT NULL,
    stripe_checkout_session_id VARCHAR(200),
    stripe_payment_intent_id VARCHAR(200),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Done!
-- Old video_credits table is preserved (not deleted) as a backup.
-- You can drop it later: DROP TABLE IF EXISTS video_credits;

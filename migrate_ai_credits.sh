#!/bin/bash
# =============================================================================
# StreamPireX — Universal AI Credits Migration Script
# =============================================================================
# Run from your project root:
#   chmod +x migrate_ai_credits.sh
#   ./migrate_ai_credits.sh
#
# What this does:
#   1. Backs up old ai_video_credits_routes.py (doesn't delete)
#   2. Copies new ai_credits_routes.py into src/api/
#   3. Copies new useAICredits.js hook into src/front/js/component/hooks/
#   4. Swaps the blueprint registration in app.py
#   5. Updates imports in ai_video_generation_routes.py
#   6. Adds webhook handler case in routes.py
#   7. Prints migration SQL to run
# =============================================================================

set -e

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  StreamPireX — Universal AI Credits Migration"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── Check we're in the right directory ────────────────────────────────────
if [ ! -d "src/api" ] || [ ! -d "src/front" ]; then
    echo "❌ ERROR: Run this from your project root (where src/ folder is)"
    echo "   Usage: cd /path/to/your/project && ./migrate_ai_credits.sh"
    exit 1
fi

echo "✅ Project root detected"
echo ""

# ── Step 1: Backup old file ──────────────────────────────────────────────
echo "── Step 1: Backing up old credits file ──"
if [ -f "src/api/ai_video_credits_routes.py" ]; then
    cp src/api/ai_video_credits_routes.py src/api/ai_video_credits_routes.py.bak
    echo "   ✅ Backed up → ai_video_credits_routes.py.bak"
else
    echo "   ⚠️  No existing ai_video_credits_routes.py found (that's fine)"
fi
echo ""

# ── Step 2: Copy new backend file ────────────────────────────────────────
echo "── Step 2: Installing new ai_credits_routes.py ──"
if [ -f "ai_credits_routes.py" ]; then
    cp ai_credits_routes.py src/api/ai_credits_routes.py
    echo "   ✅ Copied ai_credits_routes.py → src/api/"
elif [ -f "/mnt/user-data/outputs/ai_credits_routes.py" ]; then
    cp /mnt/user-data/outputs/ai_credits_routes.py src/api/ai_credits_routes.py
    echo "   ✅ Copied from outputs → src/api/"
else
    echo "   ❌ ai_credits_routes.py not found. Place it in project root or outputs."
    exit 1
fi
echo ""

# ── Step 3: Copy new frontend hook ──────────────────────────────────────
echo "── Step 3: Installing useAICredits.js hook ──"
mkdir -p src/front/js/component/hooks
if [ -f "useAICredits.js" ]; then
    cp useAICredits.js src/front/js/component/hooks/useAICredits.js
    echo "   ✅ Copied useAICredits.js → src/front/js/component/hooks/"
elif [ -f "/mnt/user-data/outputs/useAICredits.js" ]; then
    cp /mnt/user-data/outputs/useAICredits.js src/front/js/component/hooks/useAICredits.js
    echo "   ✅ Copied from outputs → src/front/js/component/hooks/"
else
    echo "   ❌ useAICredits.js not found. Place it in project root or outputs."
    exit 1
fi
echo ""

# ── Step 4: Swap blueprint in app.py ────────────────────────────────────
echo "── Step 4: Updating app.py blueprint registration ──"
if [ -f "src/app.py" ]; then
    APP_FILE="src/app.py"
elif [ -f "app.py" ]; then
    APP_FILE="app.py"
else
    echo "   ⚠️  app.py not found — you'll need to manually update it"
    APP_FILE=""
fi

if [ -n "$APP_FILE" ]; then
    # Comment out old import/register and add new ones
    if grep -q "ai_video_credits_bp" "$APP_FILE"; then
        # Comment out old lines
        sed -i 's/^from api\.ai_video_credits_routes import ai_video_credits_bp/# OLD: from api.ai_video_credits_routes import ai_video_credits_bp  # Replaced by ai_credits_bp/' "$APP_FILE"
        sed -i 's/^from \.ai_video_credits_routes import ai_video_credits_bp/# OLD: from .ai_video_credits_routes import ai_video_credits_bp  # Replaced by ai_credits_bp/' "$APP_FILE"
        sed -i 's/^    app\.register_blueprint(ai_video_credits_bp)/    # OLD: app.register_blueprint(ai_video_credits_bp)  # Replaced by ai_credits_bp/' "$APP_FILE"
        sed -i 's/^app\.register_blueprint(ai_video_credits_bp)/# OLD: app.register_blueprint(ai_video_credits_bp)  # Replaced by ai_credits_bp/' "$APP_FILE"

        echo "   ✅ Commented out old ai_video_credits_bp references"
    fi

    # Check if new import already exists
    if grep -q "ai_credits_bp" "$APP_FILE" && ! grep -q "# OLD.*ai_credits_bp" "$APP_FILE"; then
        echo "   ℹ️  ai_credits_bp already registered in app.py"
    else
        # Find the last blueprint import line and add after it
        LAST_BP_LINE=$(grep -n "import.*_bp" "$APP_FILE" | tail -1 | cut -d: -f1)
        if [ -n "$LAST_BP_LINE" ]; then
            sed -i "${LAST_BP_LINE}a\\
from api.ai_credits_routes import ai_credits_bp" "$APP_FILE"
            echo "   ✅ Added: from api.ai_credits_routes import ai_credits_bp"
        fi

        # Find last register_blueprint line and add after it
        LAST_REG_LINE=$(grep -n "register_blueprint" "$APP_FILE" | grep -v "# OLD" | tail -1 | cut -d: -f1)
        if [ -n "$LAST_REG_LINE" ]; then
            # Detect indentation
            INDENT=$(sed -n "${LAST_REG_LINE}p" "$APP_FILE" | sed 's/\(^[[:space:]]*\).*/\1/')
            sed -i "${LAST_REG_LINE}a\\
${INDENT}app.register_blueprint(ai_credits_bp)" "$APP_FILE"
            echo "   ✅ Added: app.register_blueprint(ai_credits_bp)"
        fi
    fi
fi
echo ""

# ── Step 5: Update ai_video_generation_routes.py imports ────────────────
echo "── Step 5: Updating ai_video_generation_routes.py imports ──"
VID_GEN="src/api/ai_video_generation_routes.py"
if [ -f "$VID_GEN" ]; then
    if grep -q "from .ai_video_credits_routes import" "$VID_GEN"; then
        sed -i 's/from \.ai_video_credits_routes import/from .ai_credits_routes import/' "$VID_GEN"
        echo "   ✅ Updated import: .ai_video_credits_routes → .ai_credits_routes"
    elif grep -q "from api.ai_video_credits_routes import" "$VID_GEN"; then
        sed -i 's/from api\.ai_video_credits_routes import/from api.ai_credits_routes import/' "$VID_GEN"
        echo "   ✅ Updated import: api.ai_video_credits_routes → api.ai_credits_routes"
    else
        echo "   ℹ️  No old import found to update (may already be correct)"
    fi
else
    echo "   ⚠️  ai_video_generation_routes.py not found"
fi
echo ""

# ── Step 6: Add webhook case in routes.py ────────────────────────────────
echo "── Step 6: Adding webhook handler for AI credit purchases ──"
ROUTES="src/api/routes.py"
if [ -f "$ROUTES" ]; then
    if grep -q "ai_credit_purchase" "$ROUTES"; then
        echo "   ℹ️  Webhook handler already exists in routes.py"
    else
        # Find the handle_checkout_completed function and add the case
        # Look for the line with 'credit_pack_purchase' or last elif in checkout handler
        if grep -q "credit_pack_purchase" "$ROUTES"; then
            # Replace old credit_pack_purchase handler with new ai_credit_purchase
            sed -i "s/metadata.get('type') == 'credit_pack_purchase'/metadata.get('type') in ('credit_pack_purchase', 'ai_credit_purchase')/" "$ROUTES"
            echo "   ✅ Updated webhook to handle both old and new credit purchase types"
        else
            echo "   ⚠️  Could not auto-add webhook case. Add this manually to handle_checkout_completed():"
            echo ""
            echo "      elif session.get('metadata', {}).get('type') == 'ai_credit_purchase':"
            echo "          from api.ai_credits_routes import handle_ai_credit_purchase"
            echo "          handle_ai_credit_purchase(session)"
            echo ""
        fi
    fi
else
    echo "   ⚠️  routes.py not found at src/api/routes.py"
fi
echo ""

# ── Step 7: Print migration SQL ──────────────────────────────────────────
echo "── Step 7: Database Migration ──"
echo ""
echo "   Run this SQL against your database to create the new tables"
echo "   and migrate existing video credits data:"
echo ""
echo "   ┌──────────────────────────────────────────────────────────┐"
echo "   │  Using Railway/PostgreSQL:                               │"
echo "   │  railway run psql < migrate_ai_credits.sql               │"
echo "   │                                                          │"
echo "   │  Or paste into your DB client:                           │"
echo "   └──────────────────────────────────────────────────────────┘"
echo ""

# Write migration SQL to file
cat > migrate_ai_credits.sql << 'SQLEOF'
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
SQLEOF

echo "   ✅ Migration SQL written to: migrate_ai_credits.sql"
echo ""

# ── Summary ──────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ Migration Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  Files installed:"
echo "    📄 src/api/ai_credits_routes.py (backend)"
echo "    📄 src/front/js/component/hooks/useAICredits.js (frontend)"
echo "    📄 migrate_ai_credits.sql (database migration)"
echo ""
echo "  Files updated:"
echo "    📄 app.py (blueprint swap)"
echo "    📄 ai_video_generation_routes.py (import update)"
echo "    📄 routes.py (webhook handler)"
echo ""
echo "  Files backed up:"
echo "    📄 src/api/ai_video_credits_routes.py.bak"
echo ""
echo "  ⚠️  NEXT STEPS:"
echo "    1. Run the migration SQL against your database"
echo "    2. Test: GET /api/ai/credits should return your balance"
echo "    3. Test: Video generation still works"
echo "    4. Test: Stripe credit purchase flow"
echo ""
echo "  💡 Frontend usage:"
echo "    import useAICredits from './hooks/useAICredits';"
echo "    const { canUse, useFeature, balance } = useAICredits();"
echo ""

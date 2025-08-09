# run_migration.py - Python script to run the SQL migration

import os
import psycopg2
from dotenv import load_dotenv
from urllib.parse import urlparse

# Load environment variables
load_dotenv()

# Get database URL
database_url = os.getenv('DATABASE_URL')
if not database_url:
    print("❌ DATABASE_URL not found in environment variables")
    exit(1)

# Parse database URL
parsed = urlparse(database_url)

# SQL migration script
migration_sql = """
-- Migration script to add new columns to pricing_plan table
ALTER TABLE pricing_plan 
ADD COLUMN IF NOT EXISTS includes_music_distribution BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sonosuite_access BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS distribution_uploads_limit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS includes_gaming_features BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS includes_team_rooms BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS includes_squad_finder BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS includes_gaming_analytics BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS includes_game_streaming BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS includes_gaming_monetization BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS includes_video_distribution BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS video_uploads_limit INTEGER DEFAULT 0;

-- Create SonoSuite user mapping table
CREATE TABLE IF NOT EXISTS sono_suite_user (
    id SERIAL PRIMARY KEY,
    streampirex_user_id INTEGER NOT NULL REFERENCES "user"(id),
    sonosuite_external_id VARCHAR(255) NOT NULL UNIQUE,
    sonosuite_email VARCHAR(255) NOT NULL,
    jwt_secret VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Insert the four main pricing plans
INSERT INTO pricing_plan (
    name, price_monthly, price_yearly, trial_days,
    includes_podcasts, includes_radio, includes_digital_sales, includes_merch_sales,
    includes_live_events, includes_tip_jar, includes_ad_revenue,
    includes_music_distribution, sonosuite_access, distribution_uploads_limit,
    includes_gaming_features, includes_team_rooms, includes_squad_finder,
    includes_gaming_analytics, includes_game_streaming, includes_gaming_monetization,
    includes_video_distribution, video_uploads_limit
) VALUES 
-- Free Plan
('Free', 0.00, 0.00, 0, 
 FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, -- Core features
 FALSE, FALSE, 0, -- Music distribution
 TRUE, FALSE, TRUE, FALSE, FALSE, FALSE, -- Gaming features
 FALSE, 0), -- Video distribution

-- Basic Plan  
('Basic', 11.99, 119.00, 14,
 FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, -- Core features
 FALSE, FALSE, 0, -- Music distribution
 TRUE, TRUE, TRUE, TRUE, FALSE, FALSE, -- Gaming features
 FALSE, 0), -- Video distribution

-- Pro Plan
('Pro', 21.99, 219.00, 14,
 TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, TRUE, -- Core features
 TRUE, TRUE, 5, -- Music distribution (5 tracks/month)
 TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, -- Gaming features
 TRUE, 3), -- Video distribution (3 videos/month)

-- Premium Plan
('Premium', 29.99, 299.00, 14,
 TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, -- Core features
 TRUE, TRUE, -1, -- Music distribution (unlimited)
 TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, -- Gaming features
 TRUE, -1) -- Video distribution (unlimited)

ON CONFLICT (name) DO UPDATE SET
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    trial_days = EXCLUDED.trial_days,
    includes_podcasts = EXCLUDED.includes_podcasts,
    includes_radio = EXCLUDED.includes_radio,
    includes_digital_sales = EXCLUDED.includes_digital_sales,
    includes_merch_sales = EXCLUDED.includes_merch_sales,
    includes_live_events = EXCLUDED.includes_live_events,
    includes_tip_jar = EXCLUDED.includes_tip_jar,
    includes_ad_revenue = EXCLUDED.includes_ad_revenue,
    includes_music_distribution = EXCLUDED.includes_music_distribution,
    sonosuite_access = EXCLUDED.sonosuite_access,
    distribution_uploads_limit = EXCLUDED.distribution_uploads_limit,
    includes_gaming_features = EXCLUDED.includes_gaming_features,
    includes_team_rooms = EXCLUDED.includes_team_rooms,
    includes_squad_finder = EXCLUDED.includes_squad_finder,
    includes_gaming_analytics = EXCLUDED.includes_gaming_analytics,
    includes_game_streaming = EXCLUDED.includes_game_streaming,
    includes_gaming_monetization = EXCLUDED.includes_gaming_monetization,
    includes_video_distribution = EXCLUDED.includes_video_distribution,
    video_uploads_limit = EXCLUDED.video_uploads_limit;
"""

try:
    # Connect to database
    conn = psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        user=parsed.username,
        password=parsed.password,
        database=parsed.path[1:]  # Remove leading slash
    )
    
    # Create cursor
    cur = conn.cursor()
    
    print("🔄 Running database migration...")
    
    # Execute migration
    cur.execute(migration_sql)
    
    # Commit changes
    conn.commit()
    
    print("✅ Migration completed successfully!")
    
    # Verify pricing plans were created
    cur.execute("SELECT name, price_monthly FROM pricing_plan ORDER BY price_monthly;")
    plans = cur.fetchall()
    
    print("\n📋 Pricing plans in database:")
    for plan in plans:
        print(f"  - {plan[0]}: ${plan[1]}/month")
    
except psycopg2.Error as e:
    print(f"❌ Database error: {e}")
    if conn:
        conn.rollback()
        
except Exception as e:
    print(f"❌ Error: {e}")
    
finally:
    # Close connections
    if 'cur' in locals():
        cur.close()
    if 'conn' in locals():
        conn.close()
    
print("\n🎉 Migration script completed!")
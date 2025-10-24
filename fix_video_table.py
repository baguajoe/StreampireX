import eventlet
eventlet.monkey_patch()

import os
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.api.models import db
from src.app import app

def add_missing_columns():
    with app.app_context():
        sql = """
        ALTER TABLE video ADD COLUMN IF NOT EXISTS channel_id INTEGER;
        ALTER TABLE video ADD COLUMN IF NOT EXISTS category VARCHAR(100);
        ALTER TABLE video ADD COLUMN IF NOT EXISTS age_restricted BOOLEAN DEFAULT FALSE;
        ALTER TABLE video ADD COLUMN IF NOT EXISTS made_for_kids BOOLEAN DEFAULT FALSE;
        ALTER TABLE video ADD COLUMN IF NOT EXISTS contains_paid_promotion BOOLEAN DEFAULT FALSE;
        ALTER TABLE video ADD COLUMN IF NOT EXISTS original_content BOOLEAN DEFAULT TRUE;
        ALTER TABLE video ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN DEFAULT TRUE;
        ALTER TABLE video ADD COLUMN IF NOT EXISTS allow_likes BOOLEAN DEFAULT TRUE;
        ALTER TABLE video ADD COLUMN IF NOT EXISTS allow_embedding BOOLEAN DEFAULT TRUE;
        ALTER TABLE video ADD COLUMN IF NOT EXISTS allow_downloads BOOLEAN DEFAULT FALSE;
        """
        
        fk_sql = """
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'fk_video_channel_id'
            ) THEN
                ALTER TABLE video ADD CONSTRAINT fk_video_channel_id 
                    FOREIGN KEY (channel_id) REFERENCES video_channels(id);
            END IF;
        END $$;
        """
        
        try:
            print("📝 Adding missing columns to video table...")
            db.session.execute(db.text(sql))
            print("🔗 Adding foreign key constraint...")
            db.session.execute(db.text(fk_sql))
            db.session.commit()
            print("✅ Success! All columns added.")
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    add_missing_columns()

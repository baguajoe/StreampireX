from api.models import db
from api import create_app

app = create_app()

with app.app_context():
    try:
        # Execute the migration
        db.engine.execute('''
            ALTER TABLE video ADD COLUMN IF NOT EXISTS timeline_data JSON DEFAULT '{"tracks": []}';
            ALTER TABLE video ADD COLUMN IF NOT EXISTS width INTEGER DEFAULT 1920;
            ALTER TABLE video ADD COLUMN IF NOT EXISTS height INTEGER DEFAULT 1080; 
            ALTER TABLE video ADD COLUMN IF NOT EXISTS frame_rate INTEGER DEFAULT 30;
            ALTER TABLE video_clips ADD COLUMN IF NOT EXISTS timeline_start FLOAT DEFAULT 0;
            ALTER TABLE video_clips ADD COLUMN IF NOT EXISTS timeline_end FLOAT DEFAULT 0;
            ALTER TABLE video_clips ADD COLUMN IF NOT EXISTS track_id INTEGER DEFAULT 1;
        ''')
        db.session.commit()
        print("✅ Video editor migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.session.rollback()
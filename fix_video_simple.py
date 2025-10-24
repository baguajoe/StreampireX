import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Get database URL from environment
db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("❌ DATABASE_URL not found in environment")
    exit(1)

# Fix postgres:// to postgresql://
db_url = db_url.replace("postgres://", "postgresql://")

print(f"🔗 Connecting to database...")

try:
    # Connect to database
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    
    print("📝 Adding missing columns to video table...")
    
    # Add all missing columns
    columns = [
        "ALTER TABLE video ADD COLUMN IF NOT EXISTS channel_id INTEGER;",
        "ALTER TABLE video ADD COLUMN IF NOT EXISTS category VARCHAR(100);",
        "ALTER TABLE video ADD COLUMN IF NOT EXISTS age_restricted BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE video ADD COLUMN IF NOT EXISTS made_for_kids BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE video ADD COLUMN IF NOT EXISTS contains_paid_promotion BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE video ADD COLUMN IF NOT EXISTS original_content BOOLEAN DEFAULT TRUE;",
        "ALTER TABLE video ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN DEFAULT TRUE;",
        "ALTER TABLE video ADD COLUMN IF NOT EXISTS allow_likes BOOLEAN DEFAULT TRUE;",
        "ALTER TABLE video ADD COLUMN IF NOT EXISTS allow_embedding BOOLEAN DEFAULT TRUE;",
        "ALTER TABLE video ADD COLUMN IF NOT EXISTS allow_downloads BOOLEAN DEFAULT FALSE;"
    ]
    
    for sql in columns:
        cursor.execute(sql)
        print(f"  ✓ {sql.split('ADD COLUMN IF NOT EXISTS')[1].split()[0]}")
    
    # Add foreign key constraint
    print("�� Adding foreign key constraint...")
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
    cursor.execute(fk_sql)
    
    # Commit changes
    conn.commit()
    print("✅ Success! All columns added to video table.")
    
    # Show all video table columns
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'video' 
        ORDER BY ordinal_position;
    """)
    
    print("\n📋 Current video table columns:")
    print("-" * 50)
    for row in cursor.fetchall():
        print(f"  {row[0]:<30} {row[1]}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    if cursor:
        cursor.close()
    if conn:
        conn.close()


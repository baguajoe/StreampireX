# =============================================================================
# seed_pricing_plans.py - Complete 4-Tier Seeder (All Fields + AI Features)
# =============================================================================
# Run: python seed_pricing_plans.py
# =============================================================================

from api.models import db, PricingPlan
from datetime import datetime
from src.app import app

# File size constants
MB = 1024 * 1024
GB = 1024 * MB

with app.app_context():
    plans = [
        # =====================================================================
        # FREE TIER - $0
        # =====================================================================
        PricingPlan(
            name="Free",
            price_monthly=0.00,
            price_yearly=0.00,
            trial_days=0,
            sort_order=1,
            
            # Core Platform Features
            includes_podcasts=False,
            includes_radio=False,
            includes_digital_sales=False,
            includes_merch_sales=False,
            includes_live_events=False,
            includes_tip_jar=True,
            includes_ad_revenue=False,
            
            # Video Editing - Quality & Limits
            export_quality="1080p",
            max_export_quality="1080p",
            max_projects=5,
            max_tracks=4,
            max_tracks_per_project=4,
            max_clips_per_track=10,
            storage_gb=5,
            watermark=True,
            max_export_duration=600,  # 10 min
            
            # Video Editing - File Size Limits
            video_clip_max_size=500 * MB,
            audio_clip_max_size=100 * MB,
            image_max_size=10 * MB,
            project_total_max_size=2 * GB,
            
            # Video Editing - Export & Features
            export_formats=['mp4'],
            collaboration_enabled=False,
            collaboration_seats=0,
            audio_separation_enabled=False,
            advanced_effects_enabled=False,
            priority_export_enabled=False,
            
            # Streaming
            includes_streaming=False,
            max_stream_quality=None,
            max_viewers=0,
            includes_stream_recording=False,
            includes_simulcast=False,
            simulcast_destinations=0,
            
            # Podcasts & Radio
            max_podcast_episodes=0,
            max_radio_stations=0,
            includes_auto_dj=False,
            
            # AI Features
            includes_ai_mastering=False,
            ai_mastering_limit=0,
            includes_ai_radio_dj=False,
            includes_ai_voice_clone=False,
            ai_dj_personas=0,
            
            # Gaming
            includes_gaming_features=True,
            includes_gaming_community=True,
            includes_squad_finder=True,
            includes_team_rooms=False,
            max_team_rooms=1,
            includes_gaming_analytics=False,
            includes_game_streaming=False,
            includes_gaming_monetization=False,
            includes_cloud_gaming=False,
            
            # Cross-Posting
            platform_export_enabled=True,
            cross_post_platforms=1,
            cross_posts_per_day=1,
            allowed_platforms=['youtube'],
            
            # Music Distribution
            includes_music_distribution=False,
            sonosuite_access=False,
            distribution_uploads_limit=0,
            distribution_royalty_rate=0,
            includes_performance_royalties=False,
            
            # Video Distribution
            includes_video_distribution=False,
            video_uploads_limit=0,
            
            # Support
            support_level="community",
            includes_early_access=False,
            
            created_at=datetime.utcnow()
        ),
        
        # =====================================================================
        # STARTER TIER - $10.99/month
        # =====================================================================
        PricingPlan(
            name="Starter",
            price_monthly=10.99,
            price_yearly=109.99,
            trial_days=7,
            sort_order=2,
            
            # Core Platform Features
            includes_podcasts=True,
            includes_radio=True,
            includes_digital_sales=False,
            includes_merch_sales=False,
            includes_live_events=False,
            includes_tip_jar=True,
            includes_ad_revenue=False,
            
            # Video Editing - Quality & Limits
            export_quality="1080p",
            max_export_quality="1080p",
            max_projects=15,
            max_tracks=8,
            max_tracks_per_project=8,
            max_clips_per_track=25,
            storage_gb=25,
            watermark=False,
            max_export_duration=3600,  # 60 min
            
            # Video Editing - File Size Limits
            video_clip_max_size=1 * GB,
            audio_clip_max_size=200 * MB,
            image_max_size=25 * MB,
            project_total_max_size=5 * GB,
            
            # Video Editing - Export & Features
            export_formats=['mp4', 'mov'],
            collaboration_enabled=False,
            collaboration_seats=0,
            audio_separation_enabled=False,
            advanced_effects_enabled=True,
            priority_export_enabled=False,
            
            # Streaming
            includes_streaming=True,
            max_stream_quality="720p",
            max_viewers=100,
            includes_stream_recording=False,
            includes_simulcast=False,
            simulcast_destinations=0,
            
            # Podcasts & Radio
            max_podcast_episodes=5,
            max_radio_stations=1,
            includes_auto_dj=False,
            
            # AI Features
            includes_ai_mastering=True,
            ai_mastering_limit=3,              # 3 masters per month
            includes_ai_radio_dj=False,
            includes_ai_voice_clone=False,
            ai_dj_personas=0,
            
            # Gaming
            includes_gaming_features=True,
            includes_gaming_community=True,
            includes_squad_finder=True,
            includes_team_rooms=True,
            max_team_rooms=3,
            includes_gaming_analytics=True,
            includes_game_streaming=False,
            includes_gaming_monetization=False,
            includes_cloud_gaming=False,
            
            # Cross-Posting
            platform_export_enabled=True,
            cross_post_platforms=3,
            cross_posts_per_day=5,
            allowed_platforms=['youtube', 'instagram', 'tiktok'],
            
            # Music Distribution
            includes_music_distribution=False,
            sonosuite_access=False,
            distribution_uploads_limit=0,
            distribution_royalty_rate=0,
            includes_performance_royalties=False,
            
            # Video Distribution
            includes_video_distribution=False,
            video_uploads_limit=0,
            
            # Support
            support_level="email",
            includes_early_access=False,
            
            created_at=datetime.utcnow()
        ),
        
        # =====================================================================
        # CREATOR TIER - $20.99/month (MOST POPULAR)
        # =====================================================================
        PricingPlan(
            name="Creator",
            price_monthly=20.99,
            price_yearly=209.99,
            trial_days=14,
            sort_order=3,
            
            # Core Platform Features
            includes_podcasts=True,
            includes_radio=True,
            includes_digital_sales=True,
            includes_merch_sales=False,
            includes_live_events=True,
            includes_tip_jar=True,
            includes_ad_revenue=True,
            
            # Video Editing - Quality & Limits
            export_quality="4K",
            max_export_quality="4K",
            max_projects=-1,  # Unlimited
            max_tracks=24,
            max_tracks_per_project=24,
            max_clips_per_track=50,
            storage_gb=100,
            watermark=False,
            max_export_duration=-1,  # Unlimited
            
            # Video Editing - File Size Limits
            video_clip_max_size=2 * GB,
            audio_clip_max_size=500 * MB,
            image_max_size=50 * MB,
            project_total_max_size=10 * GB,
            
            # Video Editing - Export & Features
            export_formats=['mp4', 'mov', 'webm', 'avi'],
            collaboration_enabled=True,
            collaboration_seats=8,
            audio_separation_enabled=True,
            advanced_effects_enabled=True,
            priority_export_enabled=True,
            
            # Streaming
            includes_streaming=True,
            max_stream_quality="4K",
            max_viewers=1000,
            includes_stream_recording=True,
            includes_simulcast=False,
            simulcast_destinations=0,
            
            # Podcasts & Radio
            max_podcast_episodes=-1,  # Unlimited
            max_radio_stations=3,
            includes_auto_dj=True,
            
            # AI Features
            includes_ai_mastering=True,
            ai_mastering_limit=15,             # 15 masters per month
            includes_ai_radio_dj=True,
            includes_ai_voice_clone=False,
            ai_dj_personas=7,                  # All 7 preset personas
            
            # Gaming
            includes_gaming_features=True,
            includes_gaming_community=True,
            includes_squad_finder=True,
            includes_team_rooms=True,
            max_team_rooms=10,
            includes_gaming_analytics=True,
            includes_game_streaming=True,
            includes_gaming_monetization=True,
            includes_cloud_gaming=False,
            
            # Cross-Posting
            platform_export_enabled=True,
            cross_post_platforms=8,
            cross_posts_per_day=10,
            allowed_platforms=['youtube', 'instagram', 'tiktok', 'twitter', 'facebook', 'linkedin', 'pinterest', 'threads'],
            
            # Music Distribution
            includes_music_distribution=False,
            sonosuite_access=False,
            distribution_uploads_limit=0,
            distribution_royalty_rate=0,
            includes_performance_royalties=False,
            
            # Video Distribution
            includes_video_distribution=True,
            video_uploads_limit=20,
            
            # Support
            support_level="priority",
            includes_early_access=False,
            
            created_at=datetime.utcnow()
        ),
        
        # =====================================================================
        # PRO TIER - $29.99/month (ULTIMATE)
        # =====================================================================
        PricingPlan(
            name="Pro",
            price_monthly=29.99,
            price_yearly=299.99,
            trial_days=30,
            sort_order=4,
            
            # Core Platform Features
            includes_podcasts=True,
            includes_radio=True,
            includes_digital_sales=True,
            includes_merch_sales=True,
            includes_live_events=True,
            includes_tip_jar=True,
            includes_ad_revenue=True,
            
            # Video Editing - Quality & Limits
            export_quality="8K",
            max_export_quality="8K",
            max_projects=-1,  # Unlimited
            max_tracks=50,
            max_tracks_per_project=50,
            max_clips_per_track=-1,  # Unlimited
            storage_gb=-1,  # Unlimited
            watermark=False,
            max_export_duration=-1,  # Unlimited
            
            # Video Editing - File Size Limits
            video_clip_max_size=5 * GB,
            audio_clip_max_size=1 * GB,
            image_max_size=100 * MB,
            project_total_max_size=-1,  # Unlimited
            
            # Video Editing - Export & Features
            export_formats=['mp4', 'mov', 'webm', 'avi', 'mkv', 'prores'],
            collaboration_enabled=True,
            collaboration_seats=-1,  # Unlimited
            audio_separation_enabled=True,
            advanced_effects_enabled=True,
            priority_export_enabled=True,
            
            # Streaming
            includes_streaming=True,
            max_stream_quality="4K",
            max_viewers=-1,  # Unlimited
            includes_stream_recording=True,
            includes_simulcast=True,
            simulcast_destinations=5,
            
            # Podcasts & Radio
            max_podcast_episodes=-1,  # Unlimited
            max_radio_stations=-1,  # Unlimited
            includes_auto_dj=True,
            
            # AI Features
            includes_ai_mastering=True,
            ai_mastering_limit=-1,             # Unlimited masters
            includes_ai_radio_dj=True,
            includes_ai_voice_clone=True,      # Clone your own voice!
            ai_dj_personas=-1,                 # All personas + custom
            
            # Gaming
            includes_gaming_features=True,
            includes_gaming_community=True,
            includes_squad_finder=True,
            includes_team_rooms=True,
            max_team_rooms=-1,  # Unlimited
            includes_gaming_analytics=True,
            includes_game_streaming=True,
            includes_gaming_monetization=True,
            includes_cloud_gaming=True,
            
            # Cross-Posting
            platform_export_enabled=True,
            cross_post_platforms=-1,  # All
            cross_posts_per_day=-1,  # Unlimited
            allowed_platforms=['youtube', 'instagram', 'tiktok', 'twitter', 'facebook', 'linkedin', 'pinterest', 'threads', 'snapchat', 'reddit', 'tumblr'],
            
            # Music Distribution - PRO EXCLUSIVE!
            includes_music_distribution=True,
            sonosuite_access=True,
            distribution_uploads_limit=-1,  # Unlimited
            distribution_royalty_rate=90,
            includes_performance_royalties=True,
            
            # Video Distribution
            includes_video_distribution=True,
            video_uploads_limit=-1,  # Unlimited
            
            # Support
            support_level="24/7 priority",
            includes_early_access=True,
            
            created_at=datetime.utcnow()
        )
    ]

    # =========================================================================
    # INSERT OR UPDATE PLANS
    # =========================================================================
    for plan_data in plans:
        existing = PricingPlan.query.filter_by(name=plan_data.name).first()
        
        if existing:
            # Update existing plan with all fields
            for column in PricingPlan.__table__.columns:
                if column.name not in ['id', 'created_at']:
                    value = getattr(plan_data, column.name, None)
                    if value is not None:
                        setattr(existing, column.name, value)
            existing.updated_at = datetime.utcnow()
            print(f"🔄 Updated: {plan_data.name}")
        else:
            db.session.add(plan_data)
            print(f"✅ Added: {plan_data.name}")

    db.session.commit()
    
    # =========================================================================
    # DISPLAY SUMMARY
    # =========================================================================
    print("\n" + "=" * 70)
    print("✅ 4-TIER PRICING PLANS SEEDED SUCCESSFULLY!")
    print("=" * 70)
    
    print("\n📊 Plans Overview:\n")
    print(f"  {'Tier':<10} | {'Monthly':>8} | {'Yearly':>9} | {'Storage':>10} | {'Quality':>8}")
    print(f"  {'-'*10} | {'-'*8} | {'-'*9} | {'-'*10} | {'-'*8}")
    
    for plan in PricingPlan.query.order_by(PricingPlan.sort_order).all():
        storage = "Unlimited" if plan.storage_gb == -1 else f"{plan.storage_gb}GB"
        print(f"  {plan.name:<10} | ${plan.price_monthly:>7.2f} | ${plan.price_yearly:>8.2f} | {storage:>10} | {plan.export_quality:>8}")
    
    print("\n🎮 Feature Matrix:\n")
    print(f"  {'Tier':<10} | {'Stream':<8} | {'Podcast':<8} | {'Radio':<8} | {'Gaming':<10} | {'Music Dist':<10}")
    print(f"  {'-'*10} | {'-'*8} | {'-'*8} | {'-'*8} | {'-'*10} | {'-'*10}")
    
    for plan in PricingPlan.query.order_by(PricingPlan.sort_order).all():
        stream = "✓" if plan.includes_streaming else "✗"
        podcast = "✓" if plan.includes_podcasts else "✗"
        radio = "✓" if plan.includes_radio else "✗"
        gaming = "✓" if plan.includes_game_streaming else "✗"
        music = "✓ (90%)" if plan.includes_music_distribution else "✗"
        print(f"  {plan.name:<10} | {stream:^8} | {podcast:^8} | {radio:^8} | {gaming:^10} | {music:^10}")
    
    print("\n🤖 AI Features Matrix:\n")
    print(f"  {'Tier':<10} | {'AI Master':<12} | {'Limit':<10} | {'AI DJ':<8} | {'Voice Clone':<12} | {'Personas':<10}")
    print(f"  {'-'*10} | {'-'*12} | {'-'*10} | {'-'*8} | {'-'*12} | {'-'*10}")
    
    for plan in PricingPlan.query.order_by(PricingPlan.sort_order).all():
        ai_master = "✓" if plan.includes_ai_mastering else "✗"
        limit = "Unlimited" if plan.ai_mastering_limit == -1 else f"{plan.ai_mastering_limit}/mo" if plan.ai_mastering_limit > 0 else "—"
        ai_dj = "✓" if plan.includes_ai_radio_dj else "✗"
        clone = "✓" if plan.includes_ai_voice_clone else "✗"
        personas = "All+Custom" if plan.ai_dj_personas == -1 else f"{plan.ai_dj_personas}" if plan.ai_dj_personas > 0 else "—"
        print(f"  {plan.name:<10} | {ai_master:^12} | {limit:^10} | {ai_dj:^8} | {clone:^12} | {personas:^10}")
    
    print("\n" + "=" * 70)
    print("🚀 Ready to launch!")
    print("=" * 70)
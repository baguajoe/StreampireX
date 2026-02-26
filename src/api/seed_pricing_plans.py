# =============================================================================
# seed_pricing_plans.py - Complete 4-Tier Seeder (All Fields + AI Features)
# =============================================================================
# Run: python seed_pricing_plans.py
# Updated Feb 2026 — +$2 across paid tiers for AI deployment costs
# Prices: Free $0 | Starter $12.99 | Creator $22.99 | Pro $31.99
#
# AI Video Credits are a SEPARATE add-on system (not part of subscription).
# Subscription handles: mastering limits, podcast eps, storage, streaming, etc.
# AI Video Studio uses its own credit system:
#   - Free: 3 one-time trial credits
#   - Starter: 10 monthly credits (included with subscription)
#   - Creator: 30 monthly credits (included with subscription)
#   - Pro: 50 monthly credits (included with subscription)
#   - All paid tiers can purchase additional credit packs ($7.99–$59.99)
#   - 1 credit = 1 AI-generated video
#   - Unused monthly credits roll over for 1 billing cycle
#
# Podcast Collab Room (remote multi-participant recording):
#   - Free: No access (upgrade wall)
#   - Starter: 2 participants max
#   - Creator: 4 participants max
#   - Pro: 8 participants max
# =============================================================================

from api.models import db, PricingPlan
from datetime import datetime
from app import app

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
            
            # Podcast Collab Room — Free: NO ACCESS
            includes_podcast_collab=False,
            max_collab_participants=0,
            
            # AI Features
            includes_ai_mastering=False,
            ai_mastering_limit=0,
            includes_ai_radio_dj=False,
            includes_ai_voice_clone=False,
            ai_dj_personas=0,
            
            # AI Video Studio Credits (separate add-on system)
            # Free tier gets 3 one-time trial credits, handled in code
            # No monthly AI video credits
            includes_ai_video_studio=False,
            ai_video_monthly_credits=0,
            ai_video_onetime_credits=3,
            
            # Recording Studio
            # Free tier: 4 tracks, no AI Mix Assistant
            # (Recording studio track limit uses max_tracks field above)
            
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
        # STARTER TIER - $12.99/month ($129.99/year)
        # =====================================================================
        PricingPlan(
            name="Starter",
            price_monthly=12.99,
            price_yearly=129.99,
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
            
            # Podcast Collab Room — Starter: 2 participants
            includes_podcast_collab=True,
            max_collab_participants=2,
            
            # AI Features
            includes_ai_mastering=True,
            ai_mastering_limit=3,              # 3 masters per month
            includes_ai_radio_dj=False,
            includes_ai_voice_clone=False,
            ai_dj_personas=0,
            
            # AI Video Studio Credits (separate add-on, included with subscription)
            includes_ai_video_studio=True,
            ai_video_monthly_credits=10,       # 10 free videos/month with sub
            ai_video_onetime_credits=0,
            
            # Recording Studio
            # Starter: 8 tracks (uses max_tracks above), AI Mix Assistant (browser-side)
            
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
        # CREATOR TIER - $22.99/month ($229.99/year) — MOST POPULAR
        # =====================================================================
        PricingPlan(
            name="Creator",
            price_monthly=22.99,
            price_yearly=229.99,
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
            
            # Podcast Collab Room — Creator: 4 participants
            includes_podcast_collab=True,
            max_collab_participants=4,
            
            # AI Features
            includes_ai_mastering=True,
            ai_mastering_limit=15,             # 15 masters per month
            includes_ai_radio_dj=True,
            includes_ai_voice_clone=False,
            ai_dj_personas=7,                  # All 7 preset personas
            
            # AI Video Studio Credits (separate add-on, included with subscription)
            includes_ai_video_studio=True,
            ai_video_monthly_credits=30,       # 30 free videos/month with sub
            ai_video_onetime_credits=0,
            
            # Recording Studio
            # Creator: 16 tracks (uses max_tracks above = 24 for video, 
            # recording studio enforced separately in RecordingStudio.js)
            # AI Mix Assistant (browser-side)
            
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
        # PRO TIER - $31.99/month ($319.99/year) — ULTIMATE
        # =====================================================================
        PricingPlan(
            name="Pro",
            price_monthly=31.99,
            price_yearly=319.99,
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
            
            # Podcast Collab Room — Pro: 8 participants
            includes_podcast_collab=True,
            max_collab_participants=8,
            
            # AI Features
            includes_ai_mastering=True,
            ai_mastering_limit=-1,             # Unlimited masters
            includes_ai_radio_dj=True,
            includes_ai_voice_clone=True,      # Clone your own voice!
            ai_dj_personas=-1,                 # All personas + custom
            
            # AI Video Studio Credits (separate add-on, included with subscription)
            includes_ai_video_studio=True,
            ai_video_monthly_credits=50,       # 50 free videos/month with sub
            ai_video_onetime_credits=0,
            
            # Recording Studio
            # Pro: 32 tracks (enforced in RecordingStudio.js)
            # AI Mix Assistant (browser + server-side deep analysis via librosa)
            
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
    
    # NEW: AI Video Credits & Collab Room Matrix
    print("\n🎬 AI Video Credits & Podcast Collab Room:\n")
    print(f"  {'Tier':<10} | {'AI Video':<12} | {'Monthly':<12} | {'Collab Room':<12} | {'Max Ppl':<8}")
    print(f"  {'-'*10} | {'-'*12} | {'-'*12} | {'-'*12} | {'-'*8}")
    
    for plan in PricingPlan.query.order_by(PricingPlan.sort_order).all():
        ai_vid = "✓" if getattr(plan, 'includes_ai_video_studio', False) else "3 trial" if plan.name == "Free" else "✗"
        monthly = f"{getattr(plan, 'ai_video_monthly_credits', 0)}/mo" if getattr(plan, 'ai_video_monthly_credits', 0) > 0 else "—"
        collab = "✓" if getattr(plan, 'includes_podcast_collab', False) else "✗"
        max_p = str(getattr(plan, 'max_collab_participants', 0)) if getattr(plan, 'max_collab_participants', 0) > 0 else "—"
        print(f"  {plan.name:<10} | {ai_vid:^12} | {monthly:^12} | {collab:^12} | {max_p:^8}")
    
    print("\n  📝 AI Video Credits are a SEPARATE system from the subscription.")
    print("     Monthly credits are included FREE with each paid tier.")
    print("     Additional credit packs: $7.99–$59.99 (buy anytime).")
    print("     Unused monthly credits roll over for 1 billing cycle.")
    print("     Free tier gets 3 one-time trial credits (no monthly).")
    
    print("\n" + "=" * 70)
    print("🚀 Ready to launch!")
    print("=" * 70)
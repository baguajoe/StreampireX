"""
patch_mix_assistant.py
StreamPireX — AI Mix Assistant Credit + R2 Patch

What this does:
  1. Adds 'ai_mix_assistant' to AI_FEATURE_MIN_TIER in ai_credits_routes.py
       → starter:  browser-only analysis (0 credits, tier-gated)
       → pro:      server-side librosa analysis (0 credits, tier-gated)
  2. Adds 'ai_mix_assistant_deep' to AI_FEATURE_COSTS as 0 (free, but Pro-gated)
  3. Adds R2 upload for mix analysis results in ai_mix_assistant.py
       → saves the analysis JSON report to R2 so users can revisit past analyses

Run:
  python3 patch_mix_assistant.py
"""

import os
import re

REPO = '/workspaces/SpectraSphere'

# ── File paths ────────────────────────────────────────────────────────────────
CREDITS_FILE   = f'{REPO}/src/api/ai_credits_routes.py'
MIX_FILE       = f'{REPO}/src/api/ai_mix_assistant.py'

# ── 1. Patch AI_FEATURE_COSTS + AI_FEATURE_MIN_TIER ─────────────────────────

NEW_COSTS = """
    # ── AI Mix Assistant (free but tier-gated) ────────────────────────────
    'ai_mix_assistant':         0,   # browser-side analysis — Starter+, free
    'ai_mix_assistant_deep':    0,   # server-side librosa analysis — Pro only, free
"""

NEW_MIN_TIER = """
    # ── AI Mix Assistant ──────────────────────────────────────────────────
    'ai_mix_assistant':         'starter',   # browser analysis locked to Starter+
    'ai_mix_assistant_deep':    'pro',        # deep librosa analysis locked to Pro
"""

def patch_credits():
    if not os.path.exists(CREDITS_FILE):
        print(f"❌ Not found: {CREDITS_FILE}")
        _print_manual_credits()
        return False

    with open(CREDITS_FILE, 'r') as f:
        content = f.read()

    changed = False

    # Add to AI_FEATURE_COSTS
    if 'ai_mix_assistant' not in content:
        # Find last 0-credit entry to insert after
        marker = "'vocal_tuner':             0,"
        if marker not in content:
            marker = "'ai_beat_detection':       0,"
        if marker in content:
            content = content.replace(marker, marker + "\n" + NEW_COSTS)
            changed = True
            print("✅ Added ai_mix_assistant to AI_FEATURE_COSTS")
        else:
            print("⚠️  Could not find insertion point in AI_FEATURE_COSTS — add manually:")
            _print_manual_credits()

    else:
        print("✅ ai_mix_assistant already in AI_FEATURE_COSTS")

    # Add to AI_FEATURE_MIN_TIER
    if 'ai_mix_assistant' not in content or "'ai_mix_assistant':         'starter'" not in content:
        # Find last entry in AI_FEATURE_MIN_TIER
        marker = "'ai_video_narration':"
        if marker in content:
            # find the line and append after the min_tier block
            min_tier_marker = "'stem_separation'"
            if min_tier_marker not in content:
                # Try another anchor — end of AI_FEATURE_MIN_TIER dict
                min_tier_end = content.find("# Features with daily limits")
                if min_tier_end > 0:
                    insert_pos = content.rfind("}", 0, min_tier_end)
                    if insert_pos > 0:
                        content = content[:insert_pos] + NEW_MIN_TIER + "\n" + content[insert_pos:]
                        changed = True
                        print("✅ Added ai_mix_assistant to AI_FEATURE_MIN_TIER")
            else:
                content = content.replace(
                    min_tier_marker,
                    "# AI Mix Assistant\n" + NEW_MIN_TIER.strip() + "\n\n    " + min_tier_marker
                )
                changed = True
                print("✅ Added ai_mix_assistant to AI_FEATURE_MIN_TIER")
        else:
            print("⚠️  Could not auto-patch AI_FEATURE_MIN_TIER — add manually:")
            print(NEW_MIN_TIER)
    else:
        print("✅ ai_mix_assistant already in AI_FEATURE_MIN_TIER")

    if changed:
        with open(CREDITS_FILE, 'w') as f:
            f.write(content)

    return True


# ── 2. Patch ai_mix_assistant.py — add R2 save of analysis report ─────────────

R2_IMPORT = """
# R2 storage for mix analysis reports
try:
    from api.r2_storage import upload_to_r2
    _HAS_R2 = True
except ImportError:
    _HAS_R2 = False
"""

R2_SAVE_SNIPPET = '''
def _save_analysis_to_r2(user_id, project_id, analysis_result):
    """Save mix analysis JSON to R2 so users can revisit past reports."""
    if not _HAS_R2:
        return None
    try:
        import json
        from datetime import datetime
        report = json.dumps(analysis_result, indent=2).encode('utf-8')
        key = f"mix-analysis/{user_id}/{project_id}/{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        url = upload_to_r2(report, key, content_type='application/json')
        return url
    except Exception as e:
        print(f"R2 mix analysis save failed (non-fatal): {e}")
        return None
'''

def patch_mix_assistant():
    if not os.path.exists(MIX_FILE):
        print(f"⚠️  {MIX_FILE} not found — skipping R2 patch (file may not exist yet)")
        print("    When ai_mix_assistant.py exists, add these manually:\n")
        print(R2_IMPORT)
        print(R2_SAVE_SNIPPET)
        return False

    with open(MIX_FILE, 'r') as f:
        content = f.read()

    if '_save_analysis_to_r2' in content:
        print("✅ R2 save already in ai_mix_assistant.py")
        return True

    # Add import after existing imports
    if 'from flask import' in content:
        insert_after = content.find('\n\n', content.find('from flask import'))
        content = content[:insert_after] + "\n" + R2_IMPORT + content[insert_after:]

    # Add helper function before first route
    first_route = content.find('@ai_mix_assistant_bp.route')
    if first_route > 0:
        content = content[:first_route] + R2_SAVE_SNIPPET + "\n\n" + content[first_route:]

    # Wire it into the analysis endpoint — save result after analysis
    # Look for the return jsonify pattern and add save call before it
    return_pattern = "return jsonify(analysis_result)"
    if return_pattern in content:
        content = content.replace(
            return_pattern,
            "# Save to R2 for history\n        "
            "_save_analysis_to_r2(\n            "
            "user_id,\n            "
            "data.get('project_id', 'unknown'),\n            "
            "analysis_result\n        )\n        " + return_pattern
        )

    with open(MIX_FILE, 'w') as f:
        f.write(content)

    print("✅ Patched ai_mix_assistant.py with R2 save")
    return True


# ── 3. Print what the AIMixAssistant.js frontend should send to backend ───────

def print_frontend_note():
    print("""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FRONTEND BEHAVIOR (already correct in AIMixAssistant.js):

  Starter/Creator:
    → Uses browser-side Web Audio API analysis (instant)
    → ai_mix_assistant_mode: 'browser'
    → No API call to backend
    → 0 credits deducted (tier gate only)

  Pro:
    → Uses server-side librosa analysis (more accurate)
    → Calls /api/ai/mix-assistant/analyze
    → ai_mix_assistant_mode: 'browser+server'
    → 0 credits deducted (tier gate only, costs nothing to run)
    → Analysis JSON saved to R2: mix-analysis/<user_id>/<project_id>/<ts>.json

  Free:
    → Blocked — upgrade prompt shown
    → 'Upgrade to Starter to unlock AI Mix Assistant'

The AIMixAssistant.js already checks ai_mix_assistant_mode from
useTierAccess to decide whether to use browser or server analysis.
No frontend changes needed.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""")

def _print_manual_credits():
    print("""
Manual additions needed in ai_credits_routes.py:

# In AI_FEATURE_COSTS dict:
'ai_mix_assistant':         0,   # browser analysis — Starter+, free
'ai_mix_assistant_deep':    0,   # librosa analysis — Pro only, free

# In AI_FEATURE_MIN_TIER dict:
'ai_mix_assistant':         'starter',
'ai_mix_assistant_deep':    'pro',
""")


if __name__ == '__main__':
    print("🎚️  Patching AI Mix Assistant credit system + R2...\n")
    patch_credits()
    print()
    patch_mix_assistant()
    print_frontend_note()
    print("Done. Run: git add -A && git commit -m 'AI Mix Assistant: tier gate + R2 analysis history' && git push")

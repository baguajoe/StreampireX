#!/bin/bash
echo ""
echo "🎬 AI Video Studio — File Verification"
echo "========================================"
echo ""
PASS=0; FAIL=0
check_file() { if [ -f "$1" ]; then echo "  ✅ $1"; PASS=$((PASS+1)); else echo "  ❌ MISSING: $1"; FAIL=$((FAIL+1)); fi; }
check_contains() { if grep -q "$2" "$1" 2>/dev/null; then echo "  ✅ $1 contains: $2"; PASS=$((PASS+1)); else echo "  ❌ $1 missing: $2"; FAIL=$((FAIL+1)); fi; }

echo "── Backend Files ──"
check_file "src/api/ai_video_credits_routes.py"
check_file "src/api/ai_video_generation_routes.py"

echo ""
echo "── Frontend Files ──"
check_file "src/front/js/pages/AIVideoStudio.js"
check_file "src/front/styles/AIVideoStudio.css"

echo ""
echo "── Models Added ──"
check_contains "src/api/models.py" "class VideoCredit"
check_contains "src/api/models.py" "class CreditPackPurchase"
check_contains "src/api/models.py" "class AIVideoGeneration"
check_contains "src/api/models.py" "CREDIT_PACKS"

echo ""
echo "── App.py Blueprints ──"
check_contains "src/app.py" "ai_video_credits_bp"
check_contains "src/app.py" "ai_video_gen_bp"

echo ""
echo "── Layout.js Route ──"
check_contains "src/front/js/layout.js" "AIVideoStudio"
check_contains "src/front/js/layout.js" "ai-video-studio"

echo ""
echo "── Sidebar Link ──"
check_contains "src/front/js/component/sidebar.js" "ai-video-studio"

echo ""
echo "── Webhook Handler ──"
check_contains "src/api/routes.py" "credit_pack_purchase"

echo ""
echo "── Requirements ──"
check_contains "requirements.txt" "replicate"

echo ""
echo "========================================"
echo "  Results: $PASS passed, $FAIL failed"
echo "========================================"
if [ $FAIL -eq 0 ]; then echo "  🎉 All checks passed!"; else echo "  ⚠️  Fix the items above."; fi
echo ""

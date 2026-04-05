#!/bin/bash
# SPX Cut Install Script
# Run from repo root: bash install_spxcut.sh
# Expects the downloaded spxcut folder to be in repo root

set -e

REPO_ROOT="$(pwd)"
SRC="$REPO_ROOT/spxcut"

echo "=== SPX Cut Installer ==="
echo "Repo root: $REPO_ROOT"
echo "Source: $SRC"

# Verify source exists
if [ ! -d "$SRC" ]; then
  echo "ERROR: spxcut folder not found in repo root."
  echo "Make sure you extracted the download and the folder is named 'spxcut'"
  exit 1
fi

# Create destination directories
mkdir -p "$REPO_ROOT/src/front/styles"
mkdir -p "$REPO_ROOT/src/front/js/component/videoeditor/hooks"

echo "--- Copying CSS..."
cp "$SRC/src/front/styles/SPXCut.css" \
   "$REPO_ROOT/src/front/styles/SPXCut.css"

echo "--- Copying hooks..."
cp "$SRC/src/front/js/component/videoeditor/hooks/useEditorStore.js" \
   "$REPO_ROOT/src/front/js/component/videoeditor/hooks/useEditorStore.js"

cp "$SRC/src/front/js/component/videoeditor/hooks/useClipDrag.js" \
   "$REPO_ROOT/src/front/js/component/videoeditor/hooks/useClipDrag.js"

cp "$SRC/src/front/js/component/videoeditor/hooks/usePlayback.js" \
   "$REPO_ROOT/src/front/js/component/videoeditor/hooks/usePlayback.js"

echo "--- Copying components..."
COMPONENTS=(
  SPXCutEditor
  SPXCutHeader
  SPXCutTransport
  SPXCutVToolbar
  SPXCutMonitors
  SPXCutMediaBin
  SPXCutTimeline
  SPXCutTrack
  SPXCutClip
  SPXCutRightPanel
  SPXCutFxPanel
  SPXCutDBMeter
  SPXCutExportModal
  SPXCutContextMenu
  SPXCutQuickApply
)

for COMP in "${COMPONENTS[@]}"; do
  cp "$SRC/src/front/js/component/videoeditor/${COMP}.js" \
     "$REPO_ROOT/src/front/js/component/videoeditor/${COMP}.js"
  echo "  ✓ ${COMP}.js"
done

# Fix the stale import in SPXCutRightPanel.js
echo "--- Patching SPXCutRightPanel.js (removing stale import)..."
sed -i "/import.*SPXCutPresetData/d" \
  "$REPO_ROOT/src/front/js/component/videoeditor/SPXCutRightPanel.js"

echo "--- Cleaning up spxcut folder..."
rm -rf "$SRC"

echo ""
echo "=== Install complete. Running build... ==="
npm run build

echo ""
echo "=== Build passed. Pushing to git... ==="
git add -A
git commit -m "feat: SPX Cut full rewrite - 19 files, zero inline CSS, useReducer state, ref-based drag"
git push

echo ""
echo "✅ Done. SPX Cut is live."

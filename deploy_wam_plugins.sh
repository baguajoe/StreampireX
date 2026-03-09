#!/bin/bash
# =============================================================================
# deploy_wam_plugins.sh — Deploy WAM Plugin System to StreamPireX
# =============================================================================
# Run from /workspaces/SpectraSphere root.
# =============================================================================

set -e
echo "🔌 Deploying WAM Plugin System..."

# ── 1. Copy backend ──────────────────────────────────────────────────────────
cp wam_plugin_routes.py src/api/wam_plugin_routes.py
echo "✓ Backend route copied"

# ── 2. Copy frontend files ───────────────────────────────────────────────────
cp WAMPluginHost.js       src/front/js/component/audio/plugins/WAMPluginHost.js
cp WAMPluginStore.js      src/front/js/pages/WAMPluginStore.js
cp WAMPluginSlot.js       src/front/js/component/audio/components/plugins/WAMPluginSlot.js
cp WAMPluginBrowserModal.js src/front/js/component/audio/components/plugins/WAMPluginBrowserModal.js
echo "✓ Frontend files copied"

echo ""
echo "═══════════════════════════════════════════════════════"
echo " MANUAL STEPS REQUIRED (5 quick edits)"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "1. REGISTER BLUEPRINT in app.py:"
echo "   from src.api.wam_plugin_routes import wam_plugin_bp"
echo "   app.register_blueprint(wam_plugin_bp)"
echo ""
echo "2. ADD ROUTE in app.js:"
echo "   import WAMPluginStore from './pages/WAMPluginStore';"
echo "   <Route path=\"/plugin-store\" element={<WAMPluginStore />} />"
echo ""
echo "3. ADD NAV LINK in DAW sidebar or Plugins tab:"
echo "   <Link to=\"/plugin-store\">🔌 Plugin Store</Link>"
echo ""
echo "4. PATCH PluginRackPanel.js (see bottom of WAMPluginSlot.js for exact diff)"
echo "   - Import WAMPluginSlot and getInstalledWAMPlugins"
echo "   - Add wamSlots state"
echo "   - Add WAM branch in handleAddPlugin"
echo "   - Render WAMPluginSlot components below existing rack slots"
echo ""
echo "5. ADD 'WAM Plugins' tab to PluginBrowserModal.js:"
echo "   - Import WAMPluginBrowserModal"
echo "   - Add tab button for 'WAM'"
echo "   - Render <WAMPluginBrowserModal onAddWAM={...} /> in WAM tab"
echo ""
echo "Done! Visit /plugin-store to test."

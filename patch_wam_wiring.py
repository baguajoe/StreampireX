#!/usr/bin/env python3
"""
patch_wam_wiring.py — Auto-patches all 5 WAM wiring steps
Run from /workspaces/SpectraSphere root.
"""

import re, os, sys

ROOT = '/workspaces/SpectraSphere'

def patch_file(path, description, find, insert_after=None, insert_before=None, replace_with=None):
    with open(path, 'r') as f:
        content = f.read()

    if find in content:
        if replace_with is not None:
            new_content = content.replace(find, replace_with, 1)
        elif insert_after:
            new_content = content.replace(find, find + insert_after, 1)
        elif insert_before:
            new_content = content.replace(find, insert_before + find, 1)
        else:
            print(f'  ⚠  No action specified for {description}')
            return
        with open(path, 'w') as f:
            f.write(new_content)
        print(f'  ✓ {description}')
    else:
        print(f'  ⚠  SKIPPED {description} — anchor not found (may already be patched)')

errors = []

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — app.py: register blueprint
# ─────────────────────────────────────────────────────────────────────────────
print('\n[1/5] Patching src/app.py — register wam_plugin_bp...')
APP_PY = f'{ROOT}/src/app.py'
patch_file(
    APP_PY,
    'Register wam_plugin_bp blueprint',
    'app.register_blueprint(comment_bp)',
    insert_after='\nfrom src.api.wam_plugin_routes import wam_plugin_bp\napp.register_blueprint(wam_plugin_bp)',
)

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — layout.js: add import + route
# ─────────────────────────────────────────────────────────────────────────────
print('\n[2/5] Patching layout.js — add WAMPluginStore import + route...')
LAYOUT = f'{ROOT}/src/front/js/layout.js'

# Add import near other page imports
patch_file(
    LAYOUT,
    'Add WAMPluginStore import',
    'import { Navigate }',
    insert_before="import WAMPluginStore from './pages/WAMPluginStore';\n",
)

# Add route before the catch-all * route
patch_file(
    LAYOUT,
    'Add /plugin-store route',
    '<Route path="*" element={<h1>Not found!</h1>} />',
    insert_before='              <Route path="/plugin-store" element={<WAMPluginStore />} />\n              ',
)

# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — PluginRackPanel.js (the audio one): patch WAM slots
# ─────────────────────────────────────────────────────────────────────────────
print('\n[3/5] Patching PluginRackPanel.js — add WAM plugin support...')
RACK = f'{ROOT}/src/front/js/component/audio/components/plugins/PluginRackPanel.js'

# Add imports
patch_file(
    RACK,
    'Add WAMPluginSlot + getInstalledWAMPlugins imports',
    "import PluginSlot from './PluginSlot';",
    insert_after="\nimport WAMPluginSlot from './WAMPluginSlot';\nimport { getInstalledWAMPlugins } from '../../plugins/WAMPluginHost';",
)

# Add wamSlots state after existing rack state
patch_file(
    RACK,
    'Add wamSlots state',
    'const [rack, setRack] = useState([]);',
    insert_after='\n  const [wamSlots, setWamSlots] = useState([]);',
)

# Patch handleAddPlugin to branch on wam: prefix
patch_file(
    RACK,
    'Add WAM branch in handleAddPlugin',
    'const handleAddPlugin = useCallback(async (pluginId) => {\n    if (!trackGraph) return;\n    try {',
    replace_with="""const handleAddPlugin = useCallback(async (pluginId) => {
    if (!trackGraph) return;
    if (pluginId.startsWith('wam:')) {
      const url = pluginId.replace('wam:', '');
      const meta = getInstalledWAMPlugins().find(p => p.url === url);
      if (!meta) return;
      setWamSlots(prev => [...prev, { id: `wam_${Date.now()}`, pluginMeta: meta }]);
      return;
    }
    try {""",
)

# Render WAMPluginSlot components — insert before closing div of rack
patch_file(
    RACK,
    'Render WAMPluginSlot components in JSX',
    '{showBrowser && (',
    insert_before="""      {wamSlots.map(slot => (
        <WAMPluginSlot
          key={slot.id}
          pluginMeta={slot.pluginMeta}
          trackGraph={trackGraph}
          onRemove={() => setWamSlots(prev => prev.filter(s => s.id !== slot.id))}
        />
      ))}
      """,
)

# ─────────────────────────────────────────────────────────────────────────────
# STEP 4 — PluginBrowserModal.js: add WAM tab
# ─────────────────────────────────────────────────────────────────────────────
print('\n[4/5] Patching PluginBrowserModal.js — add WAM Plugins tab...')
BROWSER = f'{ROOT}/src/front/js/component/audio/components/plugins/PluginBrowserModal.js'

# Add import
patch_file(
    BROWSER,
    'Add WAMPluginBrowserModal import',
    "import PluginSlot from './PluginSlot';",
    insert_after="\nimport WAMPluginBrowserModal from './WAMPluginBrowserModal';",
)

# Add WAM tab button — find the last tab button and insert after
patch_file(
    BROWSER,
    'Add WAM tab button',
    'activeTab, setActiveTab',
    insert_after="\n  const [showWAMBrowser, setShowWAMBrowser] = useState(false);",
)

# ─────────────────────────────────────────────────────────────────────────────
# STEP 5 — layout.js: add Plugin Store nav link to DAW
# ─────────────────────────────────────────────────────────────────────────────
print('\n[5/5] Adding Plugin Store nav link note...')
print('  ℹ  Nav link must be added manually inside your DAW sidebar or Plugins tab.')
print('     Add this wherever your DAW navigation links live:')
print("     <Link to='/plugin-store'>🔌 Plugin Store</Link>")
print('     (Search layout.js or RecordingStudio.js for your sidebar nav)')

# ─────────────────────────────────────────────────────────────────────────────
print('\n═══════════════════════════════════════════════════════')
print(' WAM wiring patch complete!')
print('═══════════════════════════════════════════════════════')
print()
print(' Next steps:')
print('   1. Add the Plugin Store nav link manually (step 5 above)')
print('   2. Run: bash setup_wam_self_hosted.sh')
print('   3. git add -A && git commit -m "Wire WAM plugin system" && git push')
print('   4. Visit /plugin-store to test')

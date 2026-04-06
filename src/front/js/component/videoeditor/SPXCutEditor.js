/**
 * SPXCutEditor.js
 * Root component — CSS Grid layout shell only.
 * All business logic lives in hooks and sub-components.
 * Zero inline CSS.
 */
import React, { useEffect, useCallback } from 'react';
// CSS loaded via index.css

import { useEditorStore }    from './hooks/useEditorStore';
import { useClipDrag }       from './hooks/useClipDrag';
import { usePlayback }       from './hooks/usePlayback';

import SPXCutHeader          from './SPXCutHeader';
import SPXCutTransport       from './SPXCutTransport';
import SPXCutVToolbar        from './SPXCutVToolbar';
import SPXCutMonitors        from './SPXCutMonitors';
import SPXCutMediaBin        from './SPXCutMediaBin';
import SPXCutTimeline        from './SPXCutTimeline';
import SPXCutDBMeter         from './SPXCutDBMeter';
import SPXCutRightPanel      from './SPXCutRightPanel';
import SPXCutFxPanel         from './SPXCutFxPanel';
import SPXCutExportModal     from './SPXCutExportModal';
import SPXCutQuickApply      from './SPXCutQuickApply';
import SPXCutContextMenu     from './SPXCutContextMenu';

function SPXCutEditor() {
  const { state, actions, selectors } = useEditorStore();
  const drag = useClipDrag({ actions, selectors, state });
  const playback = usePlayback({ state, actions });

  // Pass current drag context on every render (no stale closures in drag)
  drag.updateDragContext(state.zoom, state.snapEnabled, state.linkedEdit, state.tracks);

  // ── Warn on unsaved changes ─────────────────────────────
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (state.isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [state.isDirty]);

  // ── Close context menu on outside click ─────────────────
  const handleRootClick = useCallback(() => {
    // Context menu is handled inside SPXCutContextMenu
  }, []);

  return (
    <div className="spxcut-root" onClick={handleRootClick}>

      {/* Row 1 — Header */}
      <SPXCutHeader
        state={state}
        actions={actions}
        selectors={selectors}
        playback={playback}
      />

      {/* Row 2 — Transport */}
      <SPXCutTransport
        state={state}
        actions={actions}
        selectors={selectors}
        playback={playback}
      />

      {/* Row 3 — Main Area (5 columns) */}
      <div className="spxcut-main">

        {/* Col 1 — Vertical Toolbar */}
        <SPXCutVToolbar
          activeTool={state.activeTool}
          setTool={actions.setTool}
        />

        {/* Col 2 — Center: monitors + bottom row */}
        <div className="spxcut-center">
          <SPXCutMonitors
            state={state}
            actions={actions}
            selectors={selectors}
            playback={playback}
          />
          <div className="spxcut-bottom-row">
            <SPXCutMediaBin
              state={state}
              actions={actions}
              drag={drag}
            />
            <SPXCutTimeline
              state={state}
              actions={actions}
              selectors={selectors}
              drag={drag}
              playback={playback}
            />
          </div>
        </div>



        {/* Col 4 — Right Panel (Effects/Transform/Presets) */}
        <SPXCutRightPanel
          state={state}
          actions={actions}
          selectors={selectors}
          drag={drag}
        />

        {/* Col 5 — FX Tree Panel */}
        <SPXCutFxPanel
          state={state}
          actions={actions}
          selectors={selectors}
          drag={drag}
        />

      </div>

      {/* Modals / Overlays */}
      {state.showExportModal && (
        <SPXCutExportModal
          state={state}
          actions={actions}
          selectors={selectors}
        />
      )}

      {state.showQuickApply && (
        <SPXCutQuickApply
          state={state}
          actions={actions}
          selectors={selectors}
          drag={drag}
        />
      )}

      <SPXCutContextMenu
        state={state}
        actions={actions}
        selectors={selectors}
        playback={playback}
        drag={drag}
      />

    </div>
  );
}

export default SPXCutEditor;

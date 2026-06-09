## Bug #1: Compressors don't audibly compress

**User-visible symptom:** User cranks threshold/ratio (e.g., -40 dB / 20:1) on the basic `compressor` plugin. Makeup gain knobs make audio louder, but no dynamic reduction is heard. Native `DynamicsCompressorNode` works in isolation (verified in console). Tested with extreme settings — still no compression.

**Code location:** `/workspaces/SpectraSphere/src/front/js/pages/RecordingStudio.js:5681` (updateEffect dispatch), `:6631` (afx calculation), `:7651` (SPXPluginHost dispatch)

**Root cause:** Registry key mismatch between build-time and dispatch-time. At build time, `registerInstance(track.id, pluginKey, inst)` is called (line 1376), storing the instance under key `${track.id}:${pluginKey}`. However, at dispatch time in `updateEffect` (line 5681), the lookup uses `${tracks[ti]?.id}:${fx}` where `tracks[ti]?.id` is looked up fresh from the current state array. If a track was deleted and re-added, or if the state was reset between build and dispatch, `tracks[ti].id` may differ from the original `track.id` that was registered. Additionally, the `afx` object used in SPXPluginHost (line 7651) is computed via `activeEffectsTrack !== null ? tracks[activeEffectsTrack] : null` (line 6631), which retrieves the track by array index, not by object identity. This creates a window where the registry lookup fails because the track object identity or ID has changed, causing `inst` to be undefined and `setParam` calls to silently no-op.

**Category:** Architectural

**Difficulty:** Medium (1-3h)

**Shared with:** none

**Dependencies:** Verify that `track.id` is stable across the component lifecycle and that array-index-based lookups (`tracks[activeEffectsTrack]`) correctly map to the same object that was used during `buildFxChain`.

**Fix approach:** Ensure that `track.id` is immutable (generated once at track creation, persisted through state updates). Verify the dispatch path uses the exact same track object/ID that was used during build. Consider adding a console warning if a registry lookup fails so future regressions are caught immediately. Optionally, refactor to use a trackId parameter explicitly passed through the dispatch chain rather than relying on array index lookups, which are fragile during deletions/reorderings.

---

## Bug #4: Click-drag track selection in arrange view broken

**User-visible symptom:** User drags in empty area of arrange view to make a marquee selection. Nothing happens, or selection box doesn't appear, or it appears but doesn't select clips/regions when released.

**Code location:** `/workspaces/SpectraSphere/src/front/js/component/ArrangerView.js:1431–1458` (track lanes render regions, no marquee selection handler), `:893` (selectedRegion state), `:1207–1209` (deletion uses selectedRegion only)

**Root cause:** The ArrangerView has no marquee selection implementation. Each region individually calls `onSelect(region.id)` on direct click (line 294), and there is a `selectedRegion` state (line 893) that tracks a single selected region by ID. However, there is no `onMouseDown` handler on the empty timeline area (the `.arr-lane` divs or the parent `.arr-timeline-content`) to initiate a marquee drag, no selection box overlay rendering, and no logic to filter regions by bounding box on mouse release. Clicking empty space in the lane selects only the track (line 1433), not regions. Dragging over empty space does nothing because the drag handlers are only on individual Region components (line 339, 348, 374) which call `onSelect(region.id)` synchronously.

**Category:** Pre-existing

**Difficulty:** Medium (1-3h)

**Shared with:** none

**Dependencies:** none

**Fix approach:** Add a marquee selection handler to the track lanes container (or a parent overlay). On `onMouseDown` in empty space, record the start position and render a selection box div. On `onMouseMove`, update the box size. On `onMouseUp`, calculate the bounding box, filter all regions whose `left + width > boxLeft && left < boxRight`, and multi-select them (either replace `selectedRegion` with an array or dispatch a callback that selects all matching region IDs). Ensure the selection box is visible (semi-transparent overlay) and that the final selection is preserved until the user clicks elsewhere or explicitly deselects.

---

## Bug #6: Toolbar in arrange view missing tools (compared to Cubase)

**User-visible symptom:** Standard DAW arrange toolbar usually has: object selection, range selection, split (scissors), glue, eraser, mute, draw/pencil, zoom, snap. User says tools are missing.

**Code location:** `/workspaces/SpectraSphere/src/front/js/component/ArrangerView.js:1234–1323` (toolbar render)

**Root cause:** The toolbar renders only transport (play/stop/rec), BPM, time signature, snap, zoom, cycle, master volume, bounce, save, and track height controls. It is completely missing the tool buttons for object selection, range selection, split, glue, eraser, and mute. These are not stub buttons with `disabled` states — they are not rendered at all. The `Region` component has no `onDoubleClick` → piano roll editor for instruments (line 341–346), but no click-to-split, drag-to-glue, or right-click context menu entries for split/glue/erase. There is a context menu on right-click (line 1449, `handleRegionContextMenu`), but the toolbar is missing the mode-selector buttons that would switch the tool state and change how the user interacts with regions.

**Category:** Pre-existing

**Difficulty:** Small (30-60min)

**Shared with:** none

**Dependencies:** Implement tool state management (useState for `toolMode`), render tool buttons in the toolbar, and wire each tool to appropriate handlers (split: call `splitRegion` on click; glue: multi-select regions and merge; erase: delete selected region; mute: toggle region mute flag).

**Fix approach:** Add a tool-mode selector state and button group in the toolbar (between snap and zoom). Render buttons for "select" (default), "range", "split", "glue", "eraser", and "mute". On button click, set the tool mode. In the Region component, check the tool mode on click: if "split", insert a region boundary at the click position; if "glue", mark the region as a glue target and merge on next click; if "eraser", delete the region; if "mute", toggle `region.muted`. For "range" mode, implement marquee selection (see Bug #4). Provide visual feedback (highlight the active tool button, change the cursor).

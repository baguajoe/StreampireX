// =============================================================================
// projectRackStore.js — Project Rack Serialization
// =============================================================================
// Converts plugin rack state to/from JSON for project save/load.
// Integrates with PluginHost for full rack restore.
// =============================================================================

import { getPluginHost } from '../PluginHost';

/**
 * Serialize all track racks into a JSON-safe object for project save.
 * Returns: { [trackId]: [{ pluginId, params, bypassed }, ...] }
 */
export const serializeProjectRacks = (trackIds) => {
  const host = getPluginHost();
  const result = {};
  trackIds.forEach(id => {
    result[id] = host.serializeRack(id);
  });
  return result;
};

/**
 * Deserialize saved rack data back into live plugin instances.
 * @param {Map|Object} trackGraphs - trackId → TrackGraph
 * @param {Object} savedRacks - { trackId: [{ pluginId, params, bypassed }] }
 */
export const deserializeProjectRacks = async (trackGraphs, savedRacks) => {
  const host = getPluginHost();

  for (const [trackId, savedRack] of Object.entries(savedRacks || {})) {
    const trackGraph = trackGraphs instanceof Map
      ? trackGraphs.get(trackId)
      : trackGraphs[trackId];

    if (!trackGraph || !savedRack) continue;

    await host.deserializeRack(trackGraph, savedRack);
  }
};

/**
 * Format rack data for inclusion in project save payload.
 * Matches the format expected by the backend StudioTrack.effects JSON column.
 */
export const formatRackForSave = (trackId) => {
  const host = getPluginHost();
  const rack = host.serializeRack(trackId);

  return {
    pluginRack: rack,
    // Also include legacy effects format for backward compatibility
    rackVersion: '1.0',
  };
};

/**
 * Clear all racks (used on new project).
 */
export const clearAllRacks = (trackGraphs) => {
  const host = getPluginHost();
  if (trackGraphs instanceof Map) {
    trackGraphs.forEach(tg => host.clearRack(tg));
  } else {
    Object.values(trackGraphs || {}).forEach(tg => {
      if (tg) host.clearRack(tg);
    });
  }
};

export default {
  serializeProjectRacks,
  deserializeProjectRacks,
  formatRackForSave,
  clearAllRacks,
};
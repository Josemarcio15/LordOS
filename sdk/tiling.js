// tiling.js — window tiling manager and layout persistence for LordOS.

import { createStore } from './store.js';
import { settings } from './settings.js';
import { wm, windows, pointerWorkArea } from './windows.js';
import { DEFAULT_TILING_LAYOUTS, computeZoneRect, findZoneByKey, validateLayout } from './tilingmodel.js';

// Load layouts from user settings or fallback to defaults
function loadTilingState() {
  const user = settings.get()?.tiling || {};
  return {
    activeLayoutId: user.activeLayoutId || '3-columns',
    layouts: { ...DEFAULT_TILING_LAYOUTS, ...(user.customLayouts || {}) },
    gap: typeof user.gap === 'number' ? user.gap : 0,
    editorOpen: false,
  };
}

export const tilingStore = createStore(loadTilingState());

// Persist custom changes back to settings.json
function saveTilingState() {
  const current = tilingStore.get();
  settings.set({
    ...settings.get(),
    tiling: {
      activeLayoutId: current.activeLayoutId,
      customLayouts: current.layouts,
      gap: current.gap,
    },
  });
}

// Select active layout
export function setActiveLayout(layoutId) {
  const state = tilingStore.get();
  if (!state.layouts[layoutId]) return false;
  tilingStore.set({ ...state, activeLayoutId: layoutId });
  saveTilingState();
  return true;
}

// Save or update a layout
export function saveLayout(id, layout) {
  if (!validateLayout(layout)) return false;
  const state = tilingStore.get();
  const nextLayouts = { ...state.layouts, [id]: { ...layout, id } };
  tilingStore.set({ ...state, layouts: nextLayouts });
  saveTilingState();
  return true;
}

// Delete a custom layout
export function deleteLayout(id) {
  if (DEFAULT_TILING_LAYOUTS[id]) return false; // Default layouts cannot be deleted
  const state = tilingStore.get();
  const next = { ...state.layouts };
  delete next[id];
  const activeLayoutId = state.activeLayoutId === id ? '3-columns' : state.activeLayoutId;
  tilingStore.set({ ...state, layouts: next, activeLayoutId });
  saveTilingState();
  return true;
}

// Tile the focused window into a zone of the active layout
export function tileFront(keyOrZone) {
  const id = wm.focused();
  if (!id) return;
  const w = windows.get().find((x) => x.id === id);
  if (!w || w.fullscreen || w.pip) return;

  const state = tilingStore.get();
  const layout = state.layouts[state.activeLayoutId] || DEFAULT_TILING_LAYOUTS['3-columns'];
  const zone = findZoneByKey(layout, keyOrZone);

  if (zone) {
    const area = pointerWorkArea();
    const rect = computeZoneRect(zone, area, state.gap);
    if (rect) {
      wm.setFrame(id, rect);
    }
  } else {
    // Fallback to native snap zones if it matches a string like 'left-third'
    wm.snap(id, keyOrZone);
  }
}

// Open / Close the Tiling Editor UI
export function toggleTilingEditor() {
  const state = tilingStore.get();
  tilingStore.set({ ...state, editorOpen: !state.editorOpen });
}

// Helper to tile the first 3 active windows
export function tileActiveWindows3Columns() {
  const ws = windows.get().filter((w) => !w.minimized && !w.fullscreen && !w.pip);
  if (!ws.length) return;
  const zones = ['1', '2', '3'];
  ws.slice(0, 3).forEach((w, i) => {
    const area = pointerWorkArea();
    const state = tilingStore.get();
    const layout = state.layouts[state.activeLayoutId] || DEFAULT_TILING_LAYOUTS['3-columns'];
    const zone = findZoneByKey(layout, zones[i]);
    if (zone) {
      const rect = computeZoneRect(zone, area, state.gap);
      if (rect) wm.setFrame(w.id, rect);
    }
  });
}

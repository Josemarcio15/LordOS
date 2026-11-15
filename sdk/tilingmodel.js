// tilingmodel.js — data model, layout math and calculations for window tiling.
// Pure logic without React or DOM dependencies for full unit-testability.

export const DEFAULT_TILING_LAYOUTS = {
  '3-columns': {
    id: '3-columns',
    name: '3 Colunas',
    zones: [
      { id: 1, key: '1', shortcut: 'Ctrl+Alt+1', name: 'Esquerda', x: 0, y: 0, w: 1 / 3, h: 1 },
      { id: 2, key: '2', shortcut: 'Ctrl+Alt+2', name: 'Centro',   x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { id: 3, key: '3', shortcut: 'Ctrl+Alt+3', name: 'Direita',  x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
  },
  'quarters': {
    id: 'quarters',
    name: '4 Quadrantes',
    zones: [
      { id: 7, key: '7', shortcut: 'Ctrl+Alt+7', name: 'Superior Esquerdo', x: 0, y: 0, w: 0.5, h: 0.5 },
      { id: 9, key: '9', shortcut: 'Ctrl+Alt+9', name: 'Superior Direito',  x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { id: 1, key: '1', shortcut: 'Ctrl+Alt+1', name: 'Inferior Esquerdo', x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { id: 3, key: '3', shortcut: 'Ctrl+Alt+3', name: 'Inferior Direito',  x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  'focus-code': {
    id: 'focus-code',
    name: 'Foco + Terminais',
    zones: [
      { id: 1, key: '1', shortcut: 'Ctrl+Alt+1', name: 'Principal', x: 0, y: 0, w: 0.65, h: 1 },
      { id: 2, key: '2', shortcut: 'Ctrl+Alt+2', name: 'Terminal Superior', x: 0.65, y: 0, w: 0.35, h: 0.5 },
      { id: 3, key: '3', shortcut: 'Ctrl+Alt+3', name: 'Terminal Inferior', x: 0.65, y: 0.5, w: 0.35, h: 0.5 },
    ],
  },
};

// Calculate absolute pixel bounds ({ x, y, w, h }) for a normalized zone inside a workArea
export function computeZoneRect(zone, workArea, gap = 0) {
  if (!zone || !workArea) return null;
  const x = Math.round(workArea.x + zone.x * workArea.w) + gap;
  const y = Math.round(workArea.y + zone.y * workArea.h) + gap;
  const w = Math.round(zone.w * workArea.w) - (gap * 2);
  const h = Math.round(zone.h * workArea.h) - (gap * 2);

  return {
    x,
    y,
    w: Math.max(160, w),
    h: Math.max(100, h),
  };
}

// Find a zone by trigger key (e.g. '1', '2', '3') or custom shortcut string within a layout
export function findZoneByKey(layout, keyOrShortcut) {
  if (!layout || !Array.isArray(layout.zones)) return null;
  const target = String(keyOrShortcut).trim().toLowerCase();
  return layout.zones.find((z) => {
    if (String(z.key).toLowerCase() === target) return true;
    if (z.shortcut && String(z.shortcut).toLowerCase() === target) return true;
    return false;
  }) || null;
}

// Validate custom layout structure
export function validateLayout(layout) {
  if (!layout || typeof layout.name !== 'string' || !Array.isArray(layout.zones)) return false;
  for (const z of layout.zones) {
    if (typeof z.x !== 'number' || typeof z.y !== 'number' || typeof z.w !== 'number' || typeof z.h !== 'number') {
      return false;
    }
  }
  return true;
}

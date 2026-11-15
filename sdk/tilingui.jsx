// tilingui.jsx — Interactive visual layout editor for LordOS tiling.
// Allows creating, dragging, resizing, and assigning keys (0-9, A-Z) to tiling zones.

import { useState, useRef, useEffect } from 'react';
import { View, Text, useStore, pointerWorkArea, addListener } from '@lordos/sdk';
import { tilingStore, setActiveLayout, saveLayout, deleteLayout, toggleTilingEditor } from './tiling.js';

const AVAILABLE_KEYS = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
  'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P',
  'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L',
  'Z', 'X', 'C', 'V', 'B', 'N', 'M',
];

export function TilingEditorOverlay() {
  const state = useStore(tilingStore);
  const [selectedLayoutId, setSelectedLayoutId] = useState(state.activeLayoutId);
  const [zones, setZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [layoutName, setLayoutName] = useState('');

  const dragRef = useRef(null);
  const canvasRef = useRef(null);

  // Sync zones when selected layout changes
  useEffect(() => {
    const l = state.layouts[selectedLayoutId] || state.layouts['3-columns'];
    if (l) {
      setZones(JSON.parse(JSON.stringify(l.zones)));
      setLayoutName(l.name);
      setSelectedZoneId(null);
    }
  }, [selectedLayoutId, state.editorOpen]);

  // Pointer listeners for Drag (Move) and Resize
  useEffect(() => {
    if (!state.editorOpen) return;

    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;

      const dx = (e.x - d.startX) / d.canvasW;
      const dy = (e.y - d.startY) / d.canvasH;

      setZones((prev) =>
        prev.map((z) => {
          if (z.id !== d.zoneId) return z;

          if (d.type === 'move') {
            const nextX = Math.max(0, Math.min(1 - z.w, d.orig.x + dx));
            const nextY = Math.max(0, Math.min(1 - z.h, d.orig.y + dy));
            const snap = (v) => Math.round(v * 20) / 20;
            return { ...z, x: snap(nextX), y: snap(nextY) };
          }

          if (d.type === 'resize') {
            const nextW = Math.max(0.1, Math.min(1 - z.x, d.orig.w + dx));
            const nextH = Math.max(0.1, Math.min(1 - z.y, d.orig.h + dy));
            const snap = (v) => Math.round(v * 20) / 20;
            return { ...z, w: snap(nextW), h: snap(nextH) };
          }

          return z;
        })
      );
    };

    const onUp = () => {
      dragRef.current = null;
    };

    const offMove = addListener('pointermove', onMove);
    const offUp = addListener('pointerup', onUp);

    return () => {
      offMove();
      offUp();
    };
  }, [state.editorOpen]);

  if (!state.editorOpen) return null;

  const area = pointerWorkArea();
  // Adjust canvas size so there's plenty of breathing room for controls below
  const canvasW = Math.min(840, area.w - 80);
  const canvasH = Math.min(380, Math.max(260, area.h - 320));

  const startDrag = (zone, e, type) => {
    e.stopPropagation?.();
    setSelectedZoneId(zone.id);
    dragRef.current = {
      zoneId: zone.id,
      type,
      startX: e.x,
      startY: e.y,
      canvasW,
      canvasH,
      orig: { x: zone.x, y: zone.y, w: zone.w, h: zone.h },
    };
  };

  const handleApply = () => {
    saveLayout(selectedLayoutId, {
      id: selectedLayoutId,
      name: layoutName,
      zones,
    });
    setActiveLayout(selectedLayoutId);
    toggleTilingEditor();
  };

  const handleSetZoneKey = (keyChar) => {
    if (!selectedZoneId) return;
    setZones((prev) =>
      prev.map((z) => (z.id === selectedZoneId ? { ...z, key: keyChar.toUpperCase(), shortcut: `Super+${keyChar.toUpperCase()}` } : z))
    );
  };

  const handleAddZone = () => {
    const nextNum = zones.length + 1;
    const key = String(nextNum <= 9 ? nextNum : 'A');
    const newZone = {
      id: Date.now(),
      key,
      shortcut: `Super+${key}`,
      name: `Zona ${key}`,
      x: 0.1,
      y: 0.1,
      w: 0.3,
      h: 0.4,
    };
    setZones([...zones, newZone]);
    setSelectedZoneId(newZone.id);
  };

  const handleDeleteSelectedZone = () => {
    if (!selectedZoneId) return;
    setZones(zones.filter((z) => z.id !== selectedZoneId));
    setSelectedZoneId(null);
  };

  const handleCreateNewLayout = () => {
    const newId = `custom-${Date.now()}`;
    const newL = {
      id: newId,
      name: 'Meu Layout',
      zones: [
        { id: 1, key: '1', shortcut: 'Super+1', name: 'Zona 1', x: 0, y: 0, w: 0.5, h: 1 },
        { id: 2, key: '2', shortcut: 'Super+2', name: 'Zona 2', x: 0.5, y: 0, w: 0.5, h: 1 },
      ],
    };
    saveLayout(newId, newL);
    setSelectedLayoutId(newId);
  };

  const selectedZone = zones.find((z) => z.id === selectedZoneId);

  return (
    <View
      style={{
        position: 'absolute',
        left: area.x,
        top: area.y,
        width: area.w,
        height: area.h,
        backgroundColor: 'rgba(0, 0, 0, 0.88)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      {/* Top Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '700' }}>
          Editor de Quadrantes • Arraste para mover • Puxe o canto para redimensionar
        </Text>
      </View>

      {/* Main Interactive Screen Canvas */}
      <View
        ref={canvasRef}
        style={{
          width: canvasW,
          height: canvasH,
          backgroundColor: '#151517',
          borderRadius: 14,
          position: 'relative',
          borderWidth: 2,
          borderColor: '#3a3a3c',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        {zones.map((zone) => {
          const isSelected = zone.id === selectedZoneId;
          return (
            <View
              key={zone.id}
              onMouseDown={(e) => startDrag(zone, e, 'move')}
              style={{
                position: 'absolute',
                left: `${zone.x * 100}%`,
                top: `${zone.y * 100}%`,
                width: `${zone.w * 100}%`,
                height: `${zone.h * 100}%`,
                backgroundColor: isSelected ? 'rgba(10, 132, 255, 0.45)' : 'rgba(10, 132, 255, 0.22)',
                borderWidth: isSelected ? 2 : 1,
                borderColor: isSelected ? '#ffffff' : '#0a84ff',
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'grab',
                userSelect: 'none',
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: '800' }}>
                Super + {zone.key}
              </Text>
              <Text style={{ color: '#d1d1d6', fontSize: 12, marginTop: 4 }}>
                {Math.round(zone.w * 100)}% × {Math.round(zone.h * 100)}%
              </Text>

              {/* Bottom-Right Resize Handle */}
              <View
                onMouseDown={(e) => startDrag(zone, e, 'resize')}
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: 0,
                  width: 24,
                  height: 24,
                  backgroundColor: isSelected ? '#ffffff' : '#0a84ff',
                  borderTopLeftRadius: 6,
                  cursor: 'se-resize',
                }}
              />
            </View>
          );
        })}
      </View>

      {/* Control Box: Zone Key Selector & Actions */}
      <View
        style={{
          flexDirection: 'column',
          gap: 10,
          marginTop: 16,
          backgroundColor: '#202022',
          paddingVertical: 12,
          paddingHorizontal: 20,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#2e2e30',
          alignItems: 'center',
          width: canvasW,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Text style={{ color: selectedZone ? '#ffffff' : '#8e8e93', fontSize: 13, fontWeight: '600' }}>
            {selectedZone ? `Atalho da Zona Selecionada: Super + ${selectedZone.key}` : 'Clique em uma zona para escolher a tecla:'}
          </Text>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View
              onClick={handleAddZone}
              style={{ paddingVertical: 5, paddingHorizontal: 12, backgroundColor: '#2c2c2e', borderRadius: 6, cursor: 'pointer' }}
            >
              <Text style={{ color: '#0a84ff', fontWeight: '600', fontSize: 12 }}>+ Adicionar Zona</Text>
            </View>

            {selectedZoneId && (
              <View
                onClick={handleDeleteSelectedZone}
                style={{ paddingVertical: 5, paddingHorizontal: 12, backgroundColor: '#3a1c1c', borderRadius: 6, cursor: 'pointer' }}
              >
                <Text style={{ color: '#ff453a', fontWeight: '600', fontSize: 12 }}>Excluir Zona</Text>
              </View>
            )}

            <View
              onClick={handleCreateNewLayout}
              style={{ paddingVertical: 5, paddingHorizontal: 12, backgroundColor: '#2c2c2e', borderRadius: 6, cursor: 'pointer' }}
            >
              <Text style={{ color: '#30d158', fontWeight: '600', fontSize: 12 }}>+ Novo Layout</Text>
            </View>
          </View>
        </View>

        {selectedZone && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', width: '100%', paddingTop: 4 }}>
            {AVAILABLE_KEYS.map((k) => {
              const isActive = String(selectedZone.key).toUpperCase() === k;
              return (
                <View
                  key={k}
                  onClick={() => handleSetZoneKey(k)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 6,
                    backgroundColor: isActive ? '#0a84ff' : '#303032',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>{k}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Bottom Footer Bar: Layout Switcher & Save (Completamente Separada e com Espaçamento Amplo) */}
      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          marginTop: 16,
          backgroundColor: '#18181a',
          paddingVertical: 10,
          paddingHorizontal: 20,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#2c2c2e',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: canvasW,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ color: '#8e8e93', fontSize: 13, marginRight: 4 }}>Layout:</Text>
          {Object.entries(state.layouts).map(([id, layout]) => (
            <View
              key={id}
              onClick={() => setSelectedLayoutId(id)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 14,
                borderRadius: 8,
                backgroundColor: selectedLayoutId === id ? '#0a84ff' : '#28282a',
                cursor: 'pointer',
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: selectedLayoutId === id ? '700' : '400' }}>
                {layout.name}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View
            onClick={handleApply}
            style={{
              paddingVertical: 7,
              paddingHorizontal: 20,
              borderRadius: 8,
              backgroundColor: '#30d158',
              cursor: 'pointer',
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>Salvar e Aplicar</Text>
          </View>

          <View
            onClick={toggleTilingEditor}
            style={{
              paddingVertical: 7,
              paddingHorizontal: 16,
              borderRadius: 8,
              backgroundColor: '#3a3a3c',
              cursor: 'pointer',
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 13 }}>Fechar</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

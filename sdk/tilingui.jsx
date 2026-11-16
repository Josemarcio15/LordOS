// tilingui.jsx — Interactive visual layout editor for LordOS tiling.
// Allows creating, dragging, resizing, and assigning keys (0-9, A-Z) to tiling zones.

import { useState, useRef, useEffect } from 'react';
import { View, Text, useStore, pointerWorkArea, addListener, ScrollView, TextInput } from '@lordos/sdk';
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
  const [isEditingName, setIsEditingName] = useState(false);

  const dragRef = useRef(null);
  const canvasRef = useRef(null);

  // Sync zones when selected layout changes
  useEffect(() => {
    const l = state.layouts[selectedLayoutId] || state.layouts['3-columns'];
    if (l) {
      setZones(JSON.parse(JSON.stringify(l.zones)));
      setLayoutName(l.name);
      setIsEditingName(false);
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
    const offKey = addListener('keydown', (e) => {
      if (e.key === 'Escape') {
        toggleTilingEditor();
      }
    });

    return () => {
      offMove();
      offUp();
      offKey();
    };
  }, [state.editorOpen]);

  if (!state.editorOpen) return null;

  const area = pointerWorkArea();
  // Calcule dinamicamente a largura máxima para caber todos os botões e layouts sem vazar
  const maxW = Math.min(940, area.w - 60);
  const canvasW = maxW;
  const canvasH = Math.min(380, Math.max(250, area.h - 340));

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

  const handleDeleteLayout = (e, id) => {
    e.stopPropagation?.();
    const allIds = Object.keys(state.layouts);
    if (allIds.length <= 1) return;
    deleteLayout(id);
    const nextId = allIds.find((k) => k !== id) || '3-columns';
    setSelectedLayoutId(nextId);
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
      {/* Top Header: Título com Nome do Layout Editável e Dicas */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: canvasW,
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {isEditingName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                value={layoutName}
                onChange={setLayoutName}
                autoFocus={true}
                onSubmit={() => setIsEditingName(false)}
                onCancel={() => setIsEditingName(false)}
                style={{
                  width: 200,
                  height: 32,
                  fontSize: 16,
                  fontWeight: '700',
                  color: '#ffffff',
                  backgroundColor: '#28282a',
                  borderRadius: 6,
                  paddingHorizontal: 8,
                }}
              />
              <View
                onClick={() => setIsEditingName(false)}
                style={{
                  paddingVertical: 5,
                  paddingHorizontal: 10,
                  backgroundColor: '#30d158',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>OK</Text>
              </View>
            </View>
          ) : (
            <View
              onClick={() => setIsEditingName(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                paddingVertical: 5,
                paddingHorizontal: 12,
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '700' }}>
                {layoutName || 'Layout Sem Nome'}
              </Text>
              <Text style={{ color: '#0a84ff', fontSize: 16 }} title="Clique para renomear">
                ✎
              </Text>
            </View>
          )}

          <Text style={{ color: '#8e8e93', fontSize: 13, marginLeft: 8 }}>
            Arraste para mover • Puxe o canto para redimensionar
          </Text>
        </View>
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

      {/* Card Exclusivo dos Layouts Criados com Scroll Centralizado */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 14,
          backgroundColor: '#18181a',
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: '#2c2c2e',
          width: canvasW,
          boxSizing: 'border-box',
          overflow: 'hidden',
          gap: 12,
        }}
      >
        <Text style={{ color: '#8e8e93', fontSize: 13, fontWeight: '600', flexShrink: 0 }}>Layouts:</Text>

        <View style={{ flex: 1, minWidth: 0, height: 42, justifyContent: 'center' }}>
          <ScrollView
            horizontal={true}
            style={{ flex: 1 }}
            contentStyle={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 2,
            }}
          >
            {Object.entries(state.layouts).map(([id, layout]) => {
              const isSelected = selectedLayoutId === id;
              const isDefault = id === '3-columns' || id === 'quarters' || id === 'focus-code';
              return (
                <View
                  key={id}
                  onClick={() => setSelectedLayoutId(id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    backgroundColor: isSelected ? '#0a84ff' : '#28282a',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: isSelected ? '700' : '400' }}>
                    {layout.name}
                  </Text>
                  {!isDefault && (
                    <View
                      onClick={(e) => handleDeleteLayout(e, id)}
                      title="Excluir este layout"
                      style={{
                        paddingHorizontal: 4,
                        paddingVertical: 1,
                        borderRadius: 4,
                        backgroundColor: isSelected ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                      }}
                    >
                      <Text style={{ color: '#ff453a', fontSize: 11, fontWeight: '800' }}>✕</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Linha Abaixo: Apenas Ações (Salvar e Fechar) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          width: canvasW,
          marginTop: 12,
          gap: 12,
        }}
      >
        <View
          onClick={handleApply}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 24,
            borderRadius: 8,
            backgroundColor: '#30d158',
            cursor: 'pointer',
          }}
        >
          <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>Salvar</Text>
        </View>

        <View
          onClick={toggleTilingEditor}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 18,
            borderRadius: 8,
            backgroundColor: '#3a3a3c',
            cursor: 'pointer',
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 13 }}>Fechar</Text>
        </View>
      </View>
    </View>
  );
}

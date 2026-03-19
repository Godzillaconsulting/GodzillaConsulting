import React, { useState, useEffect } from 'react';
import { useSiteData } from '../context/SiteContext';
import StudioPreview from './StudioPreview';
import MediaPicker from './MediaPicker';


// Orden de secciones tal como aparecen en el sitio web (de arriba hacia abajo)
const PAGE_SECTION_ORDER = [
  { id: 'hero',                          label: 'Hero',                     emoji: '🦖' },
  { id: 'servicios',                     label: 'Servicios',                emoji: '⚡' },
  { id: 'cultura',                       label: 'Cultura',                  emoji: '🏢' },
  { id: 'casos',                         label: 'Casos de Éxito',           emoji: '🏆' },
  { id: 'recursos',                      label: 'Recursos',                 emoji: '📚' },
  { id: 'paquete-posicionamiento-social', label: 'Landing: Posicionamiento', emoji: '📣' },
  { id: 'paquete-expansion',             label: 'Landing: Expansión',       emoji: '🚀' },
  { id: 'paquete-control-ia',            label: 'Landing: Control IA',      emoji: '🤖' },
  { id: 'paquete-elite',                 label: 'Landing: Élite',           emoji: '👑' },
  { id: 'footer',                        label: 'Footer',                   emoji: '📌' },
];

export default function AdminStudio() {
  const { nodes, fetchNodes, setPreviewOverride } = useSiteData();
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedElementIndex, setSelectedElementIndex] = useState(null);
  const [selectedFeatureExtendedIndex, setSelectedFeatureExtendedIndex] = useState(null);
  const [draftData, setDraftData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPublishPreview, setShowPublishPreview] = useState(false);
  const [showPreviewPanel, setShowPreviewPanel] = useState(true);

  // Autenticación
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) window.location.href = '/';
  }, []);

  // Sincronizar draftData → SiteContext para preview en tiempo real
  useEffect(() => {
    if (selectedNodeId && draftData) {
      setPreviewOverride(selectedNodeId, draftData);
    } else {
      setPreviewOverride(null, null);
    }
  }, [draftData, selectedNodeId]);

  // Seleccionar nodo
  const handleSelectNode = (node) => {
    setSelectedNodeId(node.id);
    setSelectedElementIndex(null);
    setSelectedFeatureExtendedIndex(null);
    setDraftData(node.draft_data || { title: node.id, elements: [] });
  };

  // Guardar borrador
  const handleSaveDraft = async () => {
    if (!selectedNodeId) return;
    setSaving(true);
    try {
      await fetch(`http://localhost:3000/api/nodes/${selectedNodeId}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_data: draftData })
      });
      await fetchNodes();
      alert('✅ Cambios guardados exitosamente!');
    } catch (err) {
      alert('❌ Error guardando cambios');
    } finally {
      setSaving(false);
    }
  };

  // Abrir modal de publicación (muestra preview del sitio primero)
  const handlePublish = () => {
    if (!selectedNodeId) return;
    setShowPublishPreview(true);
  };

  // Confirmar y publicar
  const handleConfirmPublish = async () => {
    try {
      await fetch(`http://localhost:3000/api/nodes/${selectedNodeId}/publish`, { method: 'POST' });
      await fetchNodes();
      setShowPublishPreview(false);
      alert('✅ Web publicada con éxito!');
    } catch (err) {
      alert('❌ Error publicando la web');
    }
  };

  const handleDraftChange = (key, value) => {
    setDraftData(prev => ({ ...prev, [key]: value }));
  };

  const handleElementChange = (key, value) => {
    if (selectedElementIndex === null) return;
    setDraftData(prev => {
      const newElements = [...(prev.elements || [])];
      newElements[selectedElementIndex] = { ...newElements[selectedElementIndex], [key]: value };
      return { ...prev, elements: newElements };
    });
  };

  const handleFeatureChange = (featureIndex, value) => {
    if (selectedElementIndex === null) return;
    setDraftData(prev => {
      const newElements = [...(prev.elements || [])];
      const el = newElements[selectedElementIndex];
      const newFeatures = [...(el.features || [])];
      newFeatures[featureIndex] = value;
      newElements[selectedElementIndex] = { ...el, features: newFeatures };
      return { ...prev, elements: newElements };
    });
  };

  const handleFeatureExtendedChange = (key, value) => {
    if (selectedFeatureExtendedIndex === null) return;
    setDraftData(prev => {
      const newFeatures = [...(prev.planFeaturesExtended || [])];
      newFeatures[selectedFeatureExtendedIndex] = { ...newFeatures[selectedFeatureExtendedIndex], [key]: value };
      return { ...prev, planFeaturesExtended: newFeatures };
    });
  };

  const activeElement = selectedElementIndex !== null ? draftData?.elements?.[selectedElementIndex] : null;
  const activeFeatureExtended = selectedFeatureExtendedIndex !== null ? draftData?.planFeaturesExtended?.[selectedFeatureExtendedIndex] : null;

  // Ordenar nodos según el sitio web
  const sortedNodes = [...nodes].sort((a, b) => {
    const ai = PAGE_SECTION_ORDER.findIndex(s => s.id === a.id);
    const bi = PAGE_SECTION_ORDER.findIndex(s => s.id === b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <div className="flex h-screen bg-neutral-900 text-white w-full z-50 fixed inset-0 font-sans overflow-hidden">

      {/* ═══════════════════════════════════════════
          COLUMNA 1: Sidebar — Secciones ordenadas
      ═══════════════════════════════════════════ */}
      <div className="w-[190px] min-w-[190px] border-r border-neutral-700 p-4 overflow-y-auto flex flex-col bg-neutral-950">
        <h2 className="text-lg font-black mb-0.5 text-[#CC0000]">Godzilla Studio</h2>
        <p className="text-[10px] text-gray-600 mb-4">↕ Orden del sitio web</p>
        <div className="flex flex-col gap-2">
          {sortedNodes.map((node, index) => {
            const meta = PAGE_SECTION_ORDER.find(s => s.id === node.id);
            const label = meta?.label || node.id.replace('paquete-', 'Landing: ');
            const emoji = meta?.emoji || '📄';
            const isSelected = selectedNodeId === node.id;
            return (
              <button
                key={node.id}
                onClick={() => handleSelectNode(node)}
                className={`p-3 text-left rounded-xl transition-all shadow-md flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[#CC0000] text-white shadow-[0_4px_12px_rgba(204,0,0,0.35)]'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-gray-300'
                }`}
              >
                <span className="text-base shrink-0">{emoji}</span>
                <div className="min-w-0">
                  <span className="font-bold block text-xs leading-tight truncate">{label}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-red-200' : 'text-neutral-500'}`}>Sección {index + 1}</span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-auto pt-4 border-t border-neutral-800">
          <button
            onClick={() => { localStorage.removeItem('adminToken'); window.location.href = '/'; }}
            className="w-full p-2 text-[10px] text-neutral-600 hover:text-red-400 transition-colors rounded-lg hover:bg-neutral-800"
          >
            🚪 Cerrar sesión
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          COLUMNA 2: Elementos internos de la sección
      ═══════════════════════════════════════════ */}
      <div className="w-[190px] min-w-[190px] border-r border-neutral-700 p-4 bg-neutral-900 overflow-y-auto">
        <h2 className="text-sm font-bold mb-4 text-white">Contenido</h2>
        {selectedNodeId && draftData ? (
          <div>
            <div className="mb-6">
              <h3 className="text-[10px] text-gray-500 font-semibold mb-2 uppercase tracking-wider">Ajustes Generales</h3>
              <button
                onClick={() => { setSelectedElementIndex(null); setSelectedFeatureExtendedIndex(null); }}
                className={`w-full p-2.5 text-left rounded-lg transition-colors border text-xs ${
                  (selectedElementIndex === null && selectedFeatureExtendedIndex === null)
                    ? 'bg-neutral-700 border-[#CC0000]'
                    : 'bg-neutral-800 border-transparent hover:bg-neutral-700'
                }`}
              >
                Textos Principales
              </button>
            </div>

            {draftData.elements && draftData.elements.length > 0 && (
              <div className="mb-6">
                <h3 className="text-[10px] text-gray-500 font-semibold mb-2 uppercase tracking-wider">Tarjetas / Elementos</h3>
                <div className="flex flex-col gap-1.5">
                  {draftData.elements.map((el, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setSelectedElementIndex(idx); setSelectedFeatureExtendedIndex(null); }}
                      className={`w-full p-2.5 text-left rounded-lg transition-colors border text-xs ${
                        selectedElementIndex === idx
                          ? 'bg-neutral-700 border-[#CC0000]'
                          : 'bg-neutral-800 border-transparent hover:bg-neutral-700'
                      }`}
                    >
                      <span className="block font-medium truncate">{el.title || `Elemento ${idx + 1}`}</span>
                      {el.price && <span className="block text-[10px] text-[#CC0000] font-bold mt-0.5">{el.price}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {draftData.planFeaturesExtended && draftData.planFeaturesExtended.length > 0 && (
              <div>
                <h3 className="text-[10px] text-gray-500 font-semibold mb-2 uppercase tracking-wider">Características Base</h3>
                <div className="flex flex-col gap-1.5">
                  {draftData.planFeaturesExtended.map((el, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setSelectedFeatureExtendedIndex(idx); setSelectedElementIndex(null); }}
                      className={`w-full p-2.5 text-left rounded-lg transition-colors border text-xs ${
                        selectedFeatureExtendedIndex === idx
                          ? 'bg-neutral-700 border-[#CC0000]'
                          : 'bg-neutral-800 border-transparent hover:bg-neutral-700'
                      }`}
                    >
                      <span className="block font-medium truncate">{el.title || `Característica ${idx + 1}`}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-neutral-600 text-center text-xs">
            ← Selecciona una sección
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          COLUMNA 3: Split View — Editor + Preview
      ═══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-row overflow-hidden">

        {/* Modal de confirmación antes de publicar */}
        {showPublishPreview && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8">
            <div className="bg-neutral-900 rounded-2xl border border-neutral-700 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-neutral-700">
                <div>
                  <h3 className="text-xl font-black text-white">Vista Previa — Antes de Publicar</h3>
                  <p className="text-sm text-gray-400 mt-1">Revisa cómo se ve el sitio. Cuando estés listo, confirma la publicación.</p>
                </div>
                <button onClick={() => setShowPublishPreview(false)} className="text-neutral-500 hover:text-white text-2xl">✕</button>
              </div>
              <div className="flex-1 overflow-hidden p-4">
                <iframe
                  src="https://godzillaconsulting.ai"
                  title="Vista previa antes de publicar"
                  className="w-full rounded-xl border border-neutral-700"
                  style={{ height: '55vh', border: 'none' }}
                />
              </div>
              <div className="flex justify-end gap-4 p-6 border-t border-neutral-700">
                <button onClick={() => setShowPublishPreview(false)} className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-full font-bold transition">
                  ← Volver a Editar
                </button>
                <button onClick={handleConfirmPublish} className="px-8 py-3 bg-[#CC0000] hover:bg-red-600 text-white rounded-full font-black transition shadow-[0_4px_20px_rgba(204,0,0,0.5)] text-lg">
                  🚀 Confirmar y Publicar Web
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Panel Izquierdo: Editor ── */}
        <div
          className="flex flex-col overflow-hidden border-r border-neutral-800 bg-[#0D0D0D] transition-all duration-300"
          style={{ width: showPreviewPanel ? '42%' : '100%' }}
        >
          {/* Header fijo del editor */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 shrink-0">
            <h2 className="text-base font-black text-white">Editor Visual</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreviewPanel(p => !p)}
                title={showPreviewPanel ? 'Ocultar preview' : 'Mostrar preview'}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  showPreviewPanel
                    ? 'bg-[#CC0000]/15 text-[#CC0000] border border-[#CC0000]/25'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white border border-transparent'
                }`}
              >
                <span>{showPreviewPanel ? '◧' : '▣'}</span>
                {showPreviewPanel ? 'Ocultar' : 'Preview'}
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={saving || !selectedNodeId}
                className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded-full text-xs font-bold transition disabled:opacity-40"
              >
                {saving ? '...' : '💾 Guardar'}
              </button>
              <button
                onClick={handlePublish}
                disabled={!selectedNodeId}
                className="px-3 py-1.5 bg-[#CC0000] hover:bg-red-600 text-white rounded-full text-xs font-black transition shadow-[0_4px_12px_rgba(204,0,0,0.4)] disabled:opacity-40"
              >
                🚀 Publicar
              </button>
            </div>
          </div>

          {/* Área scrollable del editor */}
          <div className="flex-1 overflow-y-auto p-5">
            {selectedNodeId && draftData ? (
              <div className="flex flex-col gap-6 pb-20">

                {/* AJUSTES GENERALES */}
                {selectedElementIndex === null && selectedFeatureExtendedIndex === null && (
                  <div className="space-y-5 bg-neutral-900 p-5 rounded-2xl border border-neutral-800 shadow-lg">
                    <h3 className="text-sm font-bold text-[#CC0000] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#CC0000]"></span>
                      Ajustes Globales del Nodo
                    </h3>

                    {/* ── TEXTO ── */}
                    {draftData.title !== undefined && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-400 block">Título / Frase Principal</label>
                        <textarea
                          rows="2"
                          value={draftData.title || ''}
                          onChange={(e) => handleDraftChange('title', e.target.value)}
                          className="w-full p-3 bg-black border border-neutral-700 rounded-xl text-white text-base font-medium focus:outline-none focus:border-[#CC0000] transition-colors resize-none"
                        />
                      </div>
                    )}

                    {/* Subtítulo / descripción */}
                    {(draftData.subtitle !== undefined || draftData.desc !== undefined) && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-400 block">Subtítulo / Descripción</label>
                        <textarea
                          rows="3"
                          value={draftData.subtitle ?? draftData.desc ?? ''}
                          onChange={(e) => handleDraftChange(draftData.subtitle !== undefined ? 'subtitle' : 'desc', e.target.value)}
                          className="w-full p-3 bg-black border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:border-[#CC0000] transition-colors resize-none"
                        />
                      </div>
                    )}

                    {/* CTA */}
                    {draftData.ctaText !== undefined && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-400 block">Texto del botón CTA</label>
                          <input type="text" value={draftData.ctaText || ''} onChange={(e) => handleDraftChange('ctaText', e.target.value)} className="w-full p-2.5 bg-black border border-neutral-700 rounded-lg text-white text-sm focus:border-[#CC0000]" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-400 block">Link del CTA</label>
                          <input type="text" value={draftData.ctaLink || ''} onChange={(e) => handleDraftChange('ctaLink', e.target.value)} className="w-full p-2.5 bg-black border border-neutral-700 rounded-lg text-white text-sm focus:border-[#CC0000]" />
                        </div>
                      </div>
                    )}

                    {/* ── MEDIA: Imágenes y Videos ── */}
                    <div className="border-t border-neutral-700 pt-4 mt-2">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">🖼️ Imágenes &amp; Videos</h4>
                      <div className="grid grid-cols-1 gap-4">

                        {/* Imagen principal / hero */}
                        <MediaPicker
                          label="Imagen Principal (Hero/Portada)"
                          value={draftData.imageUrl || ''}
                          onChange={(url) => handleDraftChange('imageUrl', url)}
                          accept="image"
                        />

                        {/* Logo */}
                        <MediaPicker
                          label="Logo de la Sección"
                          value={draftData.logoUrl || ''}
                          onChange={(url) => handleDraftChange('logoUrl', url)}
                          accept="image"
                        />

                        {/* Video de fondo */}
                        <MediaPicker
                          label="Video de Fondo"
                          value={draftData.videoUrl || draftData.bgVideoUrl || ''}
                          onChange={(url) => handleDraftChange(draftData.bgVideoUrl !== undefined ? 'bgVideoUrl' : 'videoUrl', url)}
                          accept="video"
                        />

                        {/* Imagen de fondo */}
                        <MediaPicker
                          label="Imagen de Fondo"
                          value={draftData.bgImageUrl || ''}
                          onChange={(url) => handleDraftChange('bgImageUrl', url)}
                          accept="image"
                        />

                      </div>
                    </div>

                    {/* ── COLORES ── */}
                    <div className="border-t border-neutral-700 pt-4 mt-2">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">🎨 Colores</h4>
                      <div className="grid grid-cols-2 gap-3">

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-400 block">Color de Acento</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={draftData.accentColor || '#CC0000'}
                              onChange={(e) => handleDraftChange('accentColor', e.target.value)}
                              className="w-10 h-10 rounded-lg border border-neutral-600 cursor-pointer bg-transparent"
                            />
                            <input
                              type="text"
                              value={draftData.accentColor || '#CC0000'}
                              onChange={(e) => handleDraftChange('accentColor', e.target.value)}
                              className="flex-1 p-2 bg-black border border-neutral-700 rounded-lg text-white text-xs font-mono focus:border-[#CC0000]"
                              placeholder="#CC0000"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-400 block">Color de Fondo</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={draftData.bgColor || '#111111'}
                              onChange={(e) => handleDraftChange('bgColor', e.target.value)}
                              className="w-10 h-10 rounded-lg border border-neutral-600 cursor-pointer bg-transparent"
                            />
                            <input
                              type="text"
                              value={draftData.bgColor || '#111111'}
                              onChange={(e) => handleDraftChange('bgColor', e.target.value)}
                              className="flex-1 p-2 bg-black border border-neutral-700 rounded-lg text-white text-xs font-mono focus:border-[#CC0000]"
                              placeholder="#111111"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-400 block">Color de Texto Principal</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={draftData.textColor || '#FFFFFF'}
                              onChange={(e) => handleDraftChange('textColor', e.target.value)}
                              className="w-10 h-10 rounded-lg border border-neutral-600 cursor-pointer bg-transparent"
                            />
                            <input
                              type="text"
                              value={draftData.textColor || '#FFFFFF'}
                              onChange={(e) => handleDraftChange('textColor', e.target.value)}
                              className="flex-1 p-2 bg-black border border-neutral-700 rounded-lg text-white text-xs font-mono focus:border-[#CC0000]"
                              placeholder="#FFFFFF"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-400 block">Color de Texto Secundario</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={draftData.subtextColor || '#9CA3AF'}
                              onChange={(e) => handleDraftChange('subtextColor', e.target.value)}
                              className="w-10 h-10 rounded-lg border border-neutral-600 cursor-pointer bg-transparent"
                            />
                            <input
                              type="text"
                              value={draftData.subtextColor || '#9CA3AF'}
                              onChange={(e) => handleDraftChange('subtextColor', e.target.value)}
                              className="flex-1 p-2 bg-black border border-neutral-700 rounded-lg text-white text-xs font-mono focus:border-[#CC0000]"
                              placeholder="#9CA3AF"
                            />
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* ── CAMPOS ESPECÍFICOS DE LANDING PAQUETE ── */}
                    {draftData.heroTitle !== undefined && (
                      <div className="border-t border-neutral-700 pt-4 space-y-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">📦 Datos del Plan</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400 block">Nombre del Plan (Hero)</label>
                            <input type="text" value={draftData.heroTitle || ''} onChange={(e) => handleDraftChange('heroTitle', e.target.value)} className="w-full p-2.5 bg-black border border-neutral-700 rounded-lg text-white text-sm focus:border-[#CC0000]" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400 block">Texto Superior</label>
                            <input type="text" value={draftData.heroTopText || ''} onChange={(e) => handleDraftChange('heroTopText', e.target.value)} className="w-full p-2.5 bg-black border border-neutral-700 rounded-lg text-white text-sm focus:border-[#CC0000]" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400 block">Precio del Plan</label>
                            <input type="text" value={draftData.planPrice || ''} onChange={(e) => handleDraftChange('planPrice', e.target.value)} className="w-full p-2.5 bg-black border border-neutral-700 rounded-lg text-green-400 font-bold text-sm focus:border-[#CC0000]" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400 block">Período de Facturación</label>
                            <input type="text" value={draftData.planPeriod || ''} onChange={(e) => handleDraftChange('planPeriod', e.target.value)} className="w-full p-2.5 bg-black border border-neutral-700 rounded-lg text-white text-sm focus:border-[#CC0000]" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-400 block">Texto de Garantía</label>
                          <textarea rows="2" value={draftData.guaranteeText || ''} onChange={(e) => handleDraftChange('guaranteeText', e.target.value)} className="w-full p-2.5 bg-black border border-neutral-700 rounded-lg text-white text-sm focus:border-[#CC0000] resize-none" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ELEMENTO ACTIVO */}
                {activeElement !== null && (
                  <div className="space-y-5 bg-neutral-900 p-5 rounded-2xl border border-neutral-800 shadow-lg">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-white"></span>
                      Editando Sub-Elemento
                    </h3>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400 block">Nombre / Título</label>
                      <input type="text" value={activeElement.title || ''} onChange={(e) => handleElementChange('title', e.target.value)} className="w-full p-3 bg-black border border-neutral-700 rounded-xl text-white font-bold text-base focus:outline-none focus:border-[#CC0000] transition-colors" />
                    </div>
                    {activeElement.desc !== undefined && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-400 block">Descripción</label>
                        <textarea rows="4" value={activeElement.desc || ''} onChange={(e) => handleElementChange('desc', e.target.value)} className="w-full p-3 bg-black border border-neutral-700 rounded-xl text-gray-300 text-sm focus:border-[#CC0000] resize-none" />
                      </div>
                    )}
                  </div>
                )}

                {/* CARACTERÍSTICA EXPANDIBLE (LANDING) */}
                {activeFeatureExtended !== null && (
                  <div className="space-y-5 bg-neutral-900 p-5 rounded-2xl border border-neutral-800 shadow-lg">
                    <h3 className="text-sm font-bold text-[#CC0000] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#CC0000]"></span>
                      Editando Característica Base
                    </h3>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400 block">Título del Beneficio</label>
                      <input type="text" value={activeFeatureExtended.title || ''} onChange={(e) => handleFeatureExtendedChange('title', e.target.value)} className="w-full p-3 bg-black border border-neutral-700 rounded-xl text-white font-bold text-base focus:border-[#CC0000]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400 block">Descripción (Acepta HTML básico)</label>
                      <textarea rows="5" value={activeFeatureExtended.desc || ''} onChange={(e) => handleFeatureExtendedChange('desc', e.target.value)} className="w-full p-3 bg-black border border-neutral-700 rounded-xl text-gray-300 text-sm focus:border-[#CC0000] resize-none" />
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-neutral-600 gap-3 opacity-50">
                <p className="text-base font-medium">No hay ninguna sección seleccionada</p>
                <p className="text-xs">← Elige una sección del menú</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Panel Derecho: Preview en tiempo real ── */}
        {showPreviewPanel && (
          <div className="flex-1 overflow-hidden border-l border-neutral-800">
            <StudioPreview nodeId={selectedNodeId} draftData={draftData} />
          </div>
        )}

      </div>{/* fin split view */}

    </div>
  );
}

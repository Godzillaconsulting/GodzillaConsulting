import React, { useState, useEffect, useRef } from 'react';
import { useSiteData } from '../context/SiteContext';

// Orden de secciones tal como aparecen en el sitio web (de arriba hacia abajo)
const PAGE_SECTION_ORDER = [
  { id: 'hero',                         label: 'Hero',                    emoji: '🦖' },
  { id: 'servicios',                    label: 'Servicios',               emoji: '⚡' },
  { id: 'cultura',                      label: 'Cultura',                 emoji: '🏢' },
  { id: 'casos',                        label: 'Casos de Éxito',          emoji: '🏆' },
  { id: 'recursos',                     label: 'Recursos',                emoji: '📚' },
  { id: 'paquete-posicionamiento-social', label: 'Landing: Posicionamiento', emoji: '📣' },
  { id: 'paquete-expansion',            label: 'Landing: Expansión',      emoji: '🚀' },
  { id: 'paquete-control-ia',           label: 'Landing: Control IA',     emoji: '🤖' },
  { id: 'paquete-elite',               label: 'Landing: Élite',           emoji: '👑' },
  { id: 'footer',                       label: 'Footer',                  emoji: '📌' },
];

export default function AdminStudio() {
  const { nodes, fetchNodes } = useSiteData();
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedElementIndex, setSelectedElementIndex] = useState(null);
  const [selectedFeatureExtendedIndex, setSelectedFeatureExtendedIndex] = useState(null);
  const [draftData, setDraftData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPublishPreview, setShowPublishPreview] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.location.href = '/';
    }
  }, []);

  // Column 1: Nodes (Sections)
  const handleSelectNode = (node) => {
    setSelectedNodeId(node.id);
    setSelectedElementIndex(null);
    setSelectedFeatureExtendedIndex(null);
    setDraftData(node.draft_data || { title: node.id, elements: [] });
  };

  const handleSaveDraft = async () => {
    if (!selectedNodeId) return;
    setSaving(true);
    try {
      await fetch(`http://localhost:3000/api/nodes/${selectedNodeId}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_data: draftData })
      });
      await fetchNodes(); // Refresh
      alert('Cambios guardados exitosamente!');
    } catch (err) {
      console.error(err);
      alert('Error guardando cambios');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedNodeId) return;
    // Primero mostrar la previsualización
    setShowPublishPreview(true);
  };

  const handleConfirmPublish = async () => {
    try {
      await fetch(`http://localhost:3000/api/nodes/${selectedNodeId}/publish`, {
        method: 'POST'
      });
      await fetchNodes();
      setShowPublishPreview(false);
      alert('✅ Web publicada con éxito!');
    } catch (err) {
      console.error(err);
      alert('Error publicando la web');
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

  // Ordena los nodos según el orden del sitio web
  const sortedNodes = [...nodes].sort((a, b) => {
    const ai = PAGE_SECTION_ORDER.findIndex(s => s.id === a.id);
    const bi = PAGE_SECTION_ORDER.findIndex(s => s.id === b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <div className="flex h-screen bg-neutral-900 text-white w-full z-50 fixed inset-0 font-sans">
      
      {/* COLUMNA 1: Secciones ordenadas como la página */}
      <div className="w-[200px] min-w-[200px] border-r border-neutral-700 p-4 overflow-y-auto flex flex-col">
        <h2 className="text-xl font-black mb-1 text-[#CC0000]">Godzilla Studio</h2>
        <p className="text-xs text-gray-500 mb-4">↕ Orden del sitio web</p>
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
                className={`p-3 text-left rounded-xl transition-all shadow-md flex items-center gap-2 group ${
                  isSelected
                    ? 'bg-[#CC0000] text-white shadow-[0_4px_12px_rgba(204,0,0,0.35)]'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-gray-300'
                }`}
              >
                <span className="text-base shrink-0">{emoji}</span>
                <div className="min-w-0">
                  <span className="font-bold block text-sm leading-tight truncate">{label}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-red-200' : 'text-neutral-500'}`}>Sección {index + 1}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Botón de cerrar sesión abajo del todo */}
        <div className="mt-auto pt-4 border-t border-neutral-700">
          <button
            onClick={() => { localStorage.removeItem('adminToken'); window.location.href = '/'; }}
            className="w-full p-2 text-xs text-neutral-500 hover:text-red-400 transition-colors rounded-lg hover:bg-neutral-800"
          >
            🚪 Cerrar sesión
          </button>
        </div>
      </div>

      {/* COLUMNA 2: Componentes Internos de la Sección */}
      <div className="w-1/4 border-r border-neutral-700 p-6 bg-neutral-800 overflow-y-auto">
        <h2 className="text-xl font-bold mb-6 text-white">Contenido</h2>
        {selectedNodeId && draftData ? (
          <div>
            <div className="mb-8">
              <h3 className="text-sm text-gray-400 font-semibold mb-3 uppercase tracking-wider">Ajustes Generales</h3>
              <button 
                onClick={() => { setSelectedElementIndex(null); setSelectedFeatureExtendedIndex(null); }}
                className={`w-full p-3 text-left rounded-lg transition-colors border ${(selectedElementIndex === null && selectedFeatureExtendedIndex === null) ? 'bg-neutral-700 border-[#CC0000]' : 'bg-neutral-900 border-transparent hover:bg-neutral-700'}`}
              >
                Textos Principales y Medios
              </button>
            </div>

            {draftData.elements && draftData.elements.length > 0 && (
              <div>
                <h3 className="text-sm text-gray-400 font-semibold mb-3 uppercase tracking-wider">Tarjetas / Elementos</h3>
                <div className="flex flex-col gap-2">
                  {draftData.elements.map((el, idx) => (
                    <button 
                      key={idx}
                      onClick={() => { setSelectedElementIndex(idx); setSelectedFeatureExtendedIndex(null); }}
                      className={`w-full p-3 text-left rounded-lg transition-colors border ${selectedElementIndex === idx ? 'bg-neutral-700 border-[#CC0000]' : 'bg-neutral-900 border-transparent hover:bg-neutral-700'}`}
                    >
                      <span className="block font-medium truncate">{el.title || `Elemento ${idx + 1}`}</span>
                      {el.price && <span className="block text-xs text-brand-red font-bold mt-1">{el.price}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {draftData.planFeaturesExtended && draftData.planFeaturesExtended.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm text-gray-400 font-semibold mb-3 uppercase tracking-wider">Características Base</h3>
                <div className="flex flex-col gap-2">
                  {draftData.planFeaturesExtended.map((el, idx) => (
                    <button 
                      key={idx}
                      onClick={() => { setSelectedFeatureExtendedIndex(idx); setSelectedElementIndex(null); }}
                      className={`w-full p-3 text-left rounded-lg transition-colors border ${selectedFeatureExtendedIndex === idx ? 'bg-neutral-700 border-[#CC0000]' : 'bg-neutral-900 border-transparent hover:bg-neutral-700'}`}
                    >
                      <span className="block font-medium truncate">{el.title || `Característica ${idx + 1}`}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 text-neutral-500 text-center text-sm">
            ← Selecciona una sección para ver sus elementos
          </div>
        )}
      </div>

      {/* COLUMNA 3: Editor + Preview */}
      <div className="flex-1 p-8 bg-[#0D0D0D] overflow-y-auto relative">

        {/* Modal de Previsualización antes de publicar */}
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
                <button
                  onClick={() => setShowPublishPreview(false)}
                  className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-full font-bold transition"
                >
                  ← Volver a Editar
                </button>
                <button
                  onClick={handleConfirmPublish}
                  className="px-8 py-3 bg-[#CC0000] hover:bg-red-600 text-white rounded-full font-black transition shadow-[0_4px_20px_rgba(204,0,0,0.5)] text-lg"
                >
                  🚀 Confirmar y Publicar Web
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center mb-8 border-b border-neutral-800 pb-6 sticky top-0 bg-[#0D0D0D] z-10">
          <h2 className="text-2xl font-black text-white">Editor Visual</h2>
          <div className="flex gap-4">
            <button 
              onClick={handleSaveDraft}
              disabled={saving || !selectedNodeId}
              className="px-6 py-2.5 bg-neutral-700 hover:bg-neutral-600 rounded-full font-bold transition disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Borrador'}
            </button>
            <button 
              onClick={handlePublish}
              disabled={!selectedNodeId}
              className="px-6 py-2.5 bg-[#CC0000] hover:bg-red-600 text-white rounded-full font-black transition shadow-[0_4px_14px_rgba(204,0,0,0.4)] disabled:opacity-50 disabled:shadow-none"
            >
              Publicar Web
            </button>
          </div>
        </div>

        {selectedNodeId && draftData ? (
          <div className="flex flex-col gap-8 pb-20">
            
            {/* AJUSTES GENERALES */}
            {selectedElementIndex === null && selectedFeatureExtendedIndex === null ? (
              <div className="space-y-6 bg-neutral-900 p-6 rounded-2xl border border-neutral-800 shadow-lg">
                <h3 className="text-lg font-bold text-[#CC0000] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#CC0000]"></span>
                  Ajustes Globales del Nodo
                </h3>
                
                {draftData.title !== undefined && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-400 block">Título / Frase Principal</label>
                    <textarea 
                      rows="2"
                      value={draftData.title || ''}
                      onChange={(e) => handleDraftChange('title', e.target.value)}
                      className="w-full p-4 bg-black border border-neutral-700 rounded-xl text-white text-lg font-medium focus:outline-none focus:border-[#CC0000] transition-colors resize-none"
                    />
                  </div>
                )}

                {/* FIELDS FOR LANDING PAQUETE ROOT */}
                {draftData.heroTitle !== undefined && (
                  <div className="space-y-6 mt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-400 block">Nombre del Paquete (Hero)</label>
                        <input type="text" value={draftData.heroTitle || ''} onChange={(e) => handleDraftChange('heroTitle', e.target.value)} className="w-full p-3 bg-black border border-neutral-700 rounded-lg text-white focus:border-[#CC0000]" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-400 block">Texto Superior (Hero)</label>
                        <input type="text" value={draftData.heroTopText || ''} onChange={(e) => handleDraftChange('heroTopText', e.target.value)} className="w-full p-3 bg-black border border-neutral-700 rounded-lg text-white focus:border-[#CC0000]" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-400 block">URL de Video (Fondo/Detalles)</label>
                      <input type="text" value={draftData.videoUrl || ''} onChange={(e) => handleDraftChange('videoUrl', e.target.value)} className="w-full p-3 bg-black border border-neutral-700 rounded-lg text-white focus:border-[#CC0000]" placeholder="https://..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-400 block">Precio del Plan</label>
                        <input type="text" value={draftData.planPrice || ''} onChange={(e) => handleDraftChange('planPrice', e.target.value)} className="w-full p-3 bg-black border border-neutral-700 rounded-lg text-green-400 font-bold focus:border-[#CC0000]" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-400 block">Período de Facturación</label>
                        <input type="text" value={draftData.planPeriod || ''} onChange={(e) => handleDraftChange('planPeriod', e.target.value)} className="w-full p-3 bg-black border border-neutral-700 rounded-lg text-white focus:border-[#CC0000]" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-400 block">Texto Descriptivo de Garantía</label>
                      <textarea rows="2" value={draftData.guaranteeText || ''} onChange={(e) => handleDraftChange('guaranteeText', e.target.value)} className="w-full p-3 bg-black border border-neutral-700 rounded-lg text-white focus:border-[#CC0000]" />
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* ELEMENTOS DE ARRAY ESTÁNDAR */}
            {activeElement !== null && (
              <div className="space-y-6 bg-neutral-900 p-6 rounded-2xl border border-neutral-800 shadow-lg animate-in slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-white"></span>
                  Editando Sub-Elemento
                </h3>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400 block">Nombre / Título</label>
                  <input type="text" value={activeElement.title || ''} onChange={(e) => handleElementChange('title', e.target.value)} className="w-full p-4 bg-black border border-neutral-700 rounded-xl text-white font-bold text-lg focus:outline-none focus:border-[#CC0000] transition-colors" />
                </div>

                {activeElement.desc !== undefined && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-400 block">Descripción</label>
                    <textarea rows="4" value={activeElement.desc || ''} onChange={(e) => handleElementChange('desc', e.target.value)} className="w-full p-4 bg-black border border-neutral-700 rounded-xl text-gray-300 focus:border-[#CC0000] resize-none" />
                  </div>
                )}
              </div>
            )}

            {/* CARACTERÍSTICAS EXPANDIBLES (LANDING PAQUETES) */}
            {activeFeatureExtended !== null && (
              <div className="space-y-6 bg-neutral-900 p-6 rounded-2xl border border-neutral-800 shadow-lg animate-in slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-bold text-[#CC0000] flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-[#CC0000]"></span>
                  Editando Característica Base
                </h3>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400 block">Título del Beneficio</label>
                  <input type="text" value={activeFeatureExtended.title || ''} onChange={(e) => handleFeatureExtendedChange('title', e.target.value)} className="w-full p-4 bg-black border border-neutral-700 rounded-xl text-white font-bold text-lg focus:border-[#CC0000]" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400 block">Descripción del Beneficio (Acepta HTML básico como &lt;br/&gt;)</label>
                  <textarea rows="5" value={activeFeatureExtended.desc || ''} onChange={(e) => handleFeatureExtendedChange('desc', e.target.value)} className="w-full p-4 bg-black border border-neutral-700 rounded-xl text-gray-300 focus:border-[#CC0000] resize-none" />
                </div>
              </div>
            )}

          </div>
        ) : (
          // PREVISUALIZACIÓN del sitio en vivo cuando no hay sección seleccionada
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4 p-2 bg-neutral-900 rounded-xl border border-neutral-800">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-sm text-gray-400 font-medium">Vista previa en vivo —</span>
              <span className="text-sm text-green-400 font-bold">godzillaconsulting.ai</span>
              <a
                href="https://godzillaconsulting.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-xs text-neutral-500 hover:text-white transition-colors px-3 py-1.5 bg-neutral-800 rounded-lg"
              >
                ↗ Abrir sitio
              </a>
            </div>
            <div className="flex-1 rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl relative">
              <iframe
                src="https://godzillaconsulting.ai"
                title="Preview del sitio en vivo"
                className="w-full h-full"
                style={{ transformOrigin: 'top left', border: 'none' }}
              />
              {/* Overlay instruccional */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-full border border-neutral-700 pointer-events-none">
                👈 Selecciona una sección para editarla
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useSiteData } from '../context/SiteContext';
import StudioPreview from './StudioPreview';
import MediaPicker from './MediaPicker';

// Orden de secciones como aparecen en el sitio (de arriba hacia abajo)
const PAGE_SECTIONS = [
  { id: 'hero',                          label: 'Hero',                emoji: '🦖', tag: 'INICIO' },
  { id: 'servicios',                     label: 'Servicios',           emoji: '⚡', tag: 'SERVICIOS' },
  { id: 'cultura',                       label: 'Cultura',             emoji: '🏢', tag: 'CULTURA' },
  { id: 'casos',                         label: 'Casos de Éxito',      emoji: '🏆', tag: 'CASOS' },
  { id: 'recursos',                      label: 'Recursos',            emoji: '📚', tag: 'RECURSOS' },
  { id: 'paquete-posicionamiento-social', label: 'Posicionamiento',    emoji: '📣', tag: 'LANDING' },
  { id: 'paquete-expansion',             label: 'Expansión',           emoji: '🚀', tag: 'LANDING' },
  { id: 'paquete-control-ia',            label: 'Control IA',          emoji: '🤖', tag: 'LANDING' },
  { id: 'paquete-elite',                 label: 'Élite',               emoji: '👑', tag: 'LANDING' },
  { id: 'footer',                        label: 'Footer',              emoji: '📌', tag: 'PIE' },
];

// Tabs disponibles por sección
const TABS = [
  { id: 'textos',    label: '📝 Textos',    always: true },
  { id: 'media',     label: '🖼️ Media',    always: true },
  { id: 'colores',   label: '🎨 Colores',  always: true },
  { id: 'elementos', label: '📦 Elementos', always: false },
];

function ColorField({ label, field, draftData, onChange }) {
  const val = draftData[field] || '#CC0000';
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-400 block">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={val}
          onChange={e => onChange(field, e.target.value)}
          className="w-10 h-10 rounded-lg border border-neutral-600 cursor-pointer bg-transparent shrink-0"
        />
        <input
          type="text"
          value={val}
          onChange={e => onChange(field, e.target.value)}
          className="flex-1 p-2 bg-black border border-neutral-700 rounded-lg text-white text-xs font-mono focus:border-[#CC0000] outline-none"
          placeholder="#CC0000"
        />
        <div className="w-8 h-8 rounded-md border border-neutral-600 shrink-0" style={{ background: val }} />
      </div>
    </div>
  );
}

export default function AdminStudio() {
  const { nodes, fetchNodes, setPreviewOverride } = useSiteData();
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [activeTab, setActiveTab] = useState('textos');
  const [selectedElementIndex, setSelectedElementIndex] = useState(null);
  const [selectedFeatureIndex, setSelectedFeatureIndex] = useState(null);
  const [draftData, setDraftData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // Auth
  useEffect(() => {
    if (!localStorage.getItem('adminToken')) window.location.href = '/';
  }, []);

  // Sync draftData → preview en tiempo real
  useEffect(() => {
    if (selectedNodeId && draftData) setPreviewOverride(selectedNodeId, draftData);
    else setPreviewOverride(null, null);
  }, [draftData, selectedNodeId]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const handleSelectSection = (node) => {
    setSelectedNodeId(node.id);
    setActiveTab('textos');
    setSelectedElementIndex(null);
    setSelectedFeatureIndex(null);
    const published = node.published_data || {};
    const draft = node.draft_data || {};
    setDraftData({ ...published, ...draft });
  };

  const change = (key, val) => setDraftData(prev => ({ ...prev, [key]: val }));

  const changeElement = (key, val) => {
    if (selectedElementIndex === null) return;
    setDraftData(prev => {
      const els = [...(prev.elements || [])];
      els[selectedElementIndex] = { ...els[selectedElementIndex], [key]: val };
      return { ...prev, elements: els };
    });
  };

  const changeFeature = (key, val) => {
    if (selectedFeatureIndex === null) return;
    setDraftData(prev => {
      const feats = [...(prev.planFeaturesExtended || [])];
      feats[selectedFeatureIndex] = { ...feats[selectedFeatureIndex], [key]: val };
      return { ...prev, planFeaturesExtended: feats };
    });
  };

  const handleSave = async () => {
    if (!selectedNodeId) return;
    setSaving(true);
    try {
      await fetch(`http://localhost:3000/api/nodes/${selectedNodeId}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_data: draftData })
      });
      await fetchNodes();
      alert('✅ Borrador guardado');
    } catch { alert('❌ Error guardando'); }
    finally { setSaving(false); }
  };

  const handlePublish = async () => {
    try {
      await fetch(`http://localhost:3000/api/nodes/${selectedNodeId}/publish`, { method: 'POST' });
      await fetchNodes();
      setShowPublishModal(false);
      alert('🚀 Publicado con éxito');
    } catch { alert('❌ Error publicando'); }
  };

  // Ordenar nodos según el orden del sitio
  const sortedNodes = [...nodes].sort((a, b) => {
    const ai = PAGE_SECTIONS.findIndex(s => s.id === a.id);
    const bi = PAGE_SECTIONS.findIndex(s => s.id === b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const activeElement = selectedElementIndex !== null ? draftData?.elements?.[selectedElementIndex] : null;
  const activeFeature = selectedFeatureIndex !== null ? draftData?.planFeaturesExtended?.[selectedFeatureIndex] : null;
  const hasElements = draftData?.elements?.length > 0;
  const hasFeatures = draftData?.planFeaturesExtended?.length > 0;

  const visibleTabs = TABS.filter(t => t.always || (t.id === 'elementos' && (hasElements || hasFeatures)));

  return (
    <div className="fixed inset-0 z-50 flex bg-[#0a0a0a] text-white font-sans overflow-hidden">

      {/* ██ MODAL PUBLICAR ██ */}
      {showPublishModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8">
          <div className="bg-neutral-900 rounded-2xl border border-neutral-700 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-neutral-700">
              <div>
                <h3 className="text-xl font-black text-white">📡 Vista Previa antes de Publicar</h3>
                <p className="text-sm text-gray-400 mt-1">Revisa el sitio antes de confirmar la publicación.</p>
              </div>
              <button onClick={() => setShowPublishModal(false)} className="text-xl text-neutral-500 hover:text-white">✕</button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <iframe src="https://godzillaconsulting.ai" title="Preview" className="w-full rounded-xl border border-neutral-700" style={{ height: '52vh', border: 'none' }} />
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-neutral-700">
              <button onClick={() => setShowPublishModal(false)} className="px-5 py-2.5 bg-neutral-700 hover:bg-neutral-600 rounded-full font-bold text-sm transition">← Volver</button>
              <button onClick={handlePublish} className="px-7 py-2.5 bg-[#CC0000] hover:bg-red-600 text-white rounded-full font-black text-sm transition shadow-[0_4px_20px_rgba(204,0,0,0.5)]">🚀 Confirmar y Publicar</button>
            </div>
          </div>
        </div>
      )}

      {/* ██ COL 1: NAVEGACIÓN DE SECCIONES ██ */}
      <div className="w-[200px] min-w-[200px] flex flex-col border-r border-neutral-800 bg-[#0d0d0d] overflow-hidden">
        {/* Logo */}
        <div className="px-4 pt-5 pb-3 border-b border-neutral-800">
          <p className="text-base font-black text-[#CC0000] leading-none">Godzilla</p>
          <p className="text-[10px] text-neutral-500 mt-0.5">Admin Studio</p>
        </div>

        {/* Lista de secciones */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {sortedNodes.map((node, idx) => {
            const meta = PAGE_SECTIONS.find(s => s.id === node.id);
            const isSelected = selectedNodeId === node.id;
            return (
              <button
                key={node.id}
                onClick={() => handleSelectSection(node)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 group ${
                  isSelected
                    ? 'bg-[#CC0000] shadow-[0_4px_14px_rgba(204,0,0,0.3)]'
                    : 'hover:bg-neutral-800'
                }`}
              >
                <span className="text-lg leading-none shrink-0">{meta?.emoji || '📄'}</span>
                <div className="min-w-0 flex-1">
                  <span className={`block text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                    {meta?.label || node.id}
                  </span>
                  <span className={`text-[9px] font-medium ${isSelected ? 'text-red-200' : 'text-neutral-500'}`}>
                    {meta?.tag ? `§${idx + 1} · ${meta.tag}` : `§${idx + 1}`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-800">
          <button
            onClick={() => { localStorage.removeItem('adminToken'); window.location.href = '/'; }}
            className="w-full text-[10px] text-neutral-600 hover:text-red-400 py-2 rounded-lg hover:bg-neutral-900 transition-colors"
          >
            🚪 Cerrar sesión
          </button>
        </div>
      </div>

      {/* ██ ÁREA PRINCIPAL: EDITOR + PREVIEW ██ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Barra superior ── */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-800 bg-[#0d0d0d] shrink-0">
          {selectedNodeId ? (
            <div className="flex items-center gap-3">
              <span className="text-lg">{PAGE_SECTIONS.find(s => s.id === selectedNodeId)?.emoji || '📄'}</span>
              <div>
                <h2 className="text-sm font-black text-white leading-none">
                  {PAGE_SECTIONS.find(s => s.id === selectedNodeId)?.label || selectedNodeId}
                </h2>
                <p className="text-[10px] text-neutral-500 mt-0.5">Editando sección · cambios en borrador</p>
              </div>
            </div>
          ) : (
            <h2 className="text-sm font-black text-neutral-400">← Selecciona una sección</h2>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(p => !p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                showPreview ? 'bg-[#CC0000]/15 text-[#CC0000] border border-[#CC0000]/30' : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {showPreview ? '◧ Ocultar preview' : '▣ Preview'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !selectedNodeId}
              className="px-4 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-xs font-bold rounded-full transition disabled:opacity-40"
            >
              {saving ? '...' : '💾 Guardar'}
            </button>
            <button
              onClick={() => setShowPublishModal(true)}
              disabled={!selectedNodeId}
              className="px-4 py-1.5 bg-[#CC0000] hover:bg-red-600 text-white text-xs font-black rounded-full transition shadow-[0_4px_12px_rgba(204,0,0,0.4)] disabled:opacity-40"
            >
              🚀 Publicar
            </button>
          </div>
        </div>

        {/* ── Cuerpo principal ── */}
        <div className="flex-1 flex overflow-hidden">

          {/* ─ PANEL EDITOR ─ */}
          <div
            className="flex flex-col overflow-hidden border-r border-neutral-800 transition-all duration-300"
            style={{ width: showPreview ? '44%' : '100%' }}
          >
            {selectedNodeId && draftData ? (
              <>
                {/* Tabs */}
                <div className="flex gap-1 px-4 py-2.5 border-b border-neutral-800 bg-[#0d0d0d] shrink-0">
                  {visibleTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setSelectedElementIndex(null); setSelectedFeatureIndex(null); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeTab === tab.id
                          ? 'bg-[#CC0000] text-white'
                          : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Contenido del tab */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">

                  {/* ─────── TAB: TEXTOS ─────── */}
                  {activeTab === 'textos' && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Textos de la Sección</h3>

                      {draftData.title !== undefined && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-400 block">Título Principal</label>
                          <textarea rows="2" value={draftData.title || ''} onChange={e => change('title', e.target.value)}
                            className="w-full p-3 bg-black border border-neutral-700 rounded-xl text-white text-sm font-medium focus:border-[#CC0000] outline-none resize-none transition-colors" />
                        </div>
                      )}
                      {(draftData.subtitle !== undefined || draftData.desc !== undefined) && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-400 block">Subtítulo / Descripción</label>
                          <textarea rows="3" value={draftData.subtitle ?? draftData.desc ?? ''} onChange={e => change(draftData.subtitle !== undefined ? 'subtitle' : 'desc', e.target.value)}
                            className="w-full p-3 bg-black border border-neutral-700 rounded-xl text-white text-sm focus:border-[#CC0000] outline-none resize-none transition-colors" />
                        </div>
                      )}
                      {draftData.ctaText !== undefined && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400 block">Texto del Botón</label>
                            <input type="text" value={draftData.ctaText || ''} onChange={e => change('ctaText', e.target.value)}
                              className="w-full p-2.5 bg-black border border-neutral-700 rounded-lg text-white text-sm focus:border-[#CC0000] outline-none" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400 block">Link del Botón</label>
                            <input type="text" value={draftData.ctaLink || ''} onChange={e => change('ctaLink', e.target.value)}
                              className="w-full p-2.5 bg-black border border-neutral-700 rounded-lg text-white text-sm focus:border-[#CC0000] outline-none" />
                          </div>
                        </div>
                      )}

                      {/* Campos específicos de Landing Paquete */}
                      {draftData.heroTitle !== undefined && (
                        <div className="space-y-3 pt-2 border-t border-neutral-800">
                          <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Datos del Plan</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-gray-400 block">Nombre del Plan</label>
                              <input type="text" value={draftData.heroTitle || ''} onChange={e => change('heroTitle', e.target.value)}
                                className="w-full p-2.5 bg-black border border-neutral-700 rounded-lg text-white text-sm focus:border-[#CC0000] outline-none" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-gray-400 block">Texto Superior</label>
                              <input type="text" value={draftData.heroTopText || ''} onChange={e => change('heroTopText', e.target.value)}
                                className="w-full p-2.5 bg-black border border-neutral-700 rounded-lg text-white text-sm focus:border-[#CC0000] outline-none" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-gray-400 block">Precio</label>
                              <input type="text" value={draftData.planPrice || ''} onChange={e => change('planPrice', e.target.value)}
                                className="w-full p-2.5 bg-black border border-neutral-700 rounded-lg text-green-400 font-bold text-sm focus:border-[#CC0000] outline-none" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-gray-400 block">Período</label>
                              <input type="text" value={draftData.planPeriod || ''} onChange={e => change('planPeriod', e.target.value)}
                                className="w-full p-2.5 bg-black border border-neutral-700 rounded-lg text-white text-sm focus:border-[#CC0000] outline-none" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400 block">Texto de Garantía</label>
                            <textarea rows="2" value={draftData.guaranteeText || ''} onChange={e => change('guaranteeText', e.target.value)}
                              className="w-full p-2.5 bg-black border border-neutral-700 rounded-lg text-white text-sm focus:border-[#CC0000] outline-none resize-none" />
                          </div>
                        </div>
                      )}

                      {/* Sin campos de texto */}
                      {draftData.title === undefined && draftData.heroTitle === undefined && draftData.subtitle === undefined && draftData.desc === undefined && (
                        <p className="text-neutral-600 text-sm text-center py-8">Esta sección no tiene campos de texto editables directamente.</p>
                      )}
                    </div>
                  )}

                  {/* ─────── TAB: MEDIA ─────── */}
                  {activeTab === 'media' && (
                    <div className="space-y-5">
                      <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Imágenes, Videos & Logos</h3>

                      <MediaPicker
                        label="🖼️ Imagen Principal (Hero / Portada)"
                        value={draftData.imageUrl || ''}
                        onChange={url => change('imageUrl', url)}
                        accept="image"
                      />
                      <MediaPicker
                        label="🏷️ Logo de la Sección"
                        value={draftData.logoUrl || ''}
                        onChange={url => change('logoUrl', url)}
                        accept="image"
                      />
                      <MediaPicker
                        label="🎬 Video de Fondo"
                        value={draftData.videoUrl || draftData.bgVideoUrl || ''}
                        onChange={url => change(draftData.bgVideoUrl !== undefined ? 'bgVideoUrl' : 'videoUrl', url)}
                        accept="video"
                      />
                      <MediaPicker
                        label="🌄 Imagen de Fondo"
                        value={draftData.bgImageUrl || ''}
                        onChange={url => change('bgImageUrl', url)}
                        accept="image"
                      />
                      <MediaPicker
                        label="🖼️ Imagen Secundaria / Demo"
                        value={draftData.videoFileUrl || ''}
                        onChange={url => change('videoFileUrl', url)}
                        accept="all"
                      />
                    </div>
                  )}

                  {/* ─────── TAB: COLORES ─────── */}
                  {activeTab === 'colores' && (
                    <div className="space-y-5">
                      <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Paleta de Colores</h3>
                      <ColorField label="Color de Acento" field="accentColor" draftData={{ ...{ accentColor: '#CC0000' }, ...draftData }} onChange={change} />
                      <ColorField label="Color de Fondo" field="bgColor" draftData={{ ...{ bgColor: '#111111' }, ...draftData }} onChange={change} />
                      <ColorField label="Color de Texto Principal" field="textColor" draftData={{ ...{ textColor: '#FFFFFF' }, ...draftData }} onChange={change} />
                      <ColorField label="Color de Texto Secundario" field="subtextColor" draftData={{ ...{ subtextColor: '#9CA3AF' }, ...draftData }} onChange={change} />
                      <ColorField label="Color del Botón CTA" field="ctaColor" draftData={{ ...{ ctaColor: '#CC0000' }, ...draftData }} onChange={change} />
                      <ColorField label="Color de Borde / Líneas" field="borderColor" draftData={{ ...{ borderColor: '#333333' }, ...draftData }} onChange={change} />
                    </div>
                  )}

                  {/* ─────── TAB: ELEMENTOS ─────── */}
                  {activeTab === 'elementos' && (
                    <div className="flex gap-4 h-full">

                      {/* Lista de elementos / features */}
                      <div className="w-36 shrink-0 space-y-2">
                        {hasElements && (
                          <>
                            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Tarjetas</p>
                            {draftData.elements.map((el, idx) => (
                              <button
                                key={idx}
                                onClick={() => { setSelectedElementIndex(idx); setSelectedFeatureIndex(null); }}
                                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all border ${
                                  selectedElementIndex === idx
                                    ? 'bg-neutral-700 border-[#CC0000] text-white'
                                    : 'bg-neutral-800 border-transparent text-neutral-400 hover:text-white'
                                }`}
                              >
                                <span className="block font-bold truncate">{el.title || `Elem. ${idx + 1}`}</span>
                                {el.price && <span className="text-[10px] text-green-400">{el.price}</span>}
                              </button>
                            ))}
                          </>
                        )}
                        {hasFeatures && (
                          <>
                            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-3">Características</p>
                            {draftData.planFeaturesExtended.map((f, idx) => (
                              <button
                                key={idx}
                                onClick={() => { setSelectedFeatureIndex(idx); setSelectedElementIndex(null); }}
                                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all border ${
                                  selectedFeatureIndex === idx
                                    ? 'bg-neutral-700 border-[#CC0000] text-white'
                                    : 'bg-neutral-800 border-transparent text-neutral-400 hover:text-white'
                                }`}
                              >
                                <span className="block font-bold truncate">{f.title || `Feature ${idx + 1}`}</span>
                              </button>
                            ))}
                          </>
                        )}
                      </div>

                      {/* Editor del elemento/feature seleccionado */}
                      <div className="flex-1 space-y-4">
                        {activeElement && (
                          <>
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Editando Elemento</h3>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-gray-400 block">Título</label>
                              <input type="text" value={activeElement.title || ''} onChange={e => changeElement('title', e.target.value)}
                                className="w-full p-3 bg-black border border-neutral-700 rounded-xl text-white font-bold text-sm focus:border-[#CC0000] outline-none" />
                            </div>
                            {activeElement.desc !== undefined && (
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-400 block">Descripción</label>
                                <textarea rows="4" value={activeElement.desc || ''} onChange={e => changeElement('desc', e.target.value)}
                                  className="w-full p-3 bg-black border border-neutral-700 rounded-xl text-gray-300 text-sm focus:border-[#CC0000] outline-none resize-none" />
                              </div>
                            )}
                            {activeElement.price !== undefined && (
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-400 block">Precio</label>
                                <input type="text" value={activeElement.price || ''} onChange={e => changeElement('price', e.target.value)}
                                  className="w-full p-2.5 bg-black border border-neutral-700 rounded-lg text-green-400 font-bold text-sm focus:border-[#CC0000] outline-none" />
                              </div>
                            )}
                            {/* Media dentro del elemento */}
                            <MediaPicker
                              label="Imagen / Ícono del elemento"
                              value={activeElement.imageUrl || activeElement.iconUrl || ''}
                              onChange={url => changeElement('imageUrl', url)}
                              accept="image"
                            />
                          </>
                        )}

                        {activeFeature && (
                          <>
                            <h3 className="text-xs font-bold text-[#CC0000] uppercase tracking-wider">Editando Característica</h3>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-gray-400 block">Título del Beneficio</label>
                              <input type="text" value={activeFeature.title || ''} onChange={e => changeFeature('title', e.target.value)}
                                className="w-full p-3 bg-black border border-neutral-700 rounded-xl text-white font-bold text-sm focus:border-[#CC0000] outline-none" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-gray-400 block">Descripción (acepta HTML básico)</label>
                              <textarea rows="5" value={activeFeature.desc || ''} onChange={e => changeFeature('desc', e.target.value)}
                                className="w-full p-3 bg-black border border-neutral-700 rounded-xl text-gray-300 text-sm focus:border-[#CC0000] outline-none resize-none" />
                            </div>
                          </>
                        )}

                        {!activeElement && !activeFeature && (
                          <p className="text-neutral-600 text-sm text-center py-12">← Selecciona un elemento para editar</p>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </>
            ) : (
              /* Estado vacío */
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-neutral-700">
                <span className="text-6xl">🦖</span>
                <p className="text-base font-bold">Selecciona una sección</p>
                <p className="text-xs">← Elige del menú izquierdo</p>
              </div>
            )}
          </div>

          {/* ─ PANEL PREVIEW ─ */}
          {showPreview && (
            <div className="flex-1 overflow-hidden border-l border-neutral-800">
              <StudioPreview nodeId={selectedNodeId} draftData={draftData} />
            </div>
          )}

        </div>
      </div>

    </div>
  );
}

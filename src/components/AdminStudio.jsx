import React, { useState, useEffect } from 'react';
import { useSiteData } from '../context/SiteContext';

export default function AdminStudio() {
  const { nodes, fetchNodes } = useSiteData();
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedElementIndex, setSelectedElementIndex] = useState(null);
  const [draftData, setDraftData] = useState(null);
  const [saving, setSaving] = useState(false);

  // Column 1: Nodes (Sections)
  const handleSelectNode = (node) => {
    setSelectedNodeId(node.id);
    setSelectedElementIndex(null); // Reset element selection
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
    try {
      if (confirm('¿Estás seguro que deseas publicar estos cambios en la web en vivo?')) {
        await fetch(`http://localhost:3000/api/nodes/${selectedNodeId}/publish`, {
          method: 'POST'
        });
        await fetchNodes(); // Refresh to catch published data
        alert('Web publicada con éxito!');
      }
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

  const activeElement = selectedElementIndex !== null ? draftData?.elements?.[selectedElementIndex] : null;

  return (
    <div className="flex h-screen bg-neutral-900 text-white w-full z-50 fixed inset-0 font-sans">
      
      {/* COLUMNA 1: Secciones (Nodos) */}
      <div className="w-1/4 border-r border-neutral-700 p-6 overflow-y-auto">
        <h2 className="text-2xl font-black mb-6 text-[#CC0000]">Godzilla Studio</h2>
        <p className="text-sm text-gray-400 mb-4">Selecciona la sección a editar:</p>
        <div className="flex flex-col gap-3">
          {nodes.map(node => (
            <button
              key={node.id}
              onClick={() => handleSelectNode(node)}
              className={`p-4 text-left rounded-xl transition-all shadow-md ${selectedNodeId === node.id ? 'bg-[#CC0000] text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-gray-200'}`}
            >
              <span className="font-bold block capitalize text-lg">{node.id}</span>
              <span className="text-xs opacity-70 mt-1 block">Ruta: /{node.id === 'hero' ? '' : node.id}</span>
            </button>
          ))}
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
                onClick={() => setSelectedElementIndex(null)}
                className={`w-full p-3 text-left rounded-lg transition-colors border ${selectedElementIndex === null ? 'bg-neutral-700 border-gray-500' : 'bg-neutral-900 border-transparent hover:bg-neutral-700'}`}
              >
                Textos Principales
              </button>
            </div>

            {draftData.elements && draftData.elements.length > 0 && (
              <div>
                <h3 className="text-sm text-gray-400 font-semibold mb-3 uppercase tracking-wider">Tarjetas / Elementos</h3>
                <div className="flex flex-col gap-2">
                  {draftData.elements.map((el, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setSelectedElementIndex(idx)}
                      className={`w-full p-3 text-left rounded-lg transition-colors border ${selectedElementIndex === idx ? 'bg-neutral-700 border-[#CC0000]' : 'bg-neutral-900 border-transparent hover:bg-neutral-700'}`}
                    >
                      <span className="block font-medium truncate">{el.title || `Elemento ${idx + 1}`}</span>
                      {el.price && <span className="block text-xs text-brand-red font-bold mt-1">{el.price}</span>}
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

      {/* COLUMNA 3: Formulario de Edición en Lenguaje Natural */}
      <div className="w-2/4 p-8 bg-[#0D0D0D] overflow-y-auto relative">
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
            
            {/* Si estamos editando los Ajustes Generales (No hay elemento seleccionado) */}
            {selectedElementIndex === null ? (
              <div className="space-y-6 bg-neutral-900 p-6 rounded-2xl border border-neutral-800 shadow-lg">
                <h3 className="text-lg font-bold text-[#CC0000] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#CC0000]"></span>
                  Textos Principales de la Sección
                </h3>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400 block">Título / Frase Principal</label>
                  <textarea 
                    rows="2"
                    value={draftData.title || ''}
                    onChange={(e) => handleDraftChange('title', e.target.value)}
                    className="w-full p-4 bg-black border border-neutral-700 rounded-xl text-white text-lg font-medium focus:outline-none focus:border-[#CC0000] transition-colors resize-none"
                    placeholder="Escribe la frase principal..."
                  />
                </div>

                {draftData.ctaText !== undefined && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-400 block">Texto del Botón</label>
                      <input 
                        type="text" 
                        value={draftData.ctaText || ''}
                        onChange={(e) => handleDraftChange('ctaText', e.target.value)}
                        className="w-full p-4 bg-black border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-[#CC0000] transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-400 block">Enlace del Botón</label>
                      <input 
                        type="text" 
                        value={draftData.ctaLink || ''}
                        onChange={(e) => handleDraftChange('ctaLink', e.target.value)}
                        className="w-full p-4 bg-black border border-neutral-700 rounded-xl text-gray-300 font-mono text-sm focus:outline-none focus:border-[#CC0000] transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Si estamos editando un Elemento de la lista (Tarjeta, Servicio, Paquete) */
              activeElement && (
                <div className="space-y-6 bg-neutral-900 p-6 rounded-2xl border border-neutral-800 shadow-lg animate-in slide-in-from-right-4 duration-300">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-full bg-white"></span>
                    Editando Elemento
                  </h3>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-400 block">Nombre / Título</label>
                    <input 
                      type="text" 
                      value={activeElement.title || ''}
                      onChange={(e) => handleElementChange('title', e.target.value)}
                      className="w-full p-4 bg-black border border-neutral-700 rounded-xl text-white font-bold text-lg focus:outline-none focus:border-[#CC0000] transition-colors"
                    />
                  </div>

                  {activeElement.desc !== undefined && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-400 block">Descripción Detallada</label>
                      <textarea 
                        rows="4"
                        value={activeElement.desc || ''}
                        onChange={(e) => handleElementChange('desc', e.target.value)}
                        className="w-full p-4 bg-black border border-neutral-700 rounded-xl text-gray-300 leading-relaxed focus:outline-none focus:border-[#CC0000] transition-colors resize-none"
                      />
                    </div>
                  )}

                  {activeElement.price !== undefined && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-400 block">Precio Mensual</label>
                        <input 
                          type="text" 
                          value={activeElement.price || ''}
                          onChange={(e) => handleElementChange('price', e.target.value)}
                          className="w-full p-4 bg-black border border-neutral-700 rounded-xl text-green-400 font-black text-xl focus:outline-none focus:border-green-500 transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-400 block">Período</label>
                        <input 
                          type="text" 
                          value={activeElement.period || ''}
                          onChange={(e) => handleElementChange('period', e.target.value)}
                          className="w-full p-4 bg-black border border-neutral-700 rounded-xl text-gray-300 focus:outline-none focus:border-[#CC0000] transition-colors"
                        />
                      </div>
                    </div>
                  )}

                  {activeElement.guarantee !== undefined && (
                    <div className="space-y-2 mt-4">
                      <label className="text-sm font-semibold text-gray-400 block">Texto de la Garantía</label>
                      <textarea 
                        rows="2"
                        value={activeElement.guarantee || ''}
                        onChange={(e) => handleElementChange('guarantee', e.target.value)}
                        className="w-full p-4 bg-red-950/30 border border-red-900/50 rounded-xl text-red-200 italic focus:outline-none focus:border-red-500 transition-colors resize-none"
                      />
                    </div>
                  )}

                  {activeElement.features && Array.isArray(activeElement.features) && (
                    <div className="space-y-3 mt-6 pt-6 border-t border-neutral-800">
                      <label className="text-sm font-semibold text-gray-400 block mb-2">Puntos del Paquete (Checklist)</label>
                      {activeElement.features.map((feature, i) => (
                        <div key={i} className="flex gap-3 items-center">
                          <span className="text-green-500 shrink-0">✓</span>
                          <input 
                            type="text" 
                            value={feature || ''}
                            onChange={(e) => handleFeatureChange(i, e.target.value)}
                            className="w-full p-3 bg-black border border-neutral-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-[#CC0000]"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              )
            )}

          </div>
        ) : (
           <div className="flex flex-col items-center justify-center h-full text-neutral-600 gap-4 opacity-50">
             <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
             <p className="text-xl font-medium">No hay ninguna sección seleccionada</p>
           </div>
        )}
      </div>

    </div>
  );
}

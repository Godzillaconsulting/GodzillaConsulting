import React, { useState, useEffect } from 'react';
import { useSiteData } from '../context/SiteContext';

export default function AdminStudio() {
  const { nodes, fetchNodes } = useSiteData();
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedElementIndex, setSelectedElementIndex] = useState(null);
  const [selectedFeatureExtendedIndex, setSelectedFeatureExtendedIndex] = useState(null);
  const [draftData, setDraftData] = useState(null);
  const [saving, setSaving] = useState(false);

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
    try {
      if (confirm('¿Estás seguro que deseas publicar estos cambios en la web en vivo?')) {
        await fetch(`http://localhost:3000/api/nodes/${selectedNodeId}/publish`, {
          method: 'POST'
        });
        await fetchNodes(); // Refresh
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
              <span className="font-bold block capitalize text-lg">{node.id.replace('paquete-', 'Landing: ')}</span>
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
           <div className="flex flex-col items-center justify-center h-full text-neutral-600 gap-4 opacity-50">
             <p className="text-xl font-medium">No hay ninguna sección seleccionada</p>
           </div>
        )}
      </div>

    </div>
  );
}

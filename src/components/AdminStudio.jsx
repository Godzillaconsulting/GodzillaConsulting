import React, { useState, useEffect, useMemo } from'react';
import { useSiteData } from'../context/SiteContext';
import StudioPreview from'./StudioPreview';
import MediaPicker from'./MediaPicker';
import NewsletterPanel from'./NewsletterPanel';

// ── Hover field wrapper → activa resaltado en preview ──────────────────────
import logoCeoCuts from'../assets/Logos/CEO Cuts Logo@2x.png';
import logoCircleOne from'../assets/Logos/Circle One Logo@2x.png';
import logoDonElote from'../assets/Logos/Don Elote Logo@2x.png';
import logoFacemaker from'../assets/Logos/Facemaker Logo@2x.png';
import logoGrupoMrg from'../assets/Logos/Grupo MRG Logo@2x.png';
import logoMedhaus from'../assets/Logos/Medhaus Logo@2x.png';
import logoNutrisa from'../assets/Logos/Nutrisa Logo@2x.png';
import logoSanAntonio from'../assets/Logos/San Antonio Logo@2x.png';
import logoArtika from'../assets/Logos/Artika Logo@2x.png';

import bgVideoServicios from '../assets/Particulas Rojas.mp4';
import gifBot from '../assets/Gifs/Bot.gif';
import gifVideo from '../assets/Gifs/Video.gif';
import gifEmbudo from '../assets/Gifs/Embudo.gif';
import gifRedes from '../assets/Gifs/Redes Sociales.gif';
import gifSeo from '../assets/Gifs/Red Social Optimizar.gif';
import gifCrm from '../assets/Gifs/Estadistica.gif';
import whatsapp3d from '../assets/images/whatsapp_3d_icon.png';

function EditorField({ fieldKey, onHover, children }) {
 return (
 <div
 onMouseEnter={() => onHover(fieldKey)}
 onMouseLeave={() => onHover(null)}
 className="relative group/field"
 >
 <div className="absolute -left-2 top-0 bottom-0 w-0.5 bg-[#CC0000]/0 group-hover/field:bg-[#CC0000]/70 rounded-full transition-all duration-150" />
 {children}
 </div>
 );
}

// ── Secciones del sitio — IDs deben coincidir exactamente con site_nodes.id ─
const PAGE_SECTIONS = [
 { id:'hero', label:'Hero', emoji:'🦖', tag:'INICIO' },
 { id:'servicios', label:'Servicios', emoji:'⚡', tag:'SERVICIOS' },
 { id:'cultura', label:'Cultura', emoji:'🏢', tag:'CULTURA' },
 { id:'portafolio', label:'Casos de Éxito', emoji:'🏆', tag:'PORTAFOLIO'},
 { id:'recursos', label:'Recursos', emoji:'📚', tag:'RECURSOS' },
 { id:'paquetes', label:'Paquetes Grid', emoji:'📦', tag:'PAQUETES' },
 { id:'paquete-posicionamiento-social', label:'Posicionamiento', emoji:'📣', tag:'LANDING' },
 { id:'paquete-expansion', label:'Expansión', emoji:'🚀', tag:'LANDING' },
 { id:'paquete-control-ia', label:'Control IA', emoji:'🤖', tag:'LANDING' },
 { id:'paquete-elite', label:'Élite', emoji:'👑', tag:'LANDING' },
 { id:'footer', label:'Footer', emoji:'📌', tag:'PIE' },
];

// ── Detección automática de campos de texto en draftData ───────────────────
const NON_TEXT_KEYS = new Set(['ctaLink','enlace','link','href','url','src','elements','planFeaturesExtended']);
const MEDIA_PATTERNS = /url|src|image|video|logo|icon|thumbnail|cover|photo|gif|bg|media|banner|foto/i;
const SKIP_MEDIA = new Set(['ctaLink','enlace','link','href']);

function detectTextFields(data) {
 return Object.entries(data || {}).filter(([key, val]) =>
 typeof val === 'string' &&
 !MEDIA_PATTERNS.test(key) &&
 !NON_TEXT_KEYS.has(key) &&
 !key.startsWith('#') &&
 !/^([a-zA-Z]+?)(\d+)([A-Z][a-zA-Z]*)$/.test(key)
 );
}

function detectMediaFields(data) {
 return Object.entries(data || {}).filter(([key, val]) =>
 typeof val ==='string' &&
 MEDIA_PATTERNS.test(key) &&
 !SKIP_MEDIA.has(key)
 );
}

// Convierte camelCase/snakeCase a label legible
function toLabel(key) {
 return key
 .replace(/([A-Z])/g,' $1')
 .replace(/[_-]/g,'')
 .replace(/\b\w/g, c => c.toUpperCase())
 .trim();
}

// Agrupa campos numerados: service1Title, service2Desc → grupos por número
function detectGroupedFields(data) {
 const groups = {};
 Object.keys(data || {}).forEach(key => {
 const m = key.match(/^([a-zA-Z]+?)(\d+)([A-Z][a-zA-Z]*)$/);
 if (m) {
 const [, prefix, num, field] = m;
 if (!groups[prefix]) groups[prefix] = {};
 if (!groups[prefix][num]) groups[prefix][num] = {};
 groups[prefix][num][field] = data[key];
 groups[prefix][num]['_keys'] = groups[prefix][num]['_keys'] || {};
 groups[prefix][num]['_keys'][field] = key; // original key
 }
 });
 return groups;
}

// ── Componente color + tipografía ──────────────────────────────────────────
function ColorField({ label, fieldKey, draftData, onChange }) {
 const val = draftData[fieldKey] ||'#CC0000';
 return (
 <EditorField fieldKey={fieldKey} onHover={() => {}}>
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-gray-400 block">{label}</label>
 <div className="flex items-center gap-2">
 <input type="color" value={val} onChange={e => onChange(fieldKey, e.target.value)}
 className="w-10 h-10 rounded-lg border border-neutral-600 cursor-pointer bg-transparent shrink-0" />
 <input type="text" value={val} onChange={e => onChange(fieldKey, e.target.value)}
 className="flex-1 p-2 bg-black border border-neutral-700 rounded-lg text-white text-xs font-mono focus:border-[#CC0000] outline-none" />
 <div className="w-8 h-8 rounded-md border border-neutral-600 shrink-0" style={{ background: val }} />
 </div>
 </div>
 </EditorField>
 );
}

// ── Tabs ────────────────────────────────────────────────────────────────────
const TABS_DEF = [
 { id:'textos', label:'📝 Textos' },
 { id:'media', label:'🖼️ Media' },
 { id:'colores', label:'🎨 Colores' },
 { id:'tipografia', label:'✏️ Tipografía'},
 { id:'elementos', label:'📦 Elementos' },
];

const GOOGLE_FONTS = ['Inter','Roboto','Outfit','Poppins','Montserrat','Lato','Playfair Display','Raleway','Nunito','DM Sans'];

// ── Componente principal ────────────────────────────────────────────────────
export default function AdminStudio() {
 const { nodes, fetchNodes, setPreviewOverride } = useSiteData();
 const [selectedNodeId, setSelectedNodeId] = useState(null);
 const [activeSection, setActiveSection] = useState('editor'); //'editor' |'newsletter'
 const [activeTab, setActiveTab] = useState('textos');
 const [draftData, setDraftData] = useState(null);
 const [selectedElementIndex, setSelectedElementIndex] = useState(null);
 const [selectedFeatureIndex, setSelectedFeatureIndex] = useState(null);
 const [saving, setSaving] = useState(false);
 const [showPublishModal, setShowPublishModal] = useState(false);
 const [showPreview, setShowPreview] = useState(true);
 const [hoveredField, setHoveredField] = useState(null);

 // Auth check delegado a PrivateRoute (ver App.jsx)

 // Sync draftData → preview
 useEffect(() => {
 if (selectedNodeId && draftData) setPreviewOverride(selectedNodeId, draftData);
 else setPreviewOverride(null, null);
 return () => setPreviewOverride(null, null);
 }, [draftData, selectedNodeId]);

 const selectedNode = nodes.find(n => n.id === selectedNodeId);

 const handleSelectSection = (node) => {
 setSelectedNodeId(node.id);
 setActiveTab('textos');
 setSelectedElementIndex(null);
 setSelectedFeatureIndex(null);
 
 const combinedData = { ...(node.published_data || {}), ...(node.draft_data || {}) };
 
  // Autoinject videoUrl field for landing packages so it appears in Media automatically
  if (node.id.startsWith('paquete-') && combinedData.videoUrl === undefined) {
  combinedData.videoUrl ='';
  }

  // Inject imageUrl field for Cultura node to allow media editing
  if (node.id === 'cultura' && combinedData.imageUrl === undefined) {
      combinedData.imageUrl = '';
  }

  // Inject logos for Hero section so they can be modified
  if (node.id === 'hero' && combinedData.logoUrl1 === undefined) {
    combinedData.logoUrl1 = logoCeoCuts;
    combinedData.logoUrl2 = logoCircleOne;
    combinedData.logoUrl3 = logoDonElote;
    combinedData.logoUrl4 = logoFacemaker;
    combinedData.logoUrl5 = logoGrupoMrg;
    combinedData.logoUrl6 = logoMedhaus;
    combinedData.logoUrl7 = logoNutrisa;
    combinedData.logoUrl8 = logoSanAntonio;
    combinedData.logoUrl9 = logoArtika;
  }

  // Inject video and gifs for Servicios section so they can be modified
  if (node.id === 'servicios') {
      if (combinedData.videoUrl === undefined) combinedData.videoUrl = bgVideoServicios;
      if (combinedData.service1IconUrl === undefined) combinedData.service1IconUrl = gifBot;
      if (combinedData.service2IconUrl === undefined) combinedData.service2IconUrl = gifVideo;
      if (combinedData.service3IconUrl === undefined) combinedData.service3IconUrl = gifEmbudo;
      if (combinedData.service4IconUrl === undefined) combinedData.service4IconUrl = gifRedes;
      if (combinedData.service5IconUrl === undefined) combinedData.service5IconUrl = gifSeo;
      if (combinedData.service6IconUrl === undefined) combinedData.service6IconUrl = gifCrm;
  }

  // Inject defaults for Portafolio / Casos de Éxito
  if (node.id === 'portafolio' && combinedData.caso1LogoUrl === undefined) {
      combinedData.caso1LogoUrl = logoFacemaker;
      combinedData.caso1Nombre = 'Facemaker';
      combinedData.caso1Category = 'Clínica Estética';

      combinedData.caso2LogoUrl = logoCircleOne;
      combinedData.caso2Nombre = 'Circle One';
      combinedData.caso2Category = 'Hotelería';

      combinedData.caso3LogoUrl = logoCeoCuts;
      combinedData.caso3Nombre = 'CEO Cuts';
      combinedData.caso3Category = 'Barbería';

      combinedData.caso4LogoUrl = logoMedhaus;
      combinedData.caso4Nombre = 'Medhaus';
      combinedData.caso4Category = 'Sector Médico';

      combinedData.caso5LogoUrl = logoArtika;
      combinedData.caso5Nombre = 'Artika';
      combinedData.caso5Category = 'Heladerías';

      combinedData.caso6LogoUrl = logoGrupoMrg;
      combinedData.caso6Nombre = 'Grupo MRG';
      combinedData.caso6Category = 'Banquetes y Eventos';
  }

  // Inject defaults for Recursos
  if (node.id === 'recursos' && combinedData.recurso1ImageUrl === undefined) {
      combinedData.recurso1Nombre = '7 prompts de IA para marketing que sí funcionan';
      combinedData.recurso1Desc = 'El contenido de calidad ya no tiene que consumir horas de tu equipo. Esta colección de 7 prompts especializados te da las herramientas exactas que necesitas para crear copy, estrategias y análisis de nivel profesional en minutos. Acelera tu producción sin sacrificar calidad.';
      combinedData.recurso1ImageUrl = 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80';

      combinedData.recurso2Nombre = 'Cómo generar leads en WhatsApp sin spam';
      combinedData.recurso2Desc = 'WhatsApp se ha consolidado como el canal de comunicación preferido en México, con más de 90 millones de usuarios activos. Esta guía te muestra cómo aprovechar esta plataforma de manera profesional y efectiva para hacer crecer tu negocio. Domina el canal de comunicación más poderoso del país.';
      combinedData.recurso2ImageUrl = whatsapp3d;

      combinedData.recurso3Nombre = 'Plantilla de CRM Personalizable';
      combinedData.recurso3Desc = 'Llevar un seguimiento de tus leads en libretas u hojas caóticas te hace perder ventas a diario. Con este CRM en Excel totalmente personalizable y fácil de usar, podrás organizar a tus prospectos de forma clara, priorizar tus seguimientos y maximizar tu porcentaje de cierre. Simplifica tu proceso de ventas hoy mismo.';
      combinedData.recurso3ImageUrl = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80';
  }

  // Inject defaults for Paquetes
  if (node.id === 'paquetes' && combinedData.title === undefined) {
      combinedData.title = 'PAQUETES';
      combinedData.subtitle = 'Aprende más sobre la estrategia más adecuada para potenciar tu negocio. Todo esta protegido por contrato.';
      combinedData.elements = [
          {
              title: 'Posicionamiento Social',
              price: '$7,900',
              period: 'al mes',
              highlighted: false,
              guarantee: 'GARANTÍA: Si en 14 días no ves un incremento real en el engagement, el siguiente mes es GRATIS.',
              features: 'Estrategia de Contenido Omnicanal\nCopywriting de Respuesta Directa\nCommunity Management'
          },
          {
              title: 'Control IA',
              price: '$7,900',
              period: 'al mes',
              highlighted: false,
              guarantee: 'GARANTÍA: Si no está funcionando en 7 días, el siguiente mes es GRATIS.',
              features: 'Agente IA (Web + WhatsApp)\nRespuesta en menos de 5 segundos 24/7\nCaptura de datos automática'
          },
          {
              title: 'Expansión',
              price: '$29,900',
              period: 'al mes',
              highlighted: true,
              guarantee: 'GARANTÍA: Si no generamos leads en 30 días, te devolvemos tu DINERO.',
              features: 'Todo lo del Nivel Esencial\nTráfico Bilingüe (Ads Meta/Google)\nLanding Page de Alta Conversión'
          },
          {
              title: 'Élite',
              price: '$39,500',
              period: 'al mes',
              highlighted: false,
              guarantee: 'GARANTÍA: Si no aumentamos tus citas un 20% en 90 días, trabajamos GRATIS.',
              features: 'Estrategia Godfather Completa\nReactivación de Base de Datos\nConsultoría Mensual y Cierre'
          }
      ];
  }
 
 setDraftData(combinedData);
 };

 const change = (key, val) => setDraftData(p => ({ ...p, [key]: val }));

 const changeEl = (key, val) => {
 if (selectedElementIndex === null) return;
 setDraftData(p => { const a = [...(p.elements || [])]; a[selectedElementIndex] = { ...a[selectedElementIndex], [key]: val }; return { ...p, elements: a }; });
 };

 const changeFt = (key, val) => {
 if (selectedFeatureIndex === null) return;
 setDraftData(p => { const a = [...(p.planFeaturesExtended || [])]; a[selectedFeatureIndex] = { ...a[selectedFeatureIndex], [key]: val }; return { ...p, planFeaturesExtended: a }; });
 };

 const handleSave = async () => {
 if (!selectedNodeId) return;
 setSaving(true);
 try {
 const base = import.meta.env.DEV ?'http://localhost:3000' :'';
 await fetch(`${base}/api/nodes/${selectedNodeId}/draft`, {
 method:'PUT', headers: {'Content-Type':'application/json' },
 body: JSON.stringify({ draft_data: draftData })
 });
 await fetchNodes();
 alert('✅ Borrador guardado');
 } catch { alert('❌ Error al guardar'); }
 finally { setSaving(false); }
 };

 const handlePublish = async () => {
 const base = import.meta.env.DEV ?'http://localhost:3000' :'';
 try {
 await fetch(`${base}/api/nodes/${selectedNodeId}/publish`, { method:'POST' });
 await fetchNodes();
 setShowPublishModal(false);
 alert('🚀 Publicado');
 } catch { alert('❌ Error al publicar'); }
 };

  // Orden de nodos por PAGE_SECTIONS (Oculta nodos legacy no definidos en PAGE_SECTIONS)
  const sortedNodes = useMemo(() => {
      return nodes
          .filter(n => PAGE_SECTIONS.some(s => s.id === n.id))
          .sort((a, b) => {
              const ai = PAGE_SECTIONS.findIndex(s => s.id === a.id);
              const bi = PAGE_SECTIONS.findIndex(s => s.id === b.id);
              return ai - bi;
          });
  }, [nodes]);

 // Derived data detections
 const textFields = useMemo(() => detectTextFields(draftData), [draftData]);
 const mediaFields = useMemo(() => detectMediaFields(draftData), [draftData]);
 const groupedFields = useMemo(() => detectGroupedFields(draftData), [draftData]);
 const hasGrouped = Object.keys(groupedFields).length > 0;
 const hasElements = (draftData?.elements?.length || 0) > 0;
 const hasFeatures = (draftData?.planFeaturesExtended?.length || 0) > 0;
 const showElemTab = hasElements || hasFeatures;

 const activeElement = selectedElementIndex !== null ? draftData?.elements?.[selectedElementIndex] : null;
 const activeFeature = selectedFeatureIndex !== null ? draftData?.planFeaturesExtended?.[selectedFeatureIndex] : null;

 const tabs = TABS_DEF.filter(t => t.id !=='elementos' || showElemTab);

 return (
 <div className="fixed inset-0 z-50 flex bg-[#0a0a0a] text-white font-sans overflow-hidden">

 {/* ── MODAL PUBLICAR ── */}
 {showPublishModal && (
 <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8">
 <div className="bg-neutral-900 rounded-2xl border border-neutral-700 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
 <div className="flex items-center justify-between p-6 border-b border-neutral-700">
 <div>
 <h3 className="text-xl font-black text-white">📡 Vista Previa antes de Publicar</h3>
 <p className="text-sm text-gray-400 mt-1">Confirma que todo se ve bien.</p>
 </div>
 <button onClick={() => setShowPublishModal(false)} className="text-xl text-neutral-500 hover:text-white">✕</button>
 </div>
 <div className="flex-1 overflow-hidden p-4">
 <iframe src="https://godzillaconsulting.ai" title="Preview" className="w-full h-[52vh] rounded-xl border border-neutral-700" />
 </div>
 <div className="flex justify-end gap-3 p-5 border-t border-neutral-700">
 <button onClick={() => setShowPublishModal(false)} className="px-5 py-2.5 bg-neutral-700 hover:bg-neutral-600 rounded-full font-bold text-sm transition">← Cancelar</button>
 <button onClick={handlePublish} className="px-7 py-2.5 bg-[#CC0000] hover:bg-red-600 text-white rounded-full font-black text-sm transition shadow-[0_4px_20px_rgba(204,0,0,0.5)]">🚀 Confirmar y Publicar</button>
 </div>
 </div>
 </div>
 )}

 {/* ██ COL 1: SECCIONES ████████████████████████████████████████████████ */}
 <div className="w-[200px] min-w-[200px] flex flex-col border-r border-neutral-800 bg-[#0d0d0d]">
 <div className="px-4 pt-5 pb-3 border-b border-neutral-800">
 <p className="text-base font-black text-[#CC0000] leading-none">Godzilla</p>
 <p className="text-[10px] text-neutral-500 mt-0.5">Admin Studio</p>
 </div>

 <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
 {sortedNodes.map((node, idx) => {
 const meta = PAGE_SECTIONS.find(s => s.id === node.id);
 const isSelected = selectedNodeId === node.id;
 return (
 <button key={node.id} onClick={() => handleSelectSection(node)}
 className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 ${
 isSelected ?'bg-[#CC0000] shadow-[0_4px_14px_rgba(204,0,0,0.3)]' :'hover:bg-neutral-800'
 }`}
 >
 <span className="text-base leading-none shrink-0">{meta?.emoji ||'📄'}</span>
 <div className="min-w-0 flex-1">
 <span className={`block text-xs font-bold truncate ${isSelected ?'text-white' :'text-gray-200'}`}>
 {meta?.label || node.id}
 </span>
 <span className={`text-[9px] font-medium ${isSelected ?'text-red-200' :'text-neutral-500'}`}>
 §{idx + 1} · {meta?.tag || node.id.toUpperCase()}
 </span>
 </div>
 </button>
 );
 })}
 </div>

 <div className="p-3 border-t border-neutral-800 space-y-1">
 <button onClick={() => { setActiveSection(s => s ==='newsletter' ?'editor' :'newsletter'); setSelectedNodeId(null); }}
 className={`w-full text-[10px] py-2 rounded-lg transition-colors font-bold ${
 activeSection ==='newsletter' ?'bg-[#CC0000]/20 text-[#CC0000]' :'text-neutral-500 hover:text-white hover:bg-neutral-900'
 }`}>
 📧 Newsletter
 </button>
 <button onClick={() => { localStorage.clear(); window.location.href ='/login'; }}
 className="w-full text-[10px] text-neutral-600 hover:text-red-400 py-2 rounded-lg hover:bg-neutral-900 transition-colors">
 🚪 Cerrar sesión
 </button>
 </div>
 </div>

 {/* ██ ÁREA PRINCIPAL ███████████████████████████████████████████████████ */}
 <div className="flex-1 flex flex-col overflow-hidden">

 {/* Newsletter Panel */}
 {activeSection ==='newsletter' ? (
 <NewsletterPanel />
 ) : (<>

 {/* Barra superior */}
 <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-800 bg-[#0d0d0d] shrink-0">
 {selectedNodeId ? (
 <div className="flex items-center gap-3">
 <span className="text-lg">{PAGE_SECTIONS.find(s => s.id === selectedNodeId)?.emoji ||'📄'}</span>
 <div>
 <h2 className="text-sm font-black text-white leading-none">
 {PAGE_SECTIONS.find(s => s.id === selectedNodeId)?.label || selectedNodeId}
 </h2>
 <p className="text-[10px] text-neutral-500">Editando · borrador no publicado</p>
 </div>
 </div>
 ) : (
 <h2 className="text-sm font-black text-neutral-400">← Elige una sección</h2>
 )}

 <div className="flex items-center gap-2">
 <button onClick={() => setShowPreview(p => !p)}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
 showPreview ?'bg-[#CC0000]/15 text-[#CC0000] border border-[#CC0000]/30' :'bg-neutral-800 text-neutral-400 hover:text-white'
 }`}>
 {showPreview ?'◧ Ocultar' :'▣ Preview'}
 </button>
 <button onClick={handleSave} disabled={saving || !selectedNodeId}
 className="px-4 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-xs font-bold rounded-full transition disabled:opacity-40">
 {saving ?'...' :'💾 Guardar'}
 </button>
 <button onClick={() => setShowPublishModal(true)} disabled={!selectedNodeId}
 className="px-4 py-1.5 bg-[#CC0000] hover:bg-red-600 text-white text-xs font-black rounded-full transition shadow-[0_4px_12px_rgba(204,0,0,0.4)] disabled:opacity-40">
 🚀 Publicar
 </button>
 </div>
 </div>

 {/* Cuerpo */}
 <div className="flex-1 flex overflow-hidden">

 {/* ─ PANEL EDITOR ─ */}
 <div className="flex flex-col overflow-hidden border-r border-neutral-800 transition-all duration-300"
 style={{ width: showPreview ?'45%' :'100%' }}>

 {selectedNodeId && draftData ? (
 <>
 {/* Tabs */}
 <div className="flex gap-1 px-4 py-2 border-b border-neutral-800 bg-[#0d0d0d] shrink-0 overflow-x-auto">
 {tabs.map(tab => (
 <button key={tab.id}
 onClick={() => { setActiveTab(tab.id); setSelectedElementIndex(null); setSelectedFeatureIndex(null); }}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
 activeTab === tab.id ?'bg-[#CC0000] text-white' :'bg-neutral-800 text-neutral-400 hover:text-white'
 }`}>
 {tab.label}
 </button>
 ))}
 </div>

 {/* Tab content */}
 <div className="flex-1 overflow-y-auto p-4 space-y-4">

 {/* ══ TAB TEXTOS ══ */}
 {activeTab ==='textos' && (
 <div className="space-y-4">
 <p className="text-xs font-bold text-neutral-500 tracking-widest">Textos detectados</p>

 {/* Campos planos de texto */}
 {textFields.map(([key, val]) => (
 <EditorField key={key} fieldKey={key} onHover={setHoveredField}>
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-gray-400 flex items-center gap-1">
 <span className="text-[10px] font-mono bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-400">{key}</span>
 {toLabel(key)}
 </label>
 <textarea rows={val.length > 80 ? 3 : 2} value={val}
 onChange={e => change(key, e.target.value)}
 className="w-full p-3 bg-black border border-neutral-700 rounded-xl text-white text-sm focus:border-[#CC0000] outline-none resize-none transition-colors" />
 </div>
 </EditorField>
 ))}

 {/* Campos agrupados (service1Title, service2Desc...) */}
 {hasGrouped && Object.entries(groupedFields).map(([prefix, nums]) => (
 <div key={prefix} className="space-y-3 pt-3 border-t border-neutral-800">
 <p className="text-xs font-bold text-yellow-400 tracking-widest">
 📋 Grupo: {toLabel(prefix)} ({Object.keys(nums).length} items)
 </p>
 {Object.entries(nums).sort(([a],[b]) => +a - +b).map(([num, fields]) => (
 <div key={num} className="bg-neutral-900 rounded-xl p-3 space-y-2 border border-neutral-800">
 <p className="text-[10px] text-neutral-500 font-bold">#{num}</p>
 {Object.entries(fields).filter(([k]) => k !=='_keys').map(([field, val]) => {
 const originalKey = fields._keys[field];
 return (
 <EditorField key={originalKey} fieldKey={originalKey} onHover={setHoveredField}>
 <div className="space-y-1">
 <label className="text-xs font-semibold text-gray-400">{toLabel(field)}</label>
 <textarea rows={typeof val ==='string' && val.length > 60 ? 3 : 1}
 value={val ||''} onChange={e => change(originalKey, e.target.value)}
 className="w-full p-2 bg-black border border-neutral-700 rounded-lg text-white text-xs focus:border-[#CC0000] outline-none resize-none" />
 </div>
 </EditorField>
 );
 })}
 </div>
 ))}
 </div>
 ))}

 {textFields.length === 0 && !hasGrouped && (
 <p className="text-neutral-600 text-sm text-center py-8">Sin campos de texto para esta sección.</p>
 )}
 </div>
 )}

 {/* ══ TAB MEDIA ══ */}
 {activeTab ==='media' && (
 <div className="space-y-4">
 <p className="text-xs font-bold text-neutral-500 tracking-widest">
 Media detectada ({mediaFields.length} slots)
 </p>

 {mediaFields.map(([key, val]) => (
 <EditorField key={key} fieldKey={key} onHover={setHoveredField}>
 <MediaPicker
 label={`${key.toLowerCase().includes('video') ?'🎬' : key.toLowerCase().includes('logo') ?'🏷️' :'🖼️'} ${toLabel(key)}`}
 value={val ||''}
 onChange={url => change(key, url)}
 accept={key.toLowerCase().includes('video') ?'video' :'all'}
 />
 </EditorField>
 ))}

 {selectedNodeId === 'hero' && (
      <button 
          onClick={() => {
              let max = 0;
              Object.keys(draftData).forEach(k => {
                  if(k.startsWith('logoUrl')) {
                      const num = parseInt(k.replace('logoUrl', '')) || 0;
                      if (num > max) max = num;
                  }
              });
              change(`logoUrl${max + 1}`, '');
          }}
          className="mt-4 px-4 py-3 bg-[#CC0000]/10 text-[#CC0000] border border-[#CC0000]/30 text-xs font-bold rounded-xl hover:bg-[#CC0000] hover:text-white transition-all w-full flex items-center justify-center gap-2"
      >
          ➕ Añadir nuevo logo
      </button>
  )}

  {selectedNodeId === 'portafolio' && (
      <button 
          onClick={() => {
              let max = 0;
              Object.keys(draftData).forEach(k => {
                  if(k.startsWith('caso') && k.endsWith('LogoUrl')) {
                      const num = parseInt(k.replace('caso', '').replace('LogoUrl', '')) || 0;
                      if (num > max) max = num;
                  }
              });
              const next = max + 1;
              setDraftData(p => ({
                  ...p,
                  [`caso${next}LogoUrl`]: '',
                  [`caso${next}Nombre`]: `Caso ${next}`,
                  [`caso${next}Category`]: 'Nueva Categoría'
              }));
          }}
          className="mt-4 px-4 py-3 bg-[#CC0000]/10 text-[#CC0000] border border-[#CC0000]/30 text-xs font-bold rounded-xl hover:bg-[#CC0000] hover:text-white transition-all w-full flex items-center justify-center gap-2"
      >
          ➕ Añadir nuevo caso
      </button>
  )}

  {selectedNodeId === 'recursos' && (
      <button 
          onClick={() => {
              let max = 0;
              Object.keys(draftData).forEach(k => {
                  if(k.startsWith('recurso') && k.endsWith('ImageUrl')) {
                      const num = parseInt(k.replace('recurso', '').replace('ImageUrl', '')) || 0;
                      if (num > max) max = num;
                  }
              });
              const next = max + 1;
              setDraftData(p => ({
                  ...p,
                  [`recurso${next}ImageUrl`]: '',
                  [`recurso${next}Nombre`]: `Recurso ${next}`,
                  [`recurso${next}Desc`]: 'Descripción del nuevo recurso'
              }));
          }}
          className="mt-4 px-4 py-3 bg-[#CC0000]/10 text-[#CC0000] border border-[#CC0000]/30 text-xs font-bold rounded-xl hover:bg-[#CC0000] hover:text-white transition-all w-full flex items-center justify-center gap-2"
      >
          ➕ Añadir nuevo recurso
      </button>
  )}

 {/* Slots de media en elementos */}
 {hasElements && draftData.elements.some(el =>
 Object.keys(el).some(k => MEDIA_PATTERNS.test(k))
 ) && (
 <div className="space-y-3 pt-3 border-t border-neutral-800">
 <p className="text-xs font-bold text-yellow-400 tracking-widest">🖼️ Media por elemento</p>
 {draftData.elements.map((el, idx) => {
 const elMediaKeys = Object.keys(el).filter(k => MEDIA_PATTERNS.test(k));
 if (!elMediaKeys.length) return null;
 return (
 <div key={idx} className="bg-neutral-900 rounded-xl p-3 space-y-2 border border-neutral-800">
 <p className="text-xs font-bold text-white">{el.title || `Elemento ${idx + 1}`}</p>
 {elMediaKeys.map(k => (
 <EditorField key={k} fieldKey={`elements_${idx}_${k}`} onHover={setHoveredField}>
 <MediaPicker
 label={toLabel(k)}
 value={el[k] ||''}
 onChange={url => {
 setDraftData(prev => {
 const els = [...(prev.elements || [])];
 els[idx] = { ...els[idx], [k]: url };
 return { ...prev, elements: els };
 });
 }}
 accept={k.toLowerCase().includes('video') ?'video' :'all'}
 />
 </EditorField>
 ))}
 </div>
 );
 })}
 </div>
 )}

 {mediaFields.length === 0 && (
 <div className="text-center py-8 space-y-2">
 <p className="text-neutral-600 text-sm">No hay campos de media en los datos publicados.</p>
 <p className="text-neutral-700 text-xs">Añade campos como imageUrl, videoUrl, logoUrl en la BD para habilitarlos aquí.</p>
 </div>
 )}
 </div>
 )}

 {/* ══ TAB COLORES ══ */}
 {activeTab ==='colores' && (
 <div className="space-y-5">
 <p className="text-xs font-bold text-neutral-500 tracking-widest">Paleta de Colores</p>
 {[
 ['accentColor','Color de Acento','#CC0000'],
 ['bgColor','Color de Fondo','#111111'],
 ['textColor','Color de Texto Principal','#FFFFFF'],
 ['subtextColor','Color de Texto Secundario','#9CA3AF'],
 ['ctaColor','Color del Botón CTA','#CC0000'],
 ['borderColor','Color de Bordes','#333333'],
 ].map(([field, label, fallback]) => (
 <ColorField key={field}
 label={label}
 fieldKey={field}
 draftData={{ [field]: fallback, ...draftData }}
 onChange={change}
 />
 ))}
 </div>
 )}

 {/* ══ TAB TIPOGRAFÍA ══ */}
 {activeTab ==='tipografia' && (
 <div className="space-y-5">
 <p className="text-xs font-bold text-neutral-500 tracking-widest">Tipografías</p>

 {/* Font family */}
 <EditorField fieldKey="fontFamily" onHover={setHoveredField}>
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-gray-400">Familia de fuente</label>
 <select value={draftData.fontFamily ||'Inter'} onChange={e => change('fontFamily', e.target.value)}
 className="w-full p-2.5 bg-black border border-neutral-700 rounded-lg text-white text-sm focus:border-[#CC0000] outline-none">
 {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
 </select>
 <p className="text-[10px] text-neutral-600">Requiere importar la fuente en index.html</p>
 </div>
 </EditorField>

 {/* Título */}
 <div className="space-y-3 pt-3 border-t border-neutral-800">
 <p className="text-xs font-bold text-yellow-400 tracking-widest">Títulos (H1 / H2)</p>
 <div className="grid grid-cols-2 gap-3">
 <EditorField fieldKey="titleFontSize" onHover={setHoveredField}>
 <div className="space-y-1">
 <label className="text-xs font-semibold text-gray-400">Tamaño (px)</label>
 <input type="number" min={12} max={120} value={draftData.titleFontSize || 64}
 onChange={e => change('titleFontSize', +e.target.value)}
 className="w-full p-2.5 bg-black border border-neutral-700 rounded-lg text-white text-sm focus:border-[#CC0000] outline-none" />
 </div>
 </EditorField>
 <EditorField fieldKey="titleFontWeight" onHover={setHoveredField}>
 <div className="space-y-1">
 <label className="text-xs font-semibold text-gray-400">Peso</label>
 <select value={draftData.titleFontWeight ||'900'} onChange={e => change('titleFontWeight', e.target.value)}
 className="w-full p-2.5 bg-black border border-neutral-700 rounded-lg text-white text-sm focus:border-[#CC0000] outline-none">
 {['300','400','500','600','700','800','900'].map(w => <option key={w}>{w}</option>)}
 </select>
 </div>
 </EditorField>
 </div>
 <EditorField fieldKey="titleLetterSpacing" onHover={setHoveredField}>
 <div className="space-y-1">
 <label className="text-xs font-semibold text-gray-400">Letter Spacing</label>
 <input type="text" placeholder="-0.05em" value={draftData.titleLetterSpacing ||''}
 onChange={e => change('titleLetterSpacing', e.target.value)}
 className="w-full p-2.5 bg-black border border-neutral-700 rounded-lg text-white text-sm focus:border-[#CC0000] outline-none" />
 </div>
 </EditorField>
 </div>

 {/* Cuerpo */}
 <div className="space-y-3 pt-3 border-t border-neutral-800">
 <p className="text-xs font-bold text-yellow-400 tracking-widest">Texto Cuerpo</p>
 <div className="grid grid-cols-2 gap-3">
 <EditorField fieldKey="bodyFontSize" onHover={setHoveredField}>
 <div className="space-y-1">
 <label className="text-xs font-semibold text-gray-400">Tamaño (px)</label>
 <input type="number" min={10} max={32} value={draftData.bodyFontSize || 16}
 onChange={e => change('bodyFontSize', +e.target.value)}
 className="w-full p-2.5 bg-black border border-neutral-700 rounded-lg text-white text-sm focus:border-[#CC0000] outline-none" />
 </div>
 </EditorField>
 <EditorField fieldKey="bodyLineHeight" onHover={setHoveredField}>
 <div className="space-y-1">
 <label className="text-xs font-semibold text-gray-400">Line Height</label>
 <input type="text" placeholder="1.6" value={draftData.bodyLineHeight ||''}
 onChange={e => change('bodyLineHeight', e.target.value)}
 className="w-full p-2.5 bg-black border border-neutral-700 rounded-lg text-white text-sm focus:border-[#CC0000] outline-none" />
 </div>
 </EditorField>
 </div>
 </div>

 {/* Preview tipografía */}
 <div className="pt-3 border-t border-neutral-800">
 <p className="text-xs font-bold text-neutral-500 tracking-widest mb-3">Preview</p>
 <div className="bg-neutral-900 rounded-xl p-4 border border-neutral-800"
 style={{ fontFamily: draftData.fontFamily ||'Inter' }}>
 <p style={{ fontSize: `${Math.min(draftData.titleFontSize || 32, 36)}px`, fontWeight: draftData.titleFontWeight || 900, letterSpacing: draftData.titleLetterSpacing ||'-0.02em', color: draftData.textColor ||'#fff' }}>
 Título de Ejemplo
 </p>
 <p style={{ fontSize: `${draftData.bodyFontSize || 14}px`, lineHeight: draftData.bodyLineHeight || 1.6, color: draftData.subtextColor ||'#9ca3af', marginTop: 8 }}>
 Este es el texto cuerpo con la fuente seleccionada. Así se vería el párrafo principal de la sección.
 </p>
 </div>
 </div>
 </div>
 )}

 {/* ══ TAB ELEMENTOS ══ */}
 {activeTab ==='elementos' && (
 <div className="flex gap-3 h-full min-h-0">

 {/* Lista */}
 <div className="w-40 shrink-0 space-y-1 overflow-y-auto">
 {hasElements && <>
 <p className="text-[10px] text-neutral-500 font-bold mb-2">Tarjetas / Items</p>
 {draftData.elements.map((el, idx) => (
 <button key={idx} onClick={() => { setSelectedElementIndex(idx); setSelectedFeatureIndex(null); }}
 className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition border ${
 selectedElementIndex === idx ?'bg-neutral-700 border-[#CC0000] text-white' :'bg-neutral-800 border-transparent text-neutral-400 hover:text-white'
 }`}>
 <span className="block font-bold truncate">{el.title || `Item ${idx+1}`}</span>
 {el.price && <span className="text-[10px] text-green-400">{el.price}</span>}
 </button>
 ))}
 </>}
 {hasFeatures && <>
 <p className="text-[10px] text-neutral-500 font-bold mb-2 mt-3">Características</p>
 {draftData.planFeaturesExtended.map((f, idx) => (
 <button key={idx} onClick={() => { setSelectedFeatureIndex(idx); setSelectedElementIndex(null); }}
 className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition border ${
 selectedFeatureIndex === idx ?'bg-neutral-700 border-[#CC0000] text-white' :'bg-neutral-800 border-transparent text-neutral-400 hover:text-white'
 }`}>
 <span className="block font-bold truncate">{f.title || `Feature ${idx+1}`}</span>
 </button>
 ))}
 </>}
 </div>

 {/* Editor de elemento/feature */}
 <div className="flex-1 space-y-3 overflow-y-auto">
 {activeElement && (
 <>
 <p className="text-xs font-bold text-[#CC0000]">Editando elemento</p>
 {Object.entries(activeElement).map(([k, v]) => {
 if (typeof v ==='object' || k.startsWith('_')) return null;
 if (MEDIA_PATTERNS.test(k)) return (
 <EditorField key={k} fieldKey={`el_${k}`} onHover={setHoveredField}>
 <MediaPicker label={toLabel(k)} value={v ||''} onChange={url => changeEl(k, url)} accept="all" />
 </EditorField>
 );
 return (
 <EditorField key={k} fieldKey={`el_${k}`} onHover={setHoveredField}>
 <div className="space-y-1">
 <label className="text-xs font-semibold text-gray-400">{toLabel(k)}</label>
 <textarea rows={typeof v ==='string' && v.length > 60 ? 3 : 1}
 value={v ||''} onChange={e => changeEl(k, e.target.value)}
 className="w-full p-2.5 bg-black border border-neutral-700 rounded-xl text-white text-sm focus:border-[#CC0000] outline-none resize-none" />
 </div>
 </EditorField>
 );
 })}
 </>
 )}

 {activeFeature && (
 <>
 <p className="text-xs font-bold text-[#CC0000]">Editando característica</p>
 {Object.entries(activeFeature).map(([k, v]) => {
 if (typeof v !=='string') return null;
 return (
 <EditorField key={k} fieldKey={`ft_${k}`} onHover={setHoveredField}>
 <div className="space-y-1">
 <label className="text-xs font-semibold text-gray-400">{toLabel(k)}</label>
 <textarea rows={v.length > 60 ? 4 : 2} value={v ||''} onChange={e => changeFt(k, e.target.value)}
 className="w-full p-2.5 bg-black border border-neutral-700 rounded-xl text-white text-sm focus:border-[#CC0000] outline-none resize-none" />
 </div>
 </EditorField>
 );
 })}
 </>
 )}

 {!activeElement && !activeFeature && (
 <p className="text-neutral-600 text-sm text-center py-12">← Selecciona un elemento</p>
 )}
 </div>
 </div>
 )}

 </div>
 </>
 ) : (
 <div className="flex-1 flex flex-col items-center justify-center gap-4 text-neutral-700">
 <span className="text-6xl">🦖</span>
 <p className="text-base font-bold">Selecciona una sección</p>
 </div>
 )}
 </div>

 {/* ─ PANEL PREVIEW ─ */}
 {showPreview && (
 <div className="flex-1 overflow-hidden border-l border-neutral-800">
 <StudioPreview nodeId={selectedNodeId} draftData={draftData} hoveredField={hoveredField} />
 </div>
 )}

 </div>
 </>)}
 </div>

 </div>
 );
}


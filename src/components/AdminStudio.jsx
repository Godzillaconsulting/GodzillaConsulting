import React, { useState, useEffect, useMemo } from'react';
import { useSiteData } from'../context/SiteContext';
import StudioPreview from'./StudioPreview';
import MediaPicker from'./MediaPicker';
import NewsletterPanel from './NewsletterPanel';
import AnalyticsDashboard from './AnalyticsDashboard';
import CorreosInbox from './CorreosInbox';
import AdminProfile from './AdminProfile';
import CockersStudio from './CockersStudio';
import CMCalendar from './CMCalendar';
import GoyiAdmin from './GoyiAdmin';
import BugReporterModal from './BugReporterModal';
import DBStudioPanel from './DBStudioPanel';
import BugTrackerUI from './BugTrackerUI';
// ── Hover field wrapper → activa resaltado en preview ──────────────────────
import { PAGE_SECTIONS, injectSectionDefaults } from '../utils/studioConfig';
import { useNavigate, useLocation } from 'react-router-dom';

function EditorField({ fieldKey, onHover, children }) {
 return (
 <div
 onMouseEnter={() => onHover(fieldKey)}
 onMouseLeave={() => onHover(null)}
 className="relative group/field"
 title="📝 Edita este valor aquí. Los cambios se verán al instante en la vista previa a tu izquierda."
 >
 <div className="absolute -left-2 top-0 bottom-0 w-0.5 bg-[#CC0000]/0 group-hover/field:bg-[#CC0000]/70 rounded-full transition-all duration-150" />
 {children}
 </div>
 );
}

// PAGE_SECTIONS moved to studioConfig.js

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
 ).sort(([a], [b]) => {
     const numA = parseInt(a.match(/\d+/) ? a.match(/\d+/)[0] : '0', 10);
     const numB = parseInt(b.match(/\d+/) ? b.match(/\d+/)[0] : '0', 10);
     if (numA !== numB) return numA - numB;
     return a.localeCompare(b);
 });
}

function detectMediaFields(data) {
 return Object.entries(data || {}).filter(([key, val]) =>
 typeof val ==='string' &&
 MEDIA_PATTERNS.test(key) &&
 !SKIP_MEDIA.has(key)
 ).sort(([a], [b]) => {
     const numA = parseInt(a.match(/\d+/) ? a.match(/\d+/)[0] : '0', 10);
     const numB = parseInt(b.match(/\d+/) ? b.match(/\d+/)[0] : '0', 10);
     if (numA !== numB) return numA - numB;
     return a.localeCompare(b);
 });
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
 className="flex-1 p-2 bg-black/40 backdrop-blur-md border border-[#CC0000]/20 shadow-inner rounded-lg text-white text-xs font-mono focus:border-[#CC0000] outline-none" />
 <div className="w-8 h-8 rounded-md border border-neutral-600 shrink-0" style={{ background: val }} />
 </div>
 </div>
 </EditorField>
 );
}

// ── Tabs ────────────────────────────────────────────────────────────────────
const TABS_DEF = [
 { id:'textos', label: (
    <span className="flex items-center justify-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        Textos
    </span>
 ) },
 { id:'media', label: (
    <span className="flex items-center justify-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
        Media
    </span>
 ) },
 { id:'colores', label: (
    <span className="flex items-center justify-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path></svg>
        Colores
    </span>
 ) },
 { id:'tipografia', label: (
    <span className="flex items-center justify-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
        Tipografía
    </span>
 )},
 { id:'elementos', label: (
    <span className="flex items-center justify-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
        Elementos
    </span>
 ) },
];

const GOOGLE_FONTS = ['Inter','Roboto','Outfit','Poppins','Montserrat','Lato','Playfair Display','Raleway','Nunito','DM Sans'];

// ── Componente principal ────────────────────────────────────────────────────
export default function AdminStudio() {
 const navigate = useNavigate();
 const { nodes, fetchNodes, setPreviewOverride } = useSiteData();
 const [selectedNodeId, setSelectedNodeId] = useState(null);
 const [activeSection, setActiveSection] = useState(window.location.pathname.includes('/cm') ? 'social' : window.location.pathname.includes('/studio') ? 'social_studio' : 'editor'); //'editor' |'newsletter' | 'profile'
 const [activeTab, setActiveTab] = useState('textos');
 const [adminProfile, setAdminProfile] = useState(() => {
        try { return JSON.parse(localStorage.getItem('godzilla_cached_profile')) || null; } catch { return null; }
 });
 const [draftData, setDraftData] = useState(null);
 const [selectedElementIndex, setSelectedElementIndex] = useState(null);
 const [selectedFeatureIndex, setSelectedFeatureIndex] = useState(null);
 const [saving, setSaving] = useState(false);
 const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
 const [savedDraftKeys, setSavedDraftKeys] = useState(null);
 const [activePresences, setActivePresences] = useState({});


 const [showPublishModal, setShowPublishModal] = useState(false);
 const [showPreview, setShowPreview] = useState(true);
 const [hoveredField, setHoveredField] = useState(null);
 const [isAnalyticsMode, setIsAnalyticsMode] = useState(false);
 const [isLandingMenuOpen, setIsLandingMenuOpen] = useState(false);
 const [isOpsMenuOpen, setIsOpsMenuOpen] = useState(false);
 const [bugReporterPos, setBugReporterPos] = useState(null);
 const [isSidebarOpen, setIsSidebarOpen] = useState(true);
 const [collapsedGroups, setCollapsedGroups] = useState({ 0: true, 1: true, 2: true, 3: true });
 
 const [showFeedbackModal, setShowFeedbackModal] = useState(false);
 const [feedbackText, setFeedbackText] = useState('');
 const [isUploadingFeedbackMedia, setIsUploadingFeedbackMedia] = useState(false);

 const handleUploadFeedbackImage = async (e) => {
     const file = e.target.files[0];
     if (!file) return;
     
     setIsUploadingFeedbackMedia(true);
     try {
         const formData = new FormData();
         formData.append('file', file);
         
         const token = localStorage.getItem('adminToken');
         const API = import.meta.env.DEV ? 'http://localhost:3000' : '';
         const res = await fetch(`${API}/api/media/upload`, {
             method: 'POST',
             headers: { 'Authorization': `Bearer ${token}` },
             body: formData
         });
         const data = await res.json();
         
         if (data.success) {
             const addedUrl = data.url;
             const newText = feedbackText ? `${feedbackText}\n\nCaptura adjunta:\n${addedUrl}` : addedUrl;
             setFeedbackText(newText);
         } else {
             alert('Error subiendo imagen: ' + (data.error || 'Server error'));
         }
     } catch (err) {
         console.error('Upload Error:', err);
         alert('Falló la subida (Conexión)');
     }
     setIsUploadingFeedbackMedia(false);
 };

 // Auth check delegado a PrivateRoute (ver App.jsx)

 // Bloquear zoom accidental (Ctrl + Mouse Scroll / Trackpad Pinch)
 useEffect(() => {
     const handleWheel = (e) => {
         if (e.ctrlKey || e.metaKey) {
             e.preventDefault();
         }
     };
     window.addEventListener('wheel', handleWheel, { passive: false });
     return () => window.removeEventListener('wheel', handleWheel);
 }, []);

 // Configurar perfil admin global
 useEffect(() => {
     const token = localStorage.getItem('adminToken');
     if (token) {
         fetch(`${'' || ''}/api/users/profile`, {
             headers: { 'Authorization': `Bearer ${token}` }
         })
         .then(r => r.json())
         .then(data => { 
             if(data.success) {
                 setAdminProfile(data.profile);
                 localStorage.setItem('godzilla_cached_profile', JSON.stringify(data.profile));
             }
         })
         .catch(err => console.error('Error al cargar perfil', err));
     }
 }, []);

 // ── Presence SSE Listener ────────────────────────────────────────────────
 useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    const API = import.meta.env.DEV ? 'http://localhost:3000' : '';
    const evtSource = new EventSource(`${API}/api/nodes/stream/presence?token=${token}`);
    
    evtSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'PRESENCE_SYNC') {
                setActivePresences(data.activePresences || {});
            }
        } catch(e){}
    };
    return () => evtSource.close();
 }, []);

 // ── Presence Broadcaster (Claim/Release) ─────────────────────────────────
 useEffect(() => {
    if (!selectedNodeId || !adminProfile) return;
    const token = localStorage.getItem('adminToken');
    const API = import.meta.env.DEV ? 'http://localhost:3000' : '';
    const user = adminProfile.username || 'admin';

    // Usar Beacon para release seguro al desmontar/cambiar tab sin esperar Fetch
    const releaseUrl = `${API}/api/nodes/presence`;
    const releasePayload = JSON.stringify({ nodeId: selectedNodeId, action: 'release', user });

    // Claim
    fetch(releaseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ nodeId: selectedNodeId, action: 'claim', user })
    }).catch(()=>{});

    const hb = setInterval(() => {
        fetch(releaseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ nodeId: selectedNodeId, action: 'heartbeat', user })
        }).catch(()=>{});
    }, 20000);

    return () => {
        clearInterval(hb);
        // Release (Intento con navigator.sendBeacon para cuando cierran pestaña, fallback a fetch)
        if (navigator.sendBeacon) {
            const blob = new Blob([releasePayload], { type: 'application/json' });
            navigator.sendBeacon(releaseUrl, blob);
        } else {
            fetch(releaseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: releasePayload,
                keepalive: true
            }).catch(()=>{});
        }
    };
 }, [selectedNodeId, adminProfile]);


 // ── Permisos por Rol ─────────────────────────────────────────────────────
 // isCM        → role='cm' (Judith): solo calendario/studio
 // isEditor    → role='admin' (Cockers/Alex/dani/JareG/Oscar): edita todo
 // isSuperAdmin→ is_superadmin=true (Oscar/JareG): además borra usuarios
 const isCM        = adminProfile?.role === 'cm' && adminProfile?.username?.toLowerCase() !== 'oscar';
 const isEditor    = adminProfile?.role === 'admin' || adminProfile?.is_superadmin === true;
 const isSuperAdmin= adminProfile?.is_superadmin === true;
 const canEditSite = isEditor;

 // Sync draftData → preview
 useEffect(() => {
 if (selectedNodeId && draftData) setPreviewOverride(selectedNodeId, draftData);
 else setPreviewOverride(null, null);
 return () => setPreviewOverride(null, null);
 }, [draftData, selectedNodeId]);

 const selectedNode = nodes.find(n => n.id === selectedNodeId);

 const handleSelectSection = (node) => {
 setIsAnalyticsMode(false);
 setSelectedNodeId(node.id);
 setActiveTab('textos');
 setSelectedElementIndex(null);
 setSelectedFeatureIndex(null);
 setActiveSection('editor');
 
  let combinedData = { ...(node.published_data || {}), ...(node.draft_data || {}) };
  combinedData = injectSectionDefaults(node.id, combinedData);

 setDraftData(combinedData);
 };

 const change = (key, val) => {
   setDraftData(p => ({ ...p, [key]: val }));
   setHasUnsavedChanges(true);
  };

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
 const base = '' || (import.meta.env.DEV ? 'http://localhost:3000' : '');
 const token = localStorage.getItem('adminToken');
 const res = await fetch(`${base}/api/nodes/${selectedNodeId}/draft`, {
 method:'PUT', headers: {'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
 body: JSON.stringify({ draft_data: draftData })
 });
 if (!res.ok) {
     if (res.status === 401 || res.status === 403) throw new Error('Sesión expirada o token inválido. Por favor, recarga y vuelve a iniciar sesión.');
     throw new Error('El servidor rechazó los cambios.');
 }
 await fetchNodes();
 setHasUnsavedChanges(false);
 alert('✅ Borrador guardado. Ahora presiona 🚀 Actualizar cambios para verlo en el sitio.');
 } catch (err) { 
    alert(`❌ Error al guardar: ${err.message}`); 
 } finally { setSaving(false); }
 };

 const handlePublish = async () => {
 const base = '' || (import.meta.env.DEV ? 'http://localhost:3000' : '');
 const token = localStorage.getItem('adminToken');
 const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
 try {
 const resDraft = await fetch(`${base}/api/nodes/${selectedNodeId}/draft`, { method: 'PUT', headers, body: JSON.stringify({ draft_data: draftData }) });
 if (!resDraft.ok) {
     if (resDraft.status === 401 || resDraft.status === 403) throw new Error('Sesión expirada o token inválido. Por favor, recarga y vuelve a iniciar sesión.');
     throw new Error('Error guardando el borrador');
 }
 const resPub = await fetch(`${base}/api/nodes/${selectedNodeId}/publish`, { method:'POST', headers });
 if (!resPub.ok) {
     if (resPub.status === 401 || resPub.status === 403) throw new Error('Sesión expirada o token inválido. Por favor, recarga y vuelve a iniciar sesión.');
     throw new Error('Error aplicando la publicación final');
 }
 await fetchNodes();
 setShowPublishModal(false);
 alert('🚀 Publicado');
 } catch (err) { alert(`❌ Error al publicar: ${err.message}`); }
 };

  // Oculta nodos legacy y muestra obligatoriamente TODAS las secciones oficiales, existan o no aún en BD
  const sortedNodes = useMemo(() => {
      return PAGE_SECTIONS.map(section => {
          return nodes.find(n => n.id === section.id) || { id: section.id, isNew: true };
      });
  }, [nodes]);

 // Derived data detections
 const textFields = useMemo(() => detectTextFields(draftData), [draftData]);
 const mediaFields = useMemo(() => {
     let fields = detectMediaFields(draftData);
     return fields;
 }, [draftData, selectedNodeId]);
 const groupedFields = useMemo(() => detectGroupedFields(draftData), [draftData]);
 const hasGrouped = Object.keys(groupedFields).length > 0;
 const hasElements = (draftData?.elements?.length || 0) > 0;
 const hasFeatures = (draftData?.planFeaturesExtended?.length || 0) > 0;
 const showElemTab = hasElements || hasFeatures;

 // Validación: No permitir guardar/publicar si existen Recursos pero falta configurar sus correos
 const isRecursosValid = useMemo(() => {
     if (selectedNodeId !== 'recursos') return true;
     let max = 0;
     Object.keys(draftData || {}).forEach(k => {
         if (k.startsWith('recurso') && k.endsWith('Nombre')) {
             const num = parseInt(k.replace('recurso', '').replace('Nombre', '')) || 0;
             if (num > max) max = num;
         }
     });
     for (let i = 1; i <= max; i++) {
         if (draftData[`recurso${i}Nombre`]) {
             if (!draftData[`recurso${i}EmailSubject`] || !draftData[`recurso${i}EmailBody`] || !draftData[`recurso${i}FileUrl`]) {
                 return false;
             }
         }
     }
     return true;
 }, [draftData, selectedNodeId]);

 const activeElement = selectedElementIndex !== null ? draftData?.elements?.[selectedElementIndex] : null;
 const activeFeature = selectedFeatureIndex !== null ? draftData?.planFeaturesExtended?.[selectedFeatureIndex] : null;

 const tabs = [
  ...TABS_DEF, 
  ...(selectedNodeId === 'recursos' ? [{ id: 'correos', label: <span className="flex items-center justify-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> Correos</span> }] : [])
 ].filter(t => t.id !=='elementos' || showElemTab);

 return (
 <div 
   className="fixed inset-0 z-50 flex bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(204,0,0,0.15),rgba(255,255,255,0))] text-white font-sans overflow-hidden relative"
   onContextMenu={(e) => {
     if (e.target.tagName !== 'IMG') {
       e.preventDefault();
       setBugReporterPos({ x: e.clientX, y: e.clientY });
     }
   }}
 >
   {/* Modal Reporter Contextual IT */}
   {bugReporterPos && (
     <BugReporterModal 
       x={bugReporterPos.x} 
       y={bugReporterPos.y} 
       onClose={() => setBugReporterPos(null)} 
     />
   )}

   {/* Frutiger Aero Orbs/Gloss */}
   <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#CC0000]/10 rounded-full blur-[120px] pointer-events-none"></div>
   <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-black/50 rounded-full blur-[100px] pointer-events-none"></div>


 {/* ── MODAL PUBLICAR ── */}
 {showPublishModal && (
 <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-6">
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
 <button onClick={() => setShowPublishModal(false)} className="px-5 py-2.5 bg-neutral-700 hover:bg-neutral-600 rounded-full font-bold text-sm transition">Cancelar</button>
 <button onClick={handlePublish} className="px-7 py-2.5 bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] rounded-full font-black text-sm transition-colors duration-300 shadow-[0_4px_20px_rgba(204,0,0,0.5)]">Confirmar y Publicar</button>
 </div>
 </div>
 </div>
 )}

 {/* ██ COL 1: SECCIONES ████████████████████████████████████████████████ */}
 <div className={`relative z-10 transition-all duration-300 flex flex-col border-r border-red-900/30 bg-[#CC0000]/5 backdrop-blur-xl shadow-[4px_0_24px_rgba(0,0,0,0.05)] ${isSidebarOpen ? 'w-[200px] min-w-[200px]' : 'w-0 min-w-0 overflow-hidden opacity-0 pointer-events-none'}`}>
  <div className="px-3 pt-5 pb-3 border-b border-[#CC0000]/40 flex items-center justify-between">
  <div className="flex items-center gap-2.5">
  <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center cursor-pointer hover:scale-110 transition-transform">
    <img src="/favicon.png" alt="Godzilla Logo" className="w-8 h-8 drop-shadow-[0_2px_8px_rgba(204,0,0,0.6)]" />
  </a>
  </div>
  <button onClick={() => setIsAnalyticsMode(true)} className={`px-2 py-1.5 flex items-center gap-1.5 rounded-lg font-bold text-[10px] transition-all duration-300 border ${
  isAnalyticsMode ? 'bg-[#CC0000] border-[#CC0000] text-white shadow-[0_0_12px_rgba(204,0,0,0.5)]' : 'bg-black/40 text-neutral-300 border-red-900/30 hover:bg-[#CC0000]/10 hover:border-[#CC0000]/50 hover:text-white shadow-sm'
  }`}>
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"></line>
      <line x1="12" y1="20" x2="12" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="14"></line>
    </svg>
    Analytics
  </button>
  </div>

  <div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar">
     <div className="py-4 px-2 space-y-6 shrink-0">
   {[
     {
       title: "Sitio Principal",
       filter: (n, tag) => ['INICIO', 'SERVICIOS', 'CULTURA', 'PORTAFOLIO', 'RECURSOS', 'PAQUETES', 'PIE'].includes(tag)
     },
     {
       title: "Paquetes",
       filter: (n, tag) => n.id.startsWith('paquete-')
     },
     {
       title: "Servicios",
       filter: (n, tag) => tag === 'SERVICIO' || n.id.startsWith('servicio-')
     },
     {
       title: "Recursos",
       filter: (n, tag) => n.id.startsWith('landing-recurso')
     }
   ].map((group, gIdx) => {
     const groupNodes = sortedNodes.filter(n => {
        const meta = PAGE_SECTIONS.find(s => s.id === n.id);
        return group.filter(n, meta?.tag);
     });
     
     if (groupNodes.length === 0) return null;

     return (
       <div key={gIdx} className="space-y-1 mb-4">
         <p onClick={() => setCollapsedGroups(p => ({ ...p, [gIdx]: !p[gIdx] }))}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest mb-2 drop-shadow-sm flex items-center justify-between cursor-pointer border transition-all group ${
              !collapsedGroups[gIdx] ? 'bg-white text-[#CC0000] border-white/20 shadow-md' : 'border-transparent text-white/80 hover:bg-white hover:text-[#CC0000] hover:border-white/20'
            }`}>
             <span>{group.title}</span>
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" 
                  className={`transition-transform duration-300 ${!collapsedGroups[gIdx] ? 'text-[#CC0000] -rotate-180' : 'text-white/40 group-hover:text-[#CC0000] rotate-0'}`}>
               <polyline points="6 9 12 15 18 9"></polyline>
             </svg>
         </p>
         
         {!collapsedGroups[gIdx] && (
           <div className="space-y-0.5 relative animate-in fade-in slide-in-from-top-2 duration-300">
             {groupNodes.map((node) => {
                const meta = PAGE_SECTIONS.find(s => s.id === node.id);
                const isSelected = selectedNodeId === node.id;
                const globalIdx = PAGE_SECTIONS.findIndex(s => s.id === node.id) + 1;
                return (
                <button key={node.id} onClick={() => handleSelectSection(node)}
                className={`group/btn w-full text-left px-3 py-2 rounded-xl transition-all duration-300 flex items-center gap-2.5 border ${
                isSelected ? 'bg-gradient-to-r from-[#CC0000]/20 to-transparent border-[#CC0000]/30 shadow-[inset_2px_0_15px_rgba(204,0,0,0.15)]' : 'border-transparent hover:bg-[#CC0000]/10 hover:border-[#CC0000]/20 hover:translate-x-1'
                }`}
                >
                <div className="min-w-0 flex-1">
                <span className={`block text-xs font-black truncate drop-shadow-sm transition-colors duration-300 ${isSelected ? 'text-[#ff4444]' : 'text-white/70 group-hover/btn:text-white'}`}>
                {meta?.label || node.id}
                </span>
                <span className={`text-[9px] font-black transition-colors duration-300 ${isSelected ? 'text-[#CC0000]/80' : 'text-white/30 group-hover/btn:text-white/50'}`}>
                §{globalIdx} · {meta?.tag || node.id.toUpperCase()}
                </span>
                </div>
                </button>
                );
             })}
           </div>
         )}
       </div>
     );
   })}
  </div>

   <div className="mt-8 px-2 pb-16 space-y-1 shrink-0 border-t border-[#CC0000]/20 pt-4">
   <button onClick={() => { setIsAnalyticsMode(false); setActiveSection(s => s ==='newsletter' ?'editor' :'newsletter'); setSelectedNodeId(null); }}
  className={`w-full text-[10px] py-2 rounded-xl transition-all font-black shadow-sm border border-transparent ${ activeSection ==='newsletter' ?'bg-[#CC0000] text-white border-sky-400 shadow-[0_4px_15px_rgba(14,165,233,0.4)]' :'text-neutral-300 hover:text-white hover:bg-black/50 hover:border-red-900/30' }`}>
  📧 Newsletter
  </button>
  
   <button onClick={() => { setIsAnalyticsMode(false); setActiveSection('social_studio'); setSelectedNodeId(null); navigate('/studio'); }}
   className={`w-full text-[10px] py-3 shadow-md rounded-xl transition-all font-black uppercase tracking-widest flex items-center justify-center border ${ activeSection ==='social_studio' ?'bg-gradient-to-r from-[#CC0000] to-[#880000] text-white border-red-900/30 shadow-[0_8px_20px_rgba(52,211,153,0.5)]' :'text-neutral-300 border-transparent hover:border-red-900/30 hover:bg-black/40 hover:text-white' }`}>
   <span className="text-sm mr-2 drop-shadow-sm">🤖</span> Estudio IA
   </button>
   <button onClick={() => { setIsAnalyticsMode(false); setActiveSection('social'); setSelectedNodeId(null); navigate('/cm'); }}
   className={`w-full text-[10px] py-2 shadow-sm rounded-xl transition-all font-black uppercase flex items-center justify-center border ${ activeSection ==='social' ?'bg-white/70 text-[#CC0000] border-[#CC0000]/50' :'text-neutral-300 border-transparent hover:border-[#CC0000]/40 hover:bg-black/50 hover:text-white' }`}>
   <span className="text-xs mr-2">📅</span> Calendario Global
   </button>
   
   {(adminProfile?.is_superadmin || ['jareg', 'oscar'].includes(adminProfile?.username?.toLowerCase())) && (
       <button onClick={() => { setIsAnalyticsMode(false); setActiveSection('db_studio'); setSelectedNodeId(null); }}
       className={`w-full text-[10px] py-2 shadow-sm rounded-xl transition-all font-black uppercase flex items-center justify-center border ${ activeSection ==='db_studio' ?'bg-neutral-900 text-[#00ff88] border-[#00ff88]/50 shadow-[0_0_15px_rgba(0,255,136,0.2)]' :'text-neutral-300 border-transparent hover:border-[#00ff88]/40 hover:bg-[#00ff88]/5 hover:text-white' }`}>
       <span className="text-xs mr-2 drop-shadow-sm">🗄️</span> DB Studio
       </button>
   )}
   
   <button onClick={() => { setIsAnalyticsMode(false); setActiveSection('profile'); setSelectedNodeId(null); }}
   className={`w-full p-2 flex items-center gap-3 transition-colors rounded-xl shadow-sm border border-transparent ${ activeSection ==='profile' ?'bg-white/70 border-[#CC0000]/50 shadow-[0_4px_15px_rgba(255,255,255,0.8)]' :'hover:bg-black/40 hover:border-[#CC0000]/20' }`}>
       <div className="w-6 h-6 rounded-full bg-black/60 overflow-hidden shrink-0 border border-[#CC0000]/50">
           {adminProfile?.photo_url ? <img src={adminProfile.photo_url} className="w-full h-full object-cover"/> : <span className="text-xs flex items-center justify-center w-full h-full drop-shadow">🦖</span>}
       </div>
       <div className="flex-1 text-left min-w-0">
           <p className={`text-xs font-black truncate drop-shadow-sm transition-colors ${ activeSection ==='profile' ?'text-[#CC0000]' :'text-white' }`}>{adminProfile?.username || 'Usuario'}</p>
           <p className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider transition-colors ${ activeSection ==='profile' ?'text-black/60' :'text-neutral-500' }`}>
               <span className="w-1.5 h-1.5 rounded-full bg-[#CC0000] border border-[#CC0000] shadow-[0_0_5px_rgba(204,0,0,0.8)] animate-pulse"></span> Activo
           </p>
       </div>
   </button>
   
  <button onClick={() => { localStorage.clear(); window.location.href ='/login'; }}
 className="w-full flex items-center justify-center gap-1.5 text-[10px] text-red-500 font-bold hover:text-white hover:bg-[#CC0000]/10 border border-red-900/40 hover:border-[#CC0000]/60 py-2 rounded-xl transition-all shadow-sm">
 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
 </svg>
 Cerrar sesión
 </button>
  <button onClick={() => {
      const isIT = ['jareg', 'godzilla_admin', 'dani', 'oscar'].includes(adminProfile?.username?.toLowerCase());
      if (isIT) {
          setIsAnalyticsMode(false);
          setActiveSection('bugs');
          setSelectedNodeId(null);
      } else {
          setShowFeedbackModal(true);
      }
  }}
  className={`w-full text-[10px] py-2 rounded-xl transition-all shadow-sm font-bold border ${activeSection === 'bugs' ? 'bg-yellow-500 text-black border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'text-yellow-500 hover:text-white hover:bg-yellow-500/10 border-transparent hover:border-yellow-900/50'}`}>
  {activeSection === 'bugs' ? '💡 Monitoreo IT' : '💡 Sugerencias / Bugs'}
  </button>
  </div>
  </div>
  </div>
  <div className="flex-1 flex flex-col overflow-hidden relative z-10 bg-black/30 backdrop-blur-md shadow-inner border-l border-red-900/30">
  <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="absolute top-16 left-0 z-50 w-4 h-12 bg-[#CC0000] text-white flex items-center justify-center rounded-r-md shadow-lg hover:bg-red-600 border border-t-[#CC0000] border-b-[#CC0000] border-r-[#CC0000] border-l-transparent transition-all">
      <span className="text-[10px] font-bold">{isSidebarOpen ? '❮' : '❯'}</span>
  </button>
 {isAnalyticsMode ? (
 <AnalyticsDashboard />
 ) : activeSection ==='profile' ? (
 <AdminProfile profile={adminProfile} onProfileUpdate={setAdminProfile} />
 ) : activeSection ==='newsletter' ? (
  <NewsletterPanel />
  ) : activeSection ==='social' ? (
      <CMCalendar adminProfile={adminProfile} />
) : activeSection === 'social_studio' ? (
      <CockersStudio adminProfile={adminProfile} />
  ) : activeSection === 'db_studio' ? (
      <DBStudioPanel />
  ) : activeSection === 'bugs' ? (
      <BugTrackerUI />
  ) : (<>

 {/* Barra superior del editor */}
 <div className="flex items-center justify-between px-6 py-4 border-b border-red-900/30 bg-black/40 backdrop-blur-xl shrink-0 shadow-sm relative">

 {selectedNodeId ? (
 <div className="flex items-center gap-3">
 <span className="text-2xl drop-shadow-sm">{PAGE_SECTIONS.find(s => s.id === selectedNodeId)?.emoji ||'📄'}</span>
 <div>
 <h2 className="text-lg font-black text-white leading-none drop-shadow-sm flex items-center gap-2">
 {PAGE_SECTIONS.find(s => s.id === selectedNodeId)?.label || selectedNodeId}
 {activePresences[selectedNodeId] && activePresences[selectedNodeId].user !== adminProfile?.username && (
    <span className="text-[9px] bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-[0_0_10px_rgba(234,179,8,0.2)] whitespace-nowrap">
      🔒 Bloqueado por {activePresences[selectedNodeId].user}
    </span>
 )}
 </h2>
 <p className="text-[10px] font-bold text-[#CC0000]/60 uppercase">Vista de Editor Glassy</p>
 </div>
 </div>
 ) : (
  <div className="flex flex-col justify-center">
  <p className="text-sm font-black text-white/90 leading-none drop-shadow-sm tracking-wider uppercase">Admin</p>
  <p className="text-xs text-[#CC0000] font-bold mt-1 tracking-widest uppercase">Studio</p>
  </div>
 )}

 <div className="flex items-center gap-3">
 <button onClick={() => setShowPreview(p => !p)}
 className={`px-4 py-2 rounded-xl text-xs font-black transition-all duration-300 active:scale-95 hover:scale-105 hover:-translate-y-0.5 shadow-sm border border-transparent ${
 showPreview ?'bg-white/90 text-[#CC0000] border-[#CC0000]/50 shadow-md' :'bg-black/40 text-[#CC0000] hover:bg-white hover:border-[#CC0000]/50'
 }`}>
 {showPreview ?'◧ Ocultar' :'▣ Visualizar'}
 </button>
 
 { /* ── Botón Guardar (Bloqueable por Presence) ── */ }
 <button onClick={handleSave} 
 disabled={saving || !selectedNodeId || !isRecursosValid || isCM || (activePresences[selectedNodeId] && activePresences[selectedNodeId].user !== adminProfile?.username)}
 className={`group px-5 py-2 text-xs font-black rounded-xl transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 shadow-md active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0 border relative ${
     hasUnsavedChanges 
         ? 'bg-[#CC0000]/20 text-[#CC0000] border-[#CC0000] hover:bg-[#CC0000] hover:text-white shadow-[0_0_15px_rgba(204,0,0,0.4)] hover:shadow-[0_0_20px_rgba(204,0,0,0.6)]' 
         : 'bg-white hover:bg-gray-100 text-[#CC0000] border-[#CC0000]/50'
 }`}>
 {hasUnsavedChanges && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#CC0000] opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-[#CC0000]"></span></span>}
 {saving ? '...' : (
    <span className="flex items-center justify-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
        Guardar borrador
    </span>
 )}
 </button>
 <button onClick={() => setShowPublishModal(true)} disabled={!selectedNodeId || !isRecursosValid || isCM}
 className="group px-6 py-2 flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#CC0000] to-[#880000] hover:from-white hover:to-gray-200 text-white hover:text-[#CC0000] text-xs font-black rounded-xl transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 shadow-[0_4px_15px_rgba(204,0,0,0.4)] hover:shadow-[0_8px_25px_rgba(255,255,255,0.7)] border border-red-900/30 hover:border-[#CC0000] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
    Actualizar cambios
 </button>
 </div>
 </div>

 {/* Cuerpo */}
 <div className="flex-1 flex overflow-hidden p-4 gap-4">

 {/* ─ PANEL EDITOR ─ */}
 <div className="flex flex-col overflow-hidden bg-black/40 backdrop-blur-xl border border-red-900/30 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-300"
 style={{ width: (showPreview && activeTab !== 'correos') ?'45%' :'100%' }}>

 {selectedNodeId && draftData ? (
 <>
 {/* Tabs */}
 <div className="flex gap-2 px-6 py-3 border-b border-[#CC0000]/40 bg-[#CC0000]/5 shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#CC0000]/50 hover:[&::-webkit-scrollbar-thumb]:bg-[#CC0000]/80 [&::-webkit-scrollbar-track]:bg-transparent">
 {tabs.map(tab => (
 <button key={tab.id}
 onClick={() => { setActiveTab(tab.id); setSelectedElementIndex(null); setSelectedFeatureIndex(null); }}
 className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap border border-transparent shadow-sm transition-all ${
  activeTab === tab.id ?'bg-white/90 text-[#CC0000] border-[#CC0000]/50 shadow-md' :'bg-black/40 text-neutral-400 hover:text-white hover:bg-[#CC0000]/20 hover:border-[#CC0000]/40'
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

  {/* Campos de texto — con secciones para landings */}
 {(() => {
 const isLanding = selectedNodeId?.startsWith('paquete-');
 if (!isLanding) {
 // Non-landing nodes: auto-detect as before
 return textFields.map(([key, val]) => (
 <EditorField key={key} fieldKey={key} onHover={setHoveredField}>
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-gray-400 flex items-center gap-1">
 <span className="text-[10px] font-mono bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-400">{key}</span>
 {toLabel(key)}
 </label>
 <textarea rows={val.length > 80 ? 3 : 2} value={val}
 onChange={e => change(key, e.target.value)}
 className="w-full p-3 bg-black/40 backdrop-blur-md border border-[#CC0000]/20 shadow-inner rounded-xl text-white font-bold text-sm focus:bg-[#CC0000]/10 focus:border-[#CC0000]/50 outline-none resize-none transition-colors" />
 </div>
 </EditorField>
 ));
 }
 // Landing page: organized sections
 const sections = [
 { title: '🎬 Sección Hero', fields: ['heroTitle','heroTopText','heroDisclaimer'] },
 { title: '📋 Tarjeta de Detalles', fields: ['cardTitle','planTarget','tableHeaderLeft','tableHeaderRight'] },
 { title: '💰 Precios y Totales', fields: ['planPrice','planPeriod','totalLabel','totalValue','normalLabel','normalPrice','offerLabel','offerPrice'] },
 { title: '🛡️ Garantía', fields: ['guaranteeTitle','guaranteeBadge','guaranteeText'] },
 ];
 const usedKeys = new Set(sections.flatMap(s => s.fields));
 const remaining = textFields.filter(([k]) => !usedKeys.has(k));
 
 const renderField = (key) => {
 const val = draftData[key];
 if (val === undefined || val === null) {
 // Field doesn't exist yet, create it with empty string
 return (
 <EditorField key={key} fieldKey={key} onHover={setHoveredField}>
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-gray-400 flex items-center gap-1">
 <span className="text-[10px] font-mono bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-400">{key}</span>
 {toLabel(key)}
 </label>
 <textarea rows={1} value={''}
 onChange={e => change(key, e.target.value)}
 placeholder={`Añadir ${toLabel(key).toLowerCase()}...`}
 className="w-full p-3 bg-black/40 backdrop-blur-md border border-[#CC0000]/20 shadow-inner rounded-xl text-white font-bold text-sm focus:bg-[#CC0000]/10 focus:border-[#CC0000]/50 outline-none resize-none transition-colors placeholder:text-neutral-600" />
 </div>
 </EditorField>
 );
 }
 if (typeof val !== 'string') return null;
 return (
 <EditorField key={key} fieldKey={key} onHover={setHoveredField}>
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-gray-400 flex items-center gap-1">
 <span className="text-[10px] font-mono bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-400">{key}</span>
 {toLabel(key)}
 </label>
 <textarea rows={val.length > 80 ? 3 : 2} value={val}
 onChange={e => change(key, e.target.value)}
 className="w-full p-3 bg-black/40 backdrop-blur-md border border-[#CC0000]/20 shadow-inner rounded-xl text-white font-bold text-sm focus:bg-[#CC0000]/10 focus:border-[#CC0000]/50 outline-none resize-none transition-colors" />
 </div>
 </EditorField>
 );
 };

 return (
 <>
 {sections.map(section => (
 <div key={section.title} className="space-y-3 pb-4 border-b border-neutral-800">
 <p className="text-xs font-bold text-yellow-400 tracking-widest pt-1">{section.title}</p>
 {section.fields.map(key => renderField(key))}
 </div>
 ))}
 {remaining.length > 0 && (
 <div className="space-y-3 pb-4">
 <p className="text-xs font-bold text-neutral-500 tracking-widest pt-1">📝 Otros campos</p>
 {remaining.map(([key, val]) => (
 <EditorField key={key} fieldKey={key} onHover={setHoveredField}>
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-gray-400 flex items-center gap-1">
 <span className="text-[10px] font-mono bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-400">{key}</span>
 {toLabel(key)}
 </label>
 <textarea rows={val.length > 80 ? 3 : 2} value={val}
 onChange={e => change(key, e.target.value)}
 className="w-full p-3 bg-black/40 backdrop-blur-md border border-[#CC0000]/20 shadow-inner rounded-xl text-white font-bold text-sm focus:bg-[#CC0000]/10 focus:border-[#CC0000]/50 outline-none resize-none transition-colors" />
 </div>
 </EditorField>
 ))}
 </div>
 )}
 </>
 );
 })()}

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
 className="w-full p-2 bg-black/40 backdrop-blur-md border border-[#CC0000]/20 shadow-inner rounded-lg text-white text-xs focus:border-[#CC0000] outline-none resize-none" />
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
  {selectedNodeId === 'cultura' && (
      <div className="space-y-4 mt-6 pt-4 border-t border-neutral-800">
          <p className="text-xs font-bold text-yellow-400 tracking-widest">Carrusel de Cultura</p>
          {(draftData.mediaGallery || []).map((mediaItem, idx) => (
              <div key={idx} className="bg-neutral-900 rounded-xl p-3 space-y-3 border border-neutral-800 relative">
                  <button onClick={() => {
                        if(window.confirm('¿Eliminar este medio?')) {
                            setDraftData(p => {
                                const arr = [...(p.mediaGallery || [])];
                                arr.splice(idx, 1);
                                return { ...p, mediaGallery: arr };
                            });
                        }
                  }} className="absolute top-3 right-3 text-xs text-red-500 font-bold hover:text-red-400">✕ Eliminar</button>
                  <p className="text-xs font-bold text-white mb-2">Medio {idx + 1}</p>
                  
                  <EditorField fieldKey={`mediaGallery_${idx}_url`} onHover={setHoveredField}>
                      <MediaPicker
                          label="Video o Imagen"
                          value={mediaItem.url || ''}
                          onChange={url => {
                              setDraftData(p => {
                                  const arr = [...(p.mediaGallery || [])];
                                  const isVideo = url && url.match(/\.(mp4|webm|mov)$/i);
                                  arr[idx] = { ...arr[idx], url, type: isVideo ? 'video' : 'image' };
                                  return { ...p, mediaGallery: arr };
                              });
                          }}
                          accept="all"
                      />
                  </EditorField>
                  
                  <div className="space-y-1 mt-2">
                        <label className="text-xs font-semibold text-gray-400">Tipo (Auto-detectado o forzado)</label>
                        <select 
                            value={mediaItem.type || 'image'}
                            onChange={e => {
                                setDraftData(p => {
                                      const arr = [...(p.mediaGallery || [])];
                                      arr[idx] = { ...arr[idx], type: e.target.value };
                                      return { ...p, mediaGallery: arr };
                                  });
                            }}
                            className="w-full p-2 bg-black/40 backdrop-blur-md border border-[#CC0000]/20 shadow-inner rounded-lg text-white text-xs focus:border-[#CC0000] outline-none"
                        >
                            <option value="image">Imagen</option>
                            <option value="video">Vídeo</option>
                        </select>
                  </div>
              </div>
          ))}
          <button 
              onClick={() => {
                  setDraftData(p => ({
                      ...p,
                      mediaGallery: [...(p.mediaGallery || []), { type: 'image', url: '' }]
                  }));
              }}
              className="mt-4 px-4 py-3 bg-[#CC0000]/10 text-[#CC0000] border border-[#CC0000]/30 text-xs font-bold rounded-xl hover:bg-[#CC0000] hover:text-white transition-all w-full flex items-center justify-center gap-2"
          >
              ➕ Añadir nuevo medio
          </button>
      </div>
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

 {/* ══ TAB CORREOS (RECURSOS) ══ */}
 {activeTab === 'correos' && selectedNodeId === 'recursos' && (
    <CorreosInbox draftData={draftData} change={change} />
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
 className="w-full p-2.5 bg-black/40 backdrop-blur-md border border-[#CC0000]/20 shadow-inner rounded-lg text-white font-bold text-sm focus:bg-[#CC0000]/10 focus:border-[#CC0000]/50 outline-none">
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
 className="w-full p-2.5 bg-black/40 backdrop-blur-md border border-[#CC0000]/20 shadow-inner rounded-lg text-white font-bold text-sm focus:bg-[#CC0000]/10 focus:border-[#CC0000]/50 outline-none" />
 </div>
 </EditorField>
 <EditorField fieldKey="titleFontWeight" onHover={setHoveredField}>
 <div className="space-y-1">
 <label className="text-xs font-semibold text-gray-400">Peso</label>
 <select value={draftData.titleFontWeight ||'900'} onChange={e => change('titleFontWeight', e.target.value)}
 className="w-full p-2.5 bg-black/40 backdrop-blur-md border border-[#CC0000]/20 shadow-inner rounded-lg text-white font-bold text-sm focus:bg-[#CC0000]/10 focus:border-[#CC0000]/50 outline-none">
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
 className="w-full p-2.5 bg-black/40 backdrop-blur-md border border-[#CC0000]/20 shadow-inner rounded-lg text-white font-bold text-sm focus:bg-[#CC0000]/10 focus:border-[#CC0000]/50 outline-none" />
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
 className="w-full p-2.5 bg-black/40 backdrop-blur-md border border-[#CC0000]/20 shadow-inner rounded-lg text-white font-bold text-sm focus:bg-[#CC0000]/10 focus:border-[#CC0000]/50 outline-none" />
 </div>
 </EditorField>
 <EditorField fieldKey="bodyLineHeight" onHover={setHoveredField}>
 <div className="space-y-1">
 <label className="text-xs font-semibold text-gray-400">Line Height</label>
 <input type="text" placeholder="1.6" value={draftData.bodyLineHeight ||''}
 onChange={e => change('bodyLineHeight', e.target.value)}
 className="w-full p-2.5 bg-black/40 backdrop-blur-md border border-[#CC0000]/20 shadow-inner rounded-lg text-white font-bold text-sm focus:bg-[#CC0000]/10 focus:border-[#CC0000]/50 outline-none" />
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
 {f.price && <span className="text-[10px] text-green-400">{f.price}</span>}
 </button>
 ))}
 <button onClick={() => {
     setDraftData(p => ({
         ...p,
         planFeaturesExtended: [...(p.planFeaturesExtended || []), { title: 'Nueva característica', desc: '', price: '' }]
     }));
     setSelectedFeatureIndex((draftData.planFeaturesExtended || []).length);
     setSelectedElementIndex(null);
 }}
 className="mt-2 w-full text-center px-2 py-2 border border-dashed border-neutral-700 text-neutral-500 rounded-lg text-xs font-semibold hover:text-[#CC0000] hover:border-[#CC0000] transition transition-all duration-300">
     + Añadir característica
 </button>
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
 className="w-full p-2.5 bg-black/40 backdrop-blur-md border border-[#CC0000]/20 shadow-inner rounded-xl text-white font-bold text-sm focus:bg-[#CC0000]/10 focus:border-[#CC0000]/50 outline-none resize-none" />
 </div>
 </EditorField>
 );
 })}
 </>
 )}

 {activeFeature && (
 <>
 <p className="text-xs font-bold text-[#CC0000]">Editando característica</p>
 {['title', 'desc', 'price'].map(k => {
 const v = activeFeature[k] || '';
 return (
 <EditorField key={k} fieldKey={`ft_${k}`} onHover={setHoveredField}>
 <div className="space-y-1">
 <label className="text-xs font-semibold text-gray-400">{toLabel(k)}</label>
 <textarea rows={v.length > 60 ? 4 : 2} value={v} onChange={e => changeFt(k, e.target.value)}
 className="w-full p-2.5 bg-black/40 backdrop-blur-md border border-[#CC0000]/20 shadow-inner rounded-xl text-white font-bold text-sm focus:bg-[#CC0000]/10 focus:border-[#CC0000]/50 outline-none resize-none" />
 </div>
 </EditorField>
 );
 })}
 <button onClick={() => {
     if (window.confirm('¿Seguro que quieres eliminar esta característica?')) {
         setDraftData(p => {
             const arr = [...(p.planFeaturesExtended || [])];
             arr.splice(selectedFeatureIndex, 1);
             return { ...p, planFeaturesExtended: arr };
         });
         setSelectedFeatureIndex(null);
     }
 }} className="w-full mt-4 px-4 py-3 bg-red-900/10 text-red-500 text-sm font-bold rounded-xl border border-red-900/30 hover:bg-red-900/30 hover:border-red-900/50 transition">
     Eliminar característica
 </button>
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
 <div className="flex-1 flex flex-col items-center pt-32 gap-4 text-neutral-700">
 <span className="text-6xl">🦖</span>
 <p className="text-base font-bold">Selecciona una sección</p>
 </div>
 )}
 </div>

 {/* ─ PANEL PREVIEW ─ */}
  {(showPreview && activeTab !== 'correos') && (
 <div className="flex-1 overflow-hidden border-l border-neutral-800">
 <StudioPreview nodeId={selectedNodeId} draftData={draftData} hoveredField={hoveredField} />
 </div>
 )}

 </div>
 </>)}
 </div>

 {/* Modal de Feedback Global */}
 {showFeedbackModal && (
 <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
   <div className="bg-[#111111] border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(204,0,0,0.2)] relative">
     <button onClick={() => setShowFeedbackModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white text-2xl font-black">×</button>
     <h3 className="text-xl font-black text-white tracking-widest uppercase mb-4 flex items-center gap-2">
       <span className="text-yellow-500">💡</span> Reportar a IT
     </h3>
     <p className="text-xs text-neutral-400 font-bold mb-4">Envía tus sugerencias, pide funciones o reporta bugs para <span className="text-[#CC0000]">Dani</span> y <span className="text-[#CC0000]">JareG</span>.</p>
     <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="Ej: Un botón para descargar imágenes está fallando..." rows="4" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors resize-none mb-3" />
     
     <label className={`block flex items-center justify-center p-3 mb-6 border border-dashed rounded-lg cursor-pointer transition-all ${isUploadingFeedbackMedia ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-white/20 hover:border-yellow-500 hover:bg-white/5'}`}>
         <span className="text-xs font-black text-neutral-300 uppercase tracking-widest flex items-center gap-2">
             <span className="text-lg">📸</span> {isUploadingFeedbackMedia ? 'Subiendo...' : 'Adjuntar Captura (SS)'}
         </span>
         <input type="file" accept="image/*,video/*" className="hidden" disabled={isUploadingFeedbackMedia} onChange={handleUploadFeedbackImage} />
     </label>
     <button onClick={() => {
         alert('🚀 Tu reporte fue enviado a la central de JareG y Dani. ¡Gracias!');
         setShowFeedbackModal(false);
         setFeedbackText('');
     }} className="w-full bg-gradient-to-r from-yellow-600 to-yellow-800 hover:from-white hover:to-white hover:text-black py-4 rounded-xl font-black uppercase tracking-widest transition-all text-white border border-yellow-900/50">
       Enviar Reporte ✔️
     </button>
   </div>
 </div>
 )}

 <GoyiAdmin />
</div>
);
}

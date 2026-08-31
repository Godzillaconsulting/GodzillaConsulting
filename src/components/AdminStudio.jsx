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
import AutomationFlow from './AutomationFlow';
import AIContentPlanner from './AIContentPlanner';
import IntegratedVideoEditor from './VideoEditorModal';
import BugReporterModal from './BugReporterModal';
import BugTrackerUI from './BugTrackerUI';

import AbordajeLeadsPanel from './AbordajeLeadsPanel';
import CeoEstudioPanel from './CeoEstudioPanel';
import SqlAtaquesPanel from './SqlAtaquesPanel';
import PanelMaestroPanel from './PanelMaestroPanel';
// ── Hover field wrapper → activa resaltado en preview ──────────────────────
import { PAGE_SECTIONS, injectSectionDefaults } from '../utils/studioConfig';
import { detectTextFields, detectMediaFields, toLabel, detectGroupedFields, MEDIA_PATTERNS } from '../utils/editorParser';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Bot, Video, Zap, Calendar, Mail, 
  BarChart2, Bug, LogOut, LayoutDashboard, 
  Crown, PenTool, Database, Lightbulb, Flame, MessageSquare, UserCircle, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';

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

const getSectionIcon = (id) => {
    if (!id) return 'description';
    if (id === 'hero') return 'layers';
    if (id === 'servicios') return 'bolt';
    if (id === 'cultura') return 'corporate_fare';
    if (id === 'portafolio') return 'workspace_premium';
    if (id === 'recursos') return 'auto_stories';
    if (id === 'paquetes') return 'inventory_2';
    if (id.includes('posicionamiento')) return 'campaign';
    if (id.includes('expansion')) return 'rocket_launch';
    if (id.includes('control-ia')) return 'smart_toy';
    if (id.includes('elite')) return 'crown';
    if (id.includes('bots')) return 'smart_toy';
    if (id.includes('audiovisual') || id.includes('video')) return 'movie';
    if (id.includes('embudo')) return 'filter_alt';
    if (id.includes('redes')) return 'share';
    if (id.includes('seo')) return 'search';
    if (id.includes('crm')) return 'database';
    if (id === 'socio-godzilla') return 'workspace_premium';
    if (id === 'footer') return 'pin';
    return 'description';
};

// ── Componente principal ────────────────────────────────────────────────────
export default function AdminStudio() {
 const navigate = useNavigate();
  const location = useLocation();
  const { nodes, fetchNodes, setPreviewOverride } = useSiteData();
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState({ 0: true, 1: true, 2: true, 3: true, 4: true, crm: true });
  
  const activeSection = useMemo(() => {
    if (location.pathname.includes('/admin/creativo/estudio') || location.pathname.includes('/laboratorio/estudio') || location.pathname.includes('/studio')) return 'social_studio';
    if (location.pathname.includes('/admin/creativo/planificador') || location.pathname.includes('/laboratorio/planificador') || location.pathname.includes('/ai-planner')) return 'ai-planner';
    if (location.pathname.includes('/admin/creativo/calendario') || location.pathname.includes('/laboratorio/calendario') || location.pathname.includes('/calendar')) return 'social';
    if (location.pathname.includes('/admin/operaciones/ceo-studio') || location.pathname.includes('/admin/it/ceo')) return 'ceo_studio';
    if (location.pathname.includes('/admin/operaciones/leads') || location.pathname.includes('/admin/it/leads')) return 'leads';
    if (location.pathname.includes('/admin/operaciones/newsletter') || location.pathname.includes('/newsletter')) return 'newsletter';
    if (location.pathname.includes('/admin/it/db')) return 'it_db';
    if (location.pathname.includes('/admin/it/flow') || location.pathname.includes('/laboratorio/flujo') || location.pathname.includes('/automation-flow')) return 'it_flow';
    if (location.pathname.includes('/admin/it/maestro')) return 'it_maestro';
    if (location.pathname.includes('/admin/it/waf') || location.pathname.includes('/admin/it/sql')) return 'it_waf';
    if (location.pathname.includes('/admin/it/bugs') || location.pathname.includes('/bugs')) return 'it_bugs';
    if (location.pathname.includes('/profile')) return 'profile';
    return 'editor';
  }, [location.pathname]);

  const [activeTab, setActiveTab] = useState('textos');
 const [adminProfile, setAdminProfile] = useState(() => {
        try { return JSON.parse(localStorage.getItem('godzilla_cached_profile')) || null; } catch { return null; }
 });
 const [draftData, setDraftData] = useState(null);
 const [selectedElementIndex, setSelectedElementIndex] = useState(null);
 const [selectedFeatureIndex, setSelectedFeatureIndex] = useState(null);
 const [saving, setSaving] = useState(false);
 const [isPublishing, setIsPublishing] = useState(false);
 const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
 const [savedDraftKeys, setSavedDraftKeys] = useState(null);
 const [activePresences, setActivePresences] = useState({});

 const [showPublishModal, setShowPublishModal] = useState(false);
 const [showTrendsModal, setShowTrendsModal] = useState(false);
 const [trendsData, setTrendsData] = useState(null);
 const [trendsSearchQuery, setTrendsSearchQuery] = useState('');
 const [trendsNetwork, setTrendsNetwork] = useState('General');
 const [manualVideoUrl, setManualVideoUrl] = useState('');
 const [analyzingVideoId, setAnalyzingVideoId] = useState(null);
 const [showPreview, setShowPreview] = useState(true);
 const [hoveredField, setHoveredField] = useState(null);
 const [isAnalyticsMode, setIsAnalyticsMode] = useState(false);
 const [isLandingMenuOpen, setIsLandingMenuOpen] = useState(false);
 const [isOpsMenuOpen, setIsOpsMenuOpen] = useState(false);
 const [bugReporterPos, setBugReporterPos] = useState(null);
 const [isSidebarOpen, setIsSidebarOpen] = useState(false);
 const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
 const [openAccordion, setOpenAccordion] = useState({ 'service_1': true, 'caso_1': true, 'sec_hero': true, 'sec_card': true, 'sec_prices': true, 'sec_guarantee': true });

 const toggleAccordion = (key) => setOpenAccordion(p => ({ ...p, [key]: !p[key] }));

 useEffect(() => {
     const handleResize = () => {
         setIsMobile(window.innerWidth < 768);
         if (window.innerWidth < 768) setIsSidebarOpen(false);
     };
     window.addEventListener('resize', handleResize);
     return () => window.removeEventListener('resize', handleResize);
 }, []);

 
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


 // ── Permisos por Rol Avanzados ──────────────────────────────────────────
 const username = adminProfile?.username?.toLowerCase() || '';
 const isSuperAdmin = adminProfile?.is_superadmin === true;
 
 // JareG, Godzilla_admin, Dani y Oscar ven absolutamente todo (incluyendo DB, Master, SQL)
 const isTechAdmin = isSuperAdmin || username === 'godzilla_admin' || username === 'jareg' || ['dani', 'oscar'].includes(username); 
 
 // Alex es un CEO de contenido, pero no ve las bases de datos técnicas
 const isCEO = isTechAdmin || ['alex'].includes(username);
 
 const isCM = adminProfile?.role === 'cm' && username !== 'oscar';
 
 const isEditor = adminProfile?.role === 'admin' || isCEO || ['judith'].includes(username);
 const canEditSite = isEditor;

 // Vista de Centro Técnico IT
 const canSeeITStudio = isTechAdmin || isEditor;

 // Sync draftData → preview
 useEffect(() => {
   const timeoutId = setTimeout(() => {
     if (selectedNodeId && draftData) setPreviewOverride(selectedNodeId, draftData);
     else setPreviewOverride(null, null);
   }, 150); // Debounce ligero para evitar lag masivo al escribir
   return () => clearTimeout(timeoutId);
 }, [draftData, selectedNodeId]);

 useEffect(() => {
   return () => setPreviewOverride(null, null);
 }, []);

 const selectedNode = nodes.find(n => n.id === selectedNodeId);

 const handleSelectSection = (node) => {
  setIsAnalyticsMode(false);
  setSelectedNodeId(node.id);
  setActiveTab('textos');
  setSelectedElementIndex(null);
  setSelectedFeatureIndex(null);
  navigate('/admin');
  if (isMobile) setIsSidebarOpen(false);
  
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
     const txt = await res.text().catch(()=>'');
     if (res.status === 401 || res.status === 403) throw new Error('Sesión expirada o token inválido. Por favor, recarga y vuelve a iniciar sesión.');
     throw new Error(`El servidor rechazó los cambios: HTTP ${res.status} ${txt}`);
 }
 await fetchNodes(3, true);
 setHasUnsavedChanges(false);
 alert('✅ Borrador guardado. Ahora presiona 🚀 Actualizar cambios para verlo en el sitio.');
 } catch (err) { 
    alert(`❌ Error al guardar: ${err.message}`); 
 } finally { setSaving(false); }
 };

 const handlePublish = async () => {
 setIsPublishing(true);
 const base = '' || (import.meta.env.DEV ? 'http://localhost:3000' : '');
 const token = localStorage.getItem('adminToken');
 const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
 try {
 const resDraft = await fetch(`${base}/api/nodes/${selectedNodeId}/draft`, { method: 'PUT', headers, body: JSON.stringify({ draft_data: draftData }) });
 if (!resDraft.ok) {
     const txt = await resDraft.text().catch(()=>'');
     if (resDraft.status === 401 || resDraft.status === 403) throw new Error('Sesión expirada o token inválido. Por favor, recarga y vuelve a iniciar sesión.');
     throw new Error(`Error guardando el borrador: HTTP ${resDraft.status} ${txt}`);
 }
 await new Promise(r => setTimeout(r, 600)); // Debounce TCP proxy pipeline delays
 
 let resPub;
 for (let i = 0; i < 3; i++) {
     resPub = await fetch(`${base}/api/nodes/${selectedNodeId}/publish`, { method:'POST', headers, body: JSON.stringify({}) }); // Agregado payload {} para WAFs
     if (resPub.ok || resPub.status !== 502) break; // Si funcionó, o si es un error controlable (401, 500), sal del retry. Solo reintenta caídas 502/504
     await new Promise(r => setTimeout(r, 1200));   // Esperar antes de reintentar
 }
 
 if (!resPub.ok) {
     const txt = await resPub.text().catch(()=>'');
     if (resPub.status === 401 || resPub.status === 403) throw new Error('Sesión expirada o token inválido. Por favor, recarga y vuelve a iniciar sesión.');
     throw new Error(`Error aplicando la publicación final tras reintentos: HTTP ${resPub.status} ${txt}`);
 }
 await fetchNodes(3, true);
 setShowPublishModal(false);
 alert('🚀 Publicado');
 } catch (err) { alert(`❌ Error al publicar: ${err.message}`); } finally { setIsPublishing(false); }
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

  const openTrendsModal = async () => {
    setShowTrendsModal(true);
    setTrendsData(null);
    try {
        const API = import.meta.env.DEV ? 'http://localhost:3000' : '';
        const token = localStorage.getItem('adminToken');
        const res = await fetch(`${API}/api/analytics/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.searchTrends) {
            let questionsObj = data.searchTrends.aggregated_questions || {};
            let allQuestions = [];
            Object.values(questionsObj).forEach(arr => {
                if(Array.isArray(arr)) {
                    allQuestions = allQuestions.concat(arr.slice(0, 5)); // Take top 5 from each category to avoid huge lists
                }
            });
            const topQuestions = allQuestions.slice(0, 15);

            const formatted = `## Búsquedas Recientes Globales\n\n### 🔑 Palabras Clave Virales\n` + 
                (data.searchTrends.keywords || []).slice(0, 15).map(k => `- ${k}`).join('\n') + 
                `\n\n### ❓ Preguntas de la Audiencia\n` + 
                topQuestions.map(q => `- ${q}`).join('\n') +
                `\n\n### 📝 Resumen del Bot\n` + (data.searchTrends.summary || 'Sin resumen.');
            setTrendsData(formatted);
        } else {
            setTrendsData('No se encontraron tendencias recientes. El bot podría estar recolectando datos aún.');
        }
    } catch (err) {
        setTrendsData('Error al contactar con Godzilla Trends Bot. Por favor verifica la conexión.');
    }
  };

  const handleDeepSearch = async (q = trendsSearchQuery, net = trendsNetwork) => {
    const queryToSearch = typeof q === 'string' ? q : trendsSearchQuery;
    const networkToSearch = typeof net === 'string' ? net : trendsNetwork;
    if (!queryToSearch.trim()) return;
    setShowTrendsModal(true);
    setTrendsData(null);
    try {
        const token = localStorage.getItem('adminToken');
        const API = import.meta.env.DEV ? 'http://localhost:3000' : '';
        const res = await fetch(`${API}/api/trends?network=${encodeURIComponent(networkToSearch)}&filter=${encodeURIComponent(queryToSearch)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data) {
            setTrendsData(data.data);
        } else {
            setTrendsData(data.message || 'No se lograron extraer tendencias analíticas para esta búsqueda.');
        }
    } catch (e) {
        setTrendsData('Error al contactar con el motor de IA Trends.');
    }
  };

  const handleAnalyzeVideo = async (url, title, id = 'manual') => {
      if (!url) return;
      setAnalyzingVideoId(id);
      try {
          const token = localStorage.getItem('adminToken');
          const API = import.meta.env.DEV ? 'http://localhost:3000' : '';
          const res = await fetch(`${API}/api/trends/analyze`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ url, title })
          });
          const data = await res.json();
          if (data.success) {
              // Guardar el guion en la sesión temporal para el Planificador
              sessionStorage.setItem('godzilla_radar_script', typeof data.script === 'string' ? data.script : JSON.stringify(data.script));
              window.dispatchEvent(new Event('godzilla_radar_updated'));
              setShowTrendsModal(false);
              setActiveTab('ai-planner');
              if (id === 'manual') setManualVideoUrl('');
          } else {
              alert('❌ Falló el análisis: ' + data.error);
          }
      } catch (err) {
          alert('❌ Error al conectar con el servidor.');
      } finally {
          setAnalyzingVideoId(null);
      }
  };

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

   {/* El botón flotante de búsquedas virales ha sido movido al sidebar de Operaciones */}


  {showPublishModal && (
  <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-6">
  <div className="bg-neutral-900 rounded-2xl border border-neutral-700 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
  <div className="flex items-center justify-between p-6 border-b border-neutral-700">
  <div>
  <h3 className="text-xl font-black text-white flex items-center gap-2">
      <span className="material-symbols-outlined text-white text-[24px]">visibility</span>
      Vista Previa antes de Publicar
  </h3>
  <p className="text-sm text-gray-400 mt-1">Confirma que todo se ve bien.</p>
  </div>
  <button onClick={() => setShowPublishModal(false)} className="text-xl text-neutral-500 hover:text-white">✕</button>
  </div>
  <div className="flex-1 overflow-hidden p-4">
  <iframe src="https://godzillaconsulting.ai" title="Preview" className="w-full h-[52vh] rounded-xl border border-neutral-700" />
  </div>
  <div className="flex justify-end gap-3 p-5 border-t border-neutral-700">
  <button onClick={() => setShowPublishModal(false)} disabled={isPublishing} className="px-5 py-2.5 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 rounded-full font-bold text-sm transition">Cancelar</button>
  <button onClick={handlePublish} disabled={isPublishing} className="px-7 py-2.5 bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] disabled:opacity-50 rounded-full font-black text-sm transition-colors duration-300 shadow-[0_4px_20px_rgba(204,0,0,0.5)]">{isPublishing ? 'Publicando...' : 'Confirmar y Publicar'}</button>
  </div>
  </div>
  </div>
  )}

  {/* ── MODAL TENDENCIAS B2B ── */}
  {showTrendsModal && (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] rounded-2xl border border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.15)] w-full max-w-3xl max-h-[80vh] flex flex-col relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-orange-500/10 blur-[50px] pointer-events-none rounded-t-full"></div>
        
        <div className="flex items-center justify-between p-6 border-b border-white/10 relative z-10">
          <div className="flex-1 mr-4">
            <h3 className="text-xl font-black text-white flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-orange-500 text-2xl drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">local_fire_department</span> 
              Búsquedas Virales Globales
            </h3>
            <div className="flex gap-2 mb-2">
                <input 
                    value={trendsSearchQuery}
                    onChange={e => setTrendsSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleDeepSearch()}
                    type="text" 
                    placeholder="Buscar tema (ej. automatización, marketing)..." 
                    className="flex-1 bg-black/50 border border-orange-500/30 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors placeholder:text-neutral-600"
                />
                <select 
                    value={trendsNetwork}
                    onChange={e => {
                        setTrendsNetwork(e.target.value);
                        if (trendsSearchQuery.trim()) {
                            handleDeepSearch(trendsSearchQuery, e.target.value);
                        }
                    }}
                    className="bg-black/50 border border-orange-500/30 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                >
                    <option value="General">Todas</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Instagram">Instagram</option>
                    <option value="YouTube">YouTube</option>
                </select>
                <button 
                    onClick={() => handleDeepSearch()}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-sm transition-colors shadow-[0_0_10px_rgba(249,115,22,0.4)]"
                >
                    Buscar Tema
                </button>
            </div>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">Resumen extraído por Godzilla Trends Bot</p>
          </div>
          <button onClick={() => setShowTrendsModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all self-start">✕</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 relative z-10 custom-scrollbar">
          {!trendsData ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(249,115,22,0.4)]"></div>
              <p className="text-sm font-bold text-orange-500 animate-pulse tracking-widest uppercase">Analizando Búsquedas Globales...</p>
            </div>
          ) : typeof trendsData === 'string' ? (
            <div 
              onClick={(e) => {
                  if (e.target.tagName === 'LI') {
                      const text = e.target.innerText.replace(/^- /, '').trim();
                      setTrendsSearchQuery(text);
                      handleDeepSearch(text);
                  }
              }}
              className="prose prose-invert prose-sm max-w-none 
              prose-h2:text-orange-400 prose-h2:font-black prose-h2:border-b prose-h2:border-orange-500/20 prose-h2:pb-2 prose-h2:mb-3 
              prose-h3:text-white prose-h3:font-bold prose-h3:mt-4 
              prose-p:text-gray-300 prose-p:leading-relaxed 
              prose-ul:text-gray-400 prose-li:marker:text-orange-500 prose-li:cursor-pointer hover:prose-li:text-orange-400 prose-li:transition-colors
              prose-strong:text-orange-300">
              <div dangerouslySetInnerHTML={{ __html: trendsData.replace(/\n/g, '<br/>').replace(/## (.*?)(<br\/>|$)/g, '<h2>$1</h2>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/- (.*?)(<br\/>|$)/g, '<li>$1</li>') }} />
            </div>
          ) : (
            <div className="space-y-6">
                <div className="mb-2">
                    <h2 className="text-orange-400 font-black text-lg border-b border-orange-500/20 pb-2">Análisis de IA: {trendsData.niche}</h2>
                </div>
                
                {trendsData.examples && trendsData.examples.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-bold text-base flex items-center gap-2"><span className="material-symbols-outlined text-orange-500">play_circle</span> Videos Virales Reales</h3>
                        </div>
                        <div className="flex gap-2 mb-4">
                            <input 
                                value={manualVideoUrl}
                                onChange={e => setManualVideoUrl(e.target.value)}
                                type="text" 
                                placeholder="Pega el URL de un video de TikTok/YouTube Shorts para analizar..." 
                                className="flex-1 bg-black/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors placeholder:text-neutral-600"
                            />
                            <button 
                                onClick={() => handleAnalyzeVideo(manualVideoUrl, 'Video Manual', 'manual')}
                                disabled={!manualVideoUrl || analyzingVideoId === 'manual'}
                                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-lg font-bold text-sm transition-colors shadow-[0_0_10px_rgba(168,85,247,0.4)] flex items-center gap-2"
                            >
                                {analyzingVideoId === 'manual' ? (
                                    <><span className="material-symbols-outlined animate-spin">refresh</span> Analizando...</>
                                ) : (
                                    <><span className="material-symbols-outlined">psychology</span> Analizar URL</>
                                )}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {Array.isArray(trendsData.examples) && trendsData.examples.map((ex, i) => (
                                <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col hover:border-orange-500/30 transition-colors">
                                    <div className="h-32 bg-neutral-950 relative border-b border-neutral-800">
                                        {ex.thumbnail && <img src={ex.thumbnail} alt={ex.title} onError={(e) => e.target.style.display='none'} className="w-full h-full object-cover opacity-60" />}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <a href={ex.url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-black/50 hover:bg-orange-500/80 rounded-full flex items-center justify-center backdrop-blur transition-colors cursor-pointer text-white">
                                                <span className="material-symbols-outlined">play_arrow</span>
                                            </a>
                                        </div>
                                    </div>
                                    <div className="p-3 flex-1 flex flex-col justify-between">
                                        <p className="text-xs text-white font-medium line-clamp-2 mb-2" title={ex.title}>{ex.title}</p>
                                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-neutral-800">
                                            <span className="text-[10px] text-gray-400">{ex.views ? `${ex.views} vistas` : 'Viral'}</span>
                                            <button 
                                                onClick={() => handleAnalyzeVideo(ex.url, ex.title, `vid-${i}`)}
                                                disabled={analyzingVideoId === `vid-${i}`}
                                                className="text-[10px] flex items-center gap-1 font-bold bg-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white px-2 py-1 rounded transition-colors disabled:opacity-50"
                                            >
                                                {analyzingVideoId === `vid-${i}` ? <span className="material-symbols-outlined text-[12px] animate-spin">refresh</span> : <span className="material-symbols-outlined text-[12px]">psychology</span>}
                                                Analizar y Planificar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div>
                    <h3 className="text-white font-bold mb-3 text-base flex items-center gap-2"><span className="material-symbols-outlined text-orange-500">trending_up</span> Ganchos Sugeridos</h3>
                    <div className="space-y-2">
                        {Array.isArray(trendsData.hooks) && trendsData.hooks.map((hook, i) => (
                            <div key={i} className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg flex items-start gap-3 hover:border-orange-500/30 transition-colors group">
                                <span className="text-orange-500 mt-0.5">•</span>
                                <p className="text-sm text-gray-300 flex-1">{hook}</p>
                                <button 
                                    onClick={() => {
                                        sessionStorage.setItem('godzilla_radar_niche', hook);
                                        window.dispatchEvent(new Event('godzilla_radar_updated'));
                                        setShowTrendsModal(false);
                                        setActiveTab('ai-planner');
                                        setIsAnalyticsMode(false);
                                        setSelectedNodeId(null);
                                        if (isMobile) setIsSidebarOpen(false);
                                        navigate('/admin/creativo/planificador');
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-[10px] font-bold bg-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white px-3 py-1.5 rounded transition-all whitespace-nowrap"
                                >
                                    Mandar al Planeador
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-white font-bold mb-2 text-base flex items-center gap-2"><span className="material-symbols-outlined text-orange-500">tag</span> Hashtags</h3>
                    <div className="flex flex-wrap gap-2">
                        {Array.isArray(trendsData.hashtags) && trendsData.hashtags.map((tag, i) => (
                            <span key={i} className="text-xs font-bold bg-black border border-orange-500/20 text-orange-300 px-2.5 py-1 rounded-full cursor-pointer hover:bg-orange-500/10 transition-colors">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-white/10 flex justify-between items-center bg-black/40 relative z-10">
          <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Motor Cascada Llama 3 + RAG</p>
          <button onClick={() => setShowTrendsModal(false)} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-xs transition-all">Cerrar Monitor</button>
        </div>
      </div>
    </div>
  )}

 {isSidebarOpen && isMobile && (
   <div 
     className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
     onClick={() => setIsSidebarOpen(false)}
   />
 )}

 {/* ██ COL 1: SECCIONES ████████████████████████████████████████████████ */}
 <div className={`absolute md:relative z-40 h-full transition-all duration-300 flex flex-col border-r border-white/5 bg-[#0a0a0a]/95 backdrop-blur-2xl shadow-[4px_0_24px_rgba(0,0,0,0.2)] ${isSidebarOpen ? 'w-[280px] md:w-[240px] min-w-[280px] md:min-w-[240px]' : 'w-0 min-w-0 overflow-hidden opacity-0 pointer-events-none'}`}>
  
  {/* Perfil del Usuario / Top Bar del Sidebar */}
  <div className="px-4 py-4 border-b border-white/5 flex flex-col gap-3 shrink-0">
    <div className="flex items-center gap-3">
        <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center cursor-pointer hover:scale-105 transition-transform">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#CC0000] to-[#880000] flex items-center justify-center shadow-[0_2px_8px_rgba(204,0,0,0.4)]">
                <img src="/favicon.png" alt="Godzilla Logo" className="w-5 h-5 drop-shadow-md" />
            </div>
        </a>
        <div className="flex-1">
            <h1 className="text-sm font-black tracking-tight text-white/90">Godzilla OS</h1>
            <p className="text-[10px] font-medium text-white/40 uppercase tracking-widest">Admin Workspace</p>
        </div>
        {/* Mobile close button */}
        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1.5 text-white/40 hover:text-white rounded-md hover:bg-white/10">✕</button>
    </div>
    
    <button onClick={() => { setIsAnalyticsMode(false); navigate('/admin/profile'); setSelectedNodeId(null); setIsSidebarOpen(false); }}
    className={`w-full p-2 flex items-center gap-3 transition-colors rounded-lg border border-transparent ${ activeSection ==='profile' ?'bg-white/10 border-white/10 shadow-sm' :'hover:bg-white/5' }`}>
        <div className="w-7 h-7 rounded-full bg-black overflow-hidden shrink-0 border border-white/10">
            {adminProfile?.photo_url ? <img src={adminProfile.photo_url} className="w-full h-full object-cover"/> : <span className="text-[10px] flex items-center justify-center w-full h-full text-white/50"><span className="w-4 h-4 material-symbols-outlined text-[16px] flex items-center justify-center">account_circle</span></span>}
        </div>
        <div className="flex-1 text-left min-w-0">
            <p className={`text-xs font-bold truncate transition-colors ${ activeSection ==='profile' ?'text-white' :'text-white/80' }`}>{adminProfile?.username || 'Usuario'}</p>
            <p className="text-[10px] font-medium text-white/40 truncate capitalize">{adminProfile?.role || 'Staff'}</p>
        </div>
    </button>
  </div>

  <div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar px-3 py-4 space-y-6">
    
    {/* GRUPO 1: SITIO WEB */}
    <div className="space-y-1">
        <p className="px-2 text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Sitio Web</p>
        {[
            { title: "Sitio Principal", filter: (n, tag) => ['INICIO', 'SERVICIOS', 'CULTURA', 'PORTAFOLIO', 'RECURSOS', 'PAQUETES', 'PIE'].includes(tag) },
            { title: "Paquetes", filter: (n, tag) => n.id.startsWith('paquete-') },
            { title: "Servicios", filter: (n, tag) => tag === 'SERVICIO' || n.id.startsWith('servicio-') },
            { title: "Recursos", filter: (n, tag) => n.id.startsWith('landing-recurso') },
            { title: "Landing Socios", filter: (n, tag) => n.id === 'socio-godzilla' }
        ].map((group, gIdx) => {
            const groupNodes = sortedNodes.filter(n => {
                const meta = PAGE_SECTIONS.find(s => s.id === n.id);
                return group.filter(n, meta?.tag);
            });
            if (groupNodes.length === 0) return null;
            return (
                <div key={gIdx} className="space-y-0.5 mb-3">
                    <p onClick={() => setCollapsedGroups(p => ({ ...p, [gIdx]: !p[gIdx] }))}
                        className="px-2 py-1 text-[11px] font-bold text-white/60 hover:text-white cursor-pointer flex items-center justify-between group transition-colors">
                        <span>{group.title}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" 
                            className={`transition-transform duration-200 ${!collapsedGroups[gIdx] ? 'text-white/40 rotate-180' : 'text-white/20 group-hover:text-white/40 rotate-0'}`}>
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </p>
                    
                    {!collapsedGroups[gIdx] && (
                        <div className="space-y-0.5 animate-in fade-in duration-200 ml-1 border-l border-white/10 pl-1">
                            {groupNodes.map((node) => {
                                const meta = PAGE_SECTIONS.find(s => s.id === node.id);
                                const isSelected = selectedNodeId === node.id;
                                return (
                                <button key={node.id} onClick={() => handleSelectSection(node)}
                                className={`w-full text-left px-2.5 py-1.5 rounded-md transition-all duration-200 flex items-center gap-2 relative ${
                                isSelected ? 'bg-[#CC0000]/10 text-[#CC0000]' : 'text-white/60 hover:bg-white/5 hover:text-white'
                                }`}>
                                {isSelected && <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-[#CC0000] rounded-r-full" />}
                                <span className={`text-[11px] font-medium truncate ${isSelected ? 'font-bold' : ''}`}>
                                {meta?.label || node.id}
                                </span>
                                </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        })}
    </div>

    {/* GRUPO 2: ESTUDIO CREATIVO & IA */}
    <div className="space-y-0.5">
        <p className="px-2 text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Estudio Creativo & IA</p>
        
        {/* Estudio IA - Oculto por solicitud
        <button onClick={() => { setIsAnalyticsMode(false); navigate('/admin/creativo/estudio'); setSelectedNodeId(null); setIsSidebarOpen(false); }}
        className={`w-full px-2.5 py-2 rounded-md transition-all duration-200 flex items-center gap-2.5 relative ${ activeSection === 'social_studio' ? 'bg-[#CC0000]/10 text-white font-bold' : 'text-white/60 hover:bg-white/5 hover:text-white font-medium' }`}>
            {activeSection === 'social_studio' && <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#CC0000] rounded-r-full" />}
            <span className={`w-4 h-4 ${activeSection === 'social_studio' ? 'text-[#CC0000]' : 'text-white/40'} material-symbols-outlined text-[16px] flex items-center justify-center`}>smart_toy</span>
            <span className="text-xs">Estudio IA</span>
        </button>
        */}

        {/* Planificador IA */}
        <button onClick={() => { setIsAnalyticsMode(false); navigate('/admin/creativo/planificador'); setSelectedNodeId(null); setIsSidebarOpen(false); }}
        className={`w-full px-2.5 py-2 rounded-md transition-all duration-200 flex items-center gap-2.5 relative ${ activeSection === 'ai-planner' ? 'bg-purple-500/10 text-white font-bold' : 'text-white/60 hover:bg-white/5 hover:text-white font-medium' }`}>
            {activeSection === 'ai-planner' && <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-purple-400 rounded-r-full" />}
            <span className={`w-4 h-4 ${activeSection === 'ai-planner' ? 'text-purple-400' : 'text-white/40'} material-symbols-outlined text-[16px] flex items-center justify-center`}>robot</span>
            <span className="text-xs">Planificador IA</span>
        </button>

        {/* Calendario Global */}
        <button onClick={() => { setIsAnalyticsMode(false); navigate('/admin/creativo/calendario'); setSelectedNodeId(null); setIsSidebarOpen(false); }}
        className={`w-full px-2.5 py-2 rounded-md transition-all duration-200 flex items-center gap-2.5 relative ${ activeSection === 'social' ? 'bg-yellow-500/10 text-white font-bold' : 'text-white/60 hover:bg-white/5 hover:text-white font-medium' }`}>
            {activeSection === 'social' && <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-yellow-400 rounded-r-full" />}
            <span className={`w-4 h-4 ${activeSection === 'social' ? 'text-yellow-400' : 'text-white/40'} material-symbols-outlined text-[16px] flex items-center justify-center`}>calendar_month</span>
            <span className="text-xs">Calendario Global</span>
        </button>
    </div>

    {/* GRUPO 3: OPERACIONES & NEGOCIO */}
    <div className="space-y-0.5">
        <p className="px-2 text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Operaciones & Negocio</p>

        {/* Analytics */}
        <button onClick={() => { setIsAnalyticsMode(true); setSelectedNodeId(null); if (isMobile) setIsSidebarOpen(false); }} 
        className={`w-full px-2.5 py-2 rounded-md transition-all duration-200 flex items-center gap-2.5 relative ${ isAnalyticsMode ? 'bg-[#CC0000]/10 text-white font-bold' : 'text-white/60 hover:bg-white/5 hover:text-white font-medium' }`}>
            {isAnalyticsMode && <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#CC0000] rounded-r-full" />}
            <span className={`w-4 h-4 ${isAnalyticsMode ? 'text-[#CC0000]' : 'text-white/40'} material-symbols-outlined text-[16px] flex items-center justify-center`}>bar_chart</span>
            <span className="text-xs">Analytics</span>
        </button>

        {/* Analítica Viral */}
        <button onClick={() => { openTrendsModal(); if (isMobile) setIsSidebarOpen(false); }} 
        className="w-full px-2.5 py-2 rounded-md transition-all duration-200 flex items-center gap-2.5 text-white/60 hover:bg-white/5 hover:text-white font-medium">
            <span className={"w-4 h-4 text-orange-500/70" + " material-symbols-outlined text-[16px] flex items-center justify-center"}>local_fire_department</span>
            <span className="text-xs">Analítica Viral</span>
        </button>

        {/* CEO Studio: Aprobaciones */}
        <button onClick={() => { setIsAnalyticsMode(false); navigate('/admin/operaciones/ceo-studio'); setSelectedNodeId(null); if (isMobile) setIsSidebarOpen(false); }}
        className={`w-full px-2.5 py-2 rounded-md transition-all duration-200 flex items-center gap-2.5 relative ${ activeSection === 'ceo_studio' ? 'bg-fuchsia-500/10 text-fuchsia-400 font-bold' : 'text-white/60 hover:bg-white/5 hover:text-white font-medium' }`}>
            {activeSection === 'ceo_studio' && <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-fuchsia-400 rounded-r-full" />}
            <span className={`w-4 h-4 ${activeSection === 'ceo_studio' ? 'text-fuchsia-400' : 'text-white/40'} material-symbols-outlined text-[16px] flex items-center justify-center`}>gavel</span>
            <span className="text-xs">CEO Studio</span>
        </button>

        {/* Clientes / Leads Abordaje */}
        <button onClick={() => { setIsAnalyticsMode(false); navigate('/admin/operaciones/leads'); setSelectedNodeId(null); if (isMobile) setIsSidebarOpen(false); }}
        className={`w-full px-2.5 py-2 rounded-md transition-all duration-200 flex items-center gap-2.5 relative ${ activeSection === 'leads' ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'text-white/60 hover:bg-white/5 hover:text-white font-medium' }`}>
            {activeSection === 'leads' && <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-emerald-400 rounded-r-full" />}
            <span className={`w-4 h-4 ${activeSection === 'leads' ? 'text-emerald-400' : 'text-white/40'} material-symbols-outlined text-[16px] flex items-center justify-center`}>group</span>
            <span className="text-xs">Leads Abordaje</span>
        </button>

        {/* Newsletter */}
        <button onClick={() => { setIsAnalyticsMode(false); navigate('/admin/operaciones/newsletter'); setSelectedNodeId(null); if (isMobile) setIsSidebarOpen(false); }}
        className={`w-full px-2.5 py-2 rounded-md transition-all duration-200 flex items-center gap-2.5 relative ${ activeSection === 'newsletter' ? 'bg-sky-500/10 text-sky-400 font-bold' : 'text-white/60 hover:bg-white/5 hover:text-white font-medium' }`}>
            {activeSection === 'newsletter' && <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-sky-400 rounded-r-full" />}
            <span className={`w-4 h-4 ${activeSection === 'newsletter' ? 'text-sky-400' : 'text-white/40'} material-symbols-outlined text-[16px] flex items-center justify-center`}>mail</span>
            <span className="text-xs">Newsletter</span>
        </button>



        {/* SECCIÓN CRM COLAPSABLE */}
        <div className="space-y-0.5 pt-1">
            <p onClick={() => setCollapsedGroups(p => ({ ...p, crm: !p.crm }))}
                className="w-full px-2.5 py-2 rounded-md transition-all duration-200 flex items-center justify-between text-white/60 hover:bg-white/5 hover:text-white font-medium cursor-pointer group">
                <span className="flex items-center gap-2.5">
                    <span className={"w-4 h-4 text-emerald-500/70" + " material-symbols-outlined text-[16px] flex items-center justify-center"}>database</span>
                    <span className="text-xs">CRM Negocios</span>
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" 
                    className={`transition-transform duration-200 ${!collapsedGroups.crm ? 'text-white/40 rotate-180' : 'text-white/20 group-hover:text-white/40 rotate-0'}`}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </p>
            
            {!collapsedGroups.crm && (
                <div className="space-y-0.5 animate-in fade-in duration-200 ml-6 border-l border-white/10 pl-2 mt-1">
                    {[
                        { name: "CRM Ventas", url: "https://ventas.godzillaconsulting.ai/" },
                        { name: "CRM Terapia", url: "https://terapia.godzillaconsulting.ai/" }
                    ].map((crm, idx) => (
                        <button key={idx} onClick={() => window.open(crm.url, '_blank')}
                        className="w-full text-left px-2 py-1.5 rounded-md transition-all duration-200 flex items-center gap-2 text-white/50 hover:bg-white/5 hover:text-white text-[11px] font-medium">
                            {crm.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    </div>

    {/* GRUPO 4: DESARROLLO & TI */}
    {isTechAdmin && (
        <div className="space-y-0.5">
            <p className="px-2 text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Desarrollo & TI</p>


            {/* Flujo de Bots */}
            <button onClick={() => { setIsAnalyticsMode(false); navigate('/admin/it/flow'); setSelectedNodeId(null); setIsSidebarOpen(false); }}
            className={`w-full px-2.5 py-2 rounded-md transition-all duration-200 flex items-center gap-2.5 relative ${ activeSection === 'it_flow' ? 'bg-[#CC0000]/10 text-white font-bold' : 'text-white/60 hover:bg-white/5 hover:text-white font-medium' }`}>
                {activeSection === 'it_flow' && <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#CC0000] rounded-r-full" />}
                <span className={`w-4 h-4 ${activeSection === 'it_flow' ? 'text-[#CC0000]' : 'text-white/40'} material-symbols-outlined text-[16px] flex items-center justify-center`}>hub</span>
                <span className="text-xs">Flujo de Bots</span>
            </button>

            {/* Panel Maestro */}
            <button onClick={() => { setIsAnalyticsMode(false); navigate('/admin/it/maestro'); setSelectedNodeId(null); setIsSidebarOpen(false); }}
            className={`w-full px-2.5 py-2 rounded-md transition-all duration-200 flex items-center gap-2.5 relative ${ activeSection === 'it_maestro' ? 'bg-yellow-500/10 text-yellow-400 font-bold' : 'text-white/60 hover:bg-white/5 hover:text-white font-medium' }`}>
                {activeSection === 'it_maestro' && <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-yellow-400 rounded-r-full" />}
                <span className={`w-4 h-4 ${activeSection === 'it_maestro' ? 'text-yellow-400' : 'text-white/40'} material-symbols-outlined text-[16px] flex items-center justify-center`}>settings_applications</span>
                <span className="text-xs">Panel Maestro</span>
            </button>

            {/* Firewall WAF */}
            <button onClick={() => { setIsAnalyticsMode(false); navigate('/admin/it/waf'); setSelectedNodeId(null); setIsSidebarOpen(false); }}
            className={`w-full px-2.5 py-2 rounded-md transition-all duration-200 flex items-center gap-2.5 relative ${ activeSection === 'it_waf' ? 'bg-red-500/10 text-red-400 font-bold' : 'text-white/60 hover:bg-white/5 hover:text-white font-medium' }`}>
                {activeSection === 'it_waf' && <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-red-400 rounded-r-full" />}
                <span className={`w-4 h-4 ${activeSection === 'it_waf' ? 'text-red-400' : 'text-white/40'} material-symbols-outlined text-[16px] flex items-center justify-center`}>security</span>
                <span className="text-xs">Firewall WAF</span>
            </button>

            {/* Bug Tracker Admin */}
            <button onClick={() => { setIsAnalyticsMode(false); navigate('/admin/it/bugs'); setSelectedNodeId(null); setIsSidebarOpen(false); }}
            className={`w-full px-2.5 py-2 rounded-md transition-all duration-200 flex items-center gap-2.5 relative ${ activeSection === 'it_bugs' ? 'bg-orange-500/10 text-orange-400 font-bold' : 'text-white/60 hover:bg-white/5 hover:text-white font-medium' }`}>
                {activeSection === 'it_bugs' && <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-orange-400 rounded-r-full" />}
                <span className={`w-4 h-4 ${activeSection === 'it_bugs' ? 'text-orange-400' : 'text-white/40'} material-symbols-outlined text-[16px] flex items-center justify-center`}>bug_report</span>
                <span className="text-xs">Bug Tracker TI</span>
            </button>
        </div>
    )}
  </div>

  <div className="p-3 border-t border-white/5 space-y-1 shrink-0 bg-[#0a0a0a]/50">
    <button onClick={() => {
        if (isTechAdmin) {
            setIsAnalyticsMode(false);
            navigate('/admin/it/bugs');
            setSelectedNodeId(null);
        } else {
            setShowFeedbackModal(true);
        }
        if (isMobile) setIsSidebarOpen(false);
    }}
    className={`w-full px-2.5 py-2 rounded-md transition-all duration-200 flex items-center gap-2.5 relative ${activeSection === 'it_bugs' ? 'bg-yellow-500/10 text-yellow-400 font-bold' : 'text-white/60 hover:bg-white/5 hover:text-white font-medium'}`}>
        {activeSection === 'it_bugs' && <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-yellow-400 rounded-r-full" />}
        {activeSection === 'it_bugs' ? <span className="w-4 h-4 text-yellow-400 material-symbols-outlined text-[16px] flex items-center justify-center">bug_report</span> : <span className="w-4 h-4 text-white/40 material-symbols-outlined text-[16px] flex items-center justify-center">lightbulb</span>}
        <span className="text-xs">{isTechAdmin ? 'Bug Tracker TI' : 'Sugerencias / Bugs'}</span>
    </button>
    
    <button onClick={() => { localStorage.clear(); window.location.href ='/login'; }}
    className="w-full px-2.5 py-2 rounded-md transition-all duration-200 flex items-center gap-2.5 text-red-500/70 hover:bg-red-500/10 hover:text-red-400 font-medium">
        <span className={"w-4 h-4"  + " material-symbols-outlined text-[16px] flex items-center justify-center"}>logout</span>
        <span className="text-xs">Cerrar sesión</span>
    </button>
  </div>
 </div>
  <div className="flex-1 flex flex-col overflow-hidden relative z-10 bg-black/30 backdrop-blur-md shadow-inner border-l border-red-900/30">
  
  <div style={{ display: (!isAnalyticsMode && activeSection === 'social_studio') ? 'flex' : 'none', flex: 1, height: '100%', overflow: 'hidden' }}>
      <CockersStudio adminProfile={adminProfile} forceOpenEditor={false} />
  </div>
  <div style={{ display: (!isAnalyticsMode && activeSection === 'it_flow') ? 'flex' : 'none', flex: 1, height: '100%', overflow: 'hidden' }}>
      <AutomationFlow />
  </div>
  <div style={{ display: (!isAnalyticsMode && activeSection === 'ai-planner') ? 'flex' : 'none', flex: 1, height: '100%', overflow: 'hidden' }}>
      <AIContentPlanner adminProfile={adminProfile} openGlobalRadar={() => setShowTrendsModal(true)} />
  </div>
  <div style={{ display: (!isAnalyticsMode && activeSection === 'social') ? 'flex' : 'none', flex: 1, height: '100%', overflow: 'hidden' }}>
      <CMCalendar adminProfile={adminProfile} />
  </div>

  {isAnalyticsMode ? (
  <AnalyticsDashboard />
  ) : activeSection === 'profile' ? (
  <AdminProfile profile={adminProfile} onProfileUpdate={setAdminProfile} />
  ) : activeSection === 'newsletter' ? (
  <NewsletterPanel />
  ) : activeSection === 'ceo_studio' ? (
  <CeoEstudioPanel adminProfile={adminProfile} />
  ) : activeSection === 'leads' ? (
  <AbordajeLeadsPanel adminProfile={adminProfile} />
  ) : activeSection === 'it_maestro' ? (
  <PanelMaestroPanel adminProfile={adminProfile} />
  ) : activeSection === 'it_waf' ? (
  <SqlAtaquesPanel adminProfile={adminProfile} />
  ) : activeSection === 'it_bugs' ? (
  <BugTrackerUI />
  ) : ['social_studio', 'video_editor', 'it_flow', 'ai-planner', 'social'].includes(activeSection) ? (
      null /* Renderizado persistentemente arriba para evitar pérdida de estado */
  ) : (<>

  {/* Barra superior del editor */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 sm:px-5 py-2.5 border-b border-red-900/30 bg-black/40 backdrop-blur-xl shrink-0 shadow-sm relative">

    <div className="flex items-center gap-2.5 min-w-0">
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
        title={isSidebarOpen ? "Ocultar menú lateral" : "Mostrar menú lateral"}
        className="p-1.5 rounded-lg bg-black/50 hover:bg-neutral-800 border border-white/10 text-white/70 hover:text-white transition-all shadow-sm flex items-center justify-center shrink-0"
      >
        <span className="material-symbols-outlined text-[18px]">
          {isSidebarOpen ? 'menu_open' : 'menu'}
        </span>
      </button>

      {selectedNodeId ? (
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => { setSelectedNodeId(null); setDraftData(null); }}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all mr-1"
            title="Volver a la selección de secciones"
          >
            <span className="material-symbols-outlined text-[15px]">arrow_back</span>
            <span className="hidden sm:inline">Secciones</span>
          </button>
          <span className="material-symbols-outlined text-[#CC0000] text-[20px] flex items-center justify-center select-none shrink-0">{getSectionIcon(selectedNodeId)}</span>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-black text-white leading-tight truncate flex items-center gap-2">
              {PAGE_SECTIONS.find(s => s.id === selectedNodeId)?.label || selectedNodeId}
              {activePresences[selectedNodeId] && activePresences[selectedNodeId].user !== adminProfile?.username && (
                <span className="text-[9px] bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                  <span className="material-symbols-outlined text-[10px]">lock</span> Bloqueado por {activePresences[selectedNodeId].user}
                </span>
              )}
            </h2>
            <p className="text-[9px] font-bold text-[#CC0000]/70 uppercase tracking-wider">Editor CMS</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#CC0000] to-red-950 flex items-center justify-center text-white border border-red-500/30 shadow-sm shrink-0">
            <span className="material-symbols-outlined text-[14px]">dashboard</span>
          </div>
          <div>
            <h2 className="text-xs font-black text-white leading-tight tracking-wider uppercase">
              Admin <span className="text-[#CC0000]">Studio</span>
            </h2>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Gestor de Contenido Visual</p>
          </div>
        </div>
      )}
    </div>

    {selectedNodeId && (
      <div className="flex items-center flex-wrap gap-2 justify-end w-full sm:w-auto">
        <button onClick={() => setShowPreview(p => !p)}
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all duration-200 shadow-sm border border-transparent whitespace-nowrap ${
            showPreview ? 'bg-white/90 text-[#CC0000] border-[#CC0000]/50 shadow-md' : 'bg-black/40 text-neutral-300 hover:bg-neutral-800'
          }`}>
          {showPreview ? '◧ Ocultar Vista' : '▣ Ver Vista'}
        </button>

        <button onClick={handleSave} 
          disabled={saving || !selectedNodeId || !isRecursosValid || isCM || (activePresences[selectedNodeId] && activePresences[selectedNodeId].user !== adminProfile?.username)}
          className={`group px-3.5 py-1.5 text-[11px] font-black rounded-lg transition-all duration-200 shadow-sm disabled:opacity-50 border relative whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 ${
            hasUnsavedChanges 
              ? 'bg-[#CC0000]/20 text-[#CC0000] border-[#CC0000] hover:bg-[#CC0000] hover:text-white shadow-[0_0_12px_rgba(204,0,0,0.4)]' 
              : 'bg-white hover:bg-gray-100 text-[#CC0000] border-[#CC0000]/50'
          }`}>
          {hasUnsavedChanges && <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#CC0000] opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#CC0000]"></span></span>}
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
          {saving ? 'Guardando...' : 'Guardar borrador'}
        </button>

        <button onClick={() => setShowPublishModal(true)} disabled={!selectedNodeId || !isRecursosValid || isCM}
          className="group px-4 py-1.5 flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#CC0000] to-[#880000] hover:from-white hover:to-gray-200 text-white hover:text-[#CC0000] text-[11px] font-black rounded-lg transition-all duration-200 shadow-[0_2px_12px_rgba(204,0,0,0.4)] border border-red-900/30 hover:border-[#CC0000] disabled:opacity-50 whitespace-nowrap flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          Publicar cambios
        </button>
      </div>
    )}
  </div>

  {/* Cuerpo: Si NO hay sección seleccionada -> Hub Centrado Completo. Si hay sección -> Split Editor/Preview */}
  {!selectedNodeId ? (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        
        {/* Header Hero Hub */}
        <div className="text-center space-y-2 py-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CC0000]/10 border border-[#CC0000]/30 text-[#CC0000] text-xs font-bold uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-[16px]">tune</span> Gestor Visual de Contenidos
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            ¿Qué sección o página deseas editar?
          </h2>
          <p className="text-sm text-neutral-400 max-w-xl mx-auto font-medium">
            Selecciona un bloque del sitio para modificar sus textos, imágenes, videos y configuraciones en tiempo real.
          </p>
        </div>

        {/* Grupo 1: Sitio Principal */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 px-1 border-b border-white/10 pb-2">
            <span className="material-symbols-outlined text-red-500 text-[20px]">web</span>
            <h3 className="text-sm font-black uppercase text-white tracking-wider">Sitio Principal (Landing)</h3>
            <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full font-bold">7 Bloques</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {[
              { id: 'hero', label: 'Encabezado Principal', desc: 'Título, subtítulo, llamada a la acción y logos de clientes', icon: 'layers', tag: 'Hero' },
              { id: 'servicios', label: 'Servicios', desc: 'Resumen de los 6 servicios principales y gifs ilustrativos', icon: 'bolt', tag: 'Servicios' },
              { id: 'cultura', label: 'Cultura & Filosofía', desc: 'Video de fondo, visión, misión y carrusel de fotos', icon: 'corporate_fare', tag: 'Cultura' },
              { id: 'portafolio', label: 'Casos de Éxito', desc: 'Logos y categorías de marcas destacadas', icon: 'workspace_premium', tag: 'Portafolio' },
              { id: 'recursos', label: 'Recursos Descargables', desc: 'Lead magnets gratuitos y envío de correos', icon: 'auto_stories', tag: 'Recursos' },
              { id: 'paquetes', label: 'Paquetes Grid', desc: 'Tarjetas comparativas de planes de servicio', icon: 'inventory_2', tag: 'Precios' },
              { id: 'footer', label: 'Pie de Página (Footer)', desc: 'Información de contacto, menú de navegación y enlaces legales', icon: 'pin', tag: 'Footer' },
            ].map(item => {
              const node = nodes.find(n => n.id === item.id) || { id: item.id };
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectSection(node)}
                  className="p-4 bg-neutral-900/90 hover:bg-neutral-800/95 border border-white/10 hover:border-[#CC0000]/70 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(204,0,0,0.25)] flex flex-col justify-between text-left group cursor-pointer min-h-[140px] relative overflow-hidden"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-500/30 text-[#CC0000] flex items-center justify-center group-hover:bg-[#CC0000] group-hover:text-white transition-all shadow-sm">
                        <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                      </div>
                      <span className="text-[10px] font-bold text-neutral-400 bg-black/40 px-2 py-0.5 rounded-md uppercase tracking-wider">{item.tag}</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white group-hover:text-red-400 transition-colors leading-snug">{item.label}</h4>
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-bold text-[#CC0000] group-hover:text-red-400">
                    <span>Editar sección</span>
                    <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grupo 2: Páginas de Servicios */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 px-1 border-b border-white/10 pb-2">
            <span className="material-symbols-outlined text-purple-400 text-[20px]">design_services</span>
            <h3 className="text-sm font-black uppercase text-white tracking-wider">Páginas de Servicio Dedicadas</h3>
            <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full font-bold">6 Páginas</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3.5">
            {[
              { id: 'servicio-bots', label: 'Automatización de Bots', desc: 'Página especializada de bots y atención 24/7', icon: 'smart_toy' },
              { id: 'servicio-audiovisual', label: 'Producción Audiovisual', desc: 'Página de producción de videos y comerciales', icon: 'movie' },
              { id: 'servicio-embudos', label: 'Embudos de Venta', desc: 'Página de funnels y conversión comercial', icon: 'filter_alt' },
              { id: 'servicio-redes', label: 'Gestión de Redes Sociales', desc: 'Página de branding y contenido estratégico', icon: 'share' },
              { id: 'servicio-seo', label: 'Optimización Web & SEO', desc: 'Página de posicionamiento en Google y rendimiento', icon: 'search' },
              { id: 'servicio-crm', label: 'CRM SaaS a Medida', desc: 'Página de plataformas y software comercial', icon: 'database' },
            ].map(item => {
              const node = nodes.find(n => n.id === item.id) || { id: item.id };
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectSection(node)}
                  className="p-4 bg-neutral-900/90 hover:bg-neutral-800/95 border border-white/10 hover:border-purple-500/70 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(168,85,247,0.2)] flex flex-col justify-between text-left group cursor-pointer min-h-[130px]"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-400 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
                        <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                      </div>
                      <span className="text-[10px] font-bold text-purple-400 bg-purple-950/30 px-2 py-0.5 rounded-md uppercase tracking-wider">Servicio</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white group-hover:text-purple-300 transition-colors leading-snug">{item.label}</h4>
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-bold text-purple-400 group-hover:text-purple-300">
                    <span>Editar contenido</span>
                    <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grupo 3: Landings de Paquetes */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 px-1 border-b border-white/10 pb-2">
            <span className="material-symbols-outlined text-amber-400 text-[20px]">shopping_bag</span>
            <h3 className="text-sm font-black uppercase text-white tracking-wider">Landings de Paquetes Promocionales</h3>
            <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full font-bold">4 Landings</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            {[
              { id: 'paquete-posicionamiento-social', label: 'Posicionamiento Social', desc: 'Landing de plan starter y branding', icon: 'campaign' },
              { id: 'paquete-expansion', label: 'Expansión', desc: 'Landing de plan growth para empresas', icon: 'rocket_launch' },
              { id: 'paquete-control-ia', label: 'Control IA', desc: 'Landing de plan con bots e integraciones', icon: 'smart_toy' },
              { id: 'paquete-elite', label: 'Élite', desc: 'Landing de plan premium todo incluido', icon: 'crown' },
            ].map(item => {
              const node = nodes.find(n => n.id === item.id) || { id: item.id };
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectSection(node)}
                  className="p-4 bg-neutral-900/90 hover:bg-neutral-800/95 border border-white/10 hover:border-amber-500/70 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(245,158,11,0.2)] flex flex-col justify-between text-left group cursor-pointer min-h-[130px]"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-400 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all shadow-sm">
                        <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded-md uppercase tracking-wider">Plan</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors leading-snug">{item.label}</h4>
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-bold text-amber-400 group-hover:text-amber-300">
                    <span>Editar landing</span>
                    <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  ) : (
    /* Split Editor & Preview */
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-2.5 sm:p-3 gap-3">

      {isMobile && (
        <div className="flex p-1 bg-black/60 border border-white/10 rounded-xl shrink-0 gap-1 mb-1">
          <button 
            onClick={() => setShowPreview(false)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${!showPreview ? 'bg-[#CC0000] text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-[13px] mr-1 inline-block align-middle">edit</span>Editar
          </button>
          <button 
            onClick={() => setShowPreview(true)}
            disabled={activeTab === 'correos'}
            className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${showPreview && activeTab !== 'correos' ? 'bg-[#CC0000] text-white shadow-md' : 'text-gray-400 hover:text-white'} disabled:opacity-30 disabled:pointer-events-none`}
          >
            <span className="material-symbols-outlined text-[13px] mr-1 inline-block align-middle">visibility</span>Vista Previa
          </button>
        </div>
      )}

      {/* ─ PANEL EDITOR ─ */}
      {(!isMobile || !showPreview || activeTab === 'correos') && (
      <div className="flex flex-col overflow-hidden bg-black/40 backdrop-blur-xl border border-red-900/30 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.2)] transition-all duration-200 w-full"
      style={{ width: isMobile ? '100%' : ((showPreview && activeTab !== 'correos') ? '52%' : '100%') }}>

        {/* Tabs */}
        <div className="flex gap-1.5 px-3 py-1.5 border-b border-red-900/30 bg-black/40 shrink-0 overflow-x-auto custom-scrollbar">
          {tabs.map(tab => (
            <button key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedElementIndex(null); setSelectedFeatureIndex(null); }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap border border-transparent transition-all ${
                activeTab === tab.id ? 'bg-white text-[#CC0000] border-[#CC0000]/50 shadow-sm' : 'bg-black/40 text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">

        {/* ══ TAB TEXTOS ══ */}
        {activeTab === 'textos' && (
        <div className="space-y-3">

        {/* ── FOOTER DEDICADO ── */}
        {selectedNodeId === 'footer' ? (
            <div className="space-y-3">
              {/* Tarjeta 1: Contacto */}
              <div className="bg-neutral-900/70 border border-white/10 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                  <span className="text-[11px] font-black uppercase text-yellow-500 tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px]">contact_phone</span> Información de Contacto
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Título Contacto</label>
                    <input type="text" value={draftData.contactTitle || ''} onChange={e => change('contactTitle', e.target.value)} className="w-full px-2.5 py-1.5 bg-black/50 border border-white/10 focus:border-[#CC0000] rounded-lg text-white font-medium text-xs outline-none" />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email Contacto</label>
                    <input type="email" value={draftData.contactEmail || ''} onChange={e => change('contactEmail', e.target.value)} className="w-full px-2.5 py-1.5 bg-black/50 border border-white/10 focus:border-[#CC0000] rounded-lg text-white font-medium text-xs outline-none" />
                  </div>
                  <div className="space-y-0.5 col-span-full">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Teléfono Contacto</label>
                    <input type="text" value={draftData.contactPhone || ''} onChange={e => change('contactPhone', e.target.value)} className="w-full px-2.5 py-1.5 bg-black/50 border border-white/10 focus:border-[#CC0000] rounded-lg text-white font-medium text-xs outline-none" />
                  </div>
                </div>
              </div>

              {/* Tarjeta 2: Navegación */}
              <div className="bg-neutral-900/70 border border-white/10 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                  <span className="text-[11px] font-black uppercase text-yellow-500 tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px]">menu</span> Menú de Navegación
                  </span>
                </div>
                <div className="space-y-0.5 mb-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Título Sección</label>
                  <input type="text" value={draftData.navTitle || ''} onChange={e => change('navTitle', e.target.value)} className="w-full px-2.5 py-1.5 bg-black/50 border border-white/10 focus:border-[#CC0000] rounded-lg text-white font-medium text-xs outline-none" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[1, 2, 3, 4, 5, 6].map(idx => (
                    <div key={idx} className="bg-black/40 border border-white/5 rounded-lg p-2 space-y-1">
                      <span className="text-[9px] font-mono text-neutral-400">Enlace {idx}</span>
                      <input type="text" placeholder="Texto enlace" value={draftData[`navLink${idx}`] || ''} onChange={e => change(`navLink${idx}`, e.target.value)} className="w-full px-2 py-1 bg-black/60 border border-white/10 focus:border-[#CC0000] rounded text-white text-xs outline-none" />
                      <input type="text" placeholder="URL (#seccion)" value={draftData[`navUrl${idx}`] || ''} onChange={e => change(`navUrl${idx}`, e.target.value)} className="w-full px-2 py-1 bg-black/60 border border-white/10 focus:border-[#CC0000] rounded text-neutral-400 text-[11px] font-mono outline-none" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Tarjeta 3: Legales & Copyright */}
              <div className="bg-neutral-900/70 border border-white/10 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                  <span className="text-[11px] font-black uppercase text-yellow-500 tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px]">policy</span> Enlaces Legales & Copyright
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[1, 2, 3, 4, 5].map(idx => (
                    <div key={idx} className="bg-black/40 border border-white/5 rounded-lg p-2 space-y-1">
                      <span className="text-[9px] font-mono text-neutral-400">Legal {idx}</span>
                      <input type="text" placeholder="Texto" value={draftData[`legalLink${idx}`] || ''} onChange={e => change(`legalLink${idx}`, e.target.value)} className="w-full px-2 py-1 bg-black/60 border border-white/10 focus:border-[#CC0000] rounded text-white text-xs outline-none" />
                      <input type="text" placeholder="URL (/legal)" value={draftData[`legalUrl${idx}`] || ''} onChange={e => change(`legalUrl${idx}`, e.target.value)} className="w-full px-2 py-1 bg-black/60 border border-white/10 focus:border-[#CC0000] rounded text-neutral-400 text-[11px] font-mono outline-none" />
                    </div>
                  ))}
                </div>
                <div className="space-y-0.5 pt-1 border-t border-white/5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Texto de Copyright</label>
                  <input type="text" value={draftData.copyrightText || ''} onChange={e => change('copyrightText', e.target.value)} className="w-full px-2.5 py-1.5 bg-black/50 border border-white/10 focus:border-[#CC0000] rounded-lg text-white font-medium text-xs outline-none" />
                </div>
              </div>
            </div>
        ) : (
          <>
            {/* ── LANDINGS PAQUETES ── */}
            {(() => {
              const isLanding = selectedNodeId?.startsWith('paquete-');
              if (isLanding) {
                const sections = [
                  { id: 'sec_hero', title: 'Sección Hero', fields: ['heroTitle','heroTopText','heroDisclaimer'] },
                  { id: 'sec_card', title: 'Tarjeta de Detalles', fields: ['cardTitle','planTarget','tableHeaderLeft','tableHeaderRight'] },
                  { id: 'sec_prices', title: 'Precios y Totales', fields: ['planPrice','planPeriod','totalLabel','totalValue','normalLabel','normalPrice','offerLabel','offerPrice'] },
                  { id: 'sec_guarantee', title: 'Garantía', fields: ['guaranteeTitle','guaranteeBadge','guaranteeText'] },
                ];
                const usedKeys = new Set(sections.flatMap(s => s.fields));
                const remaining = textFields.filter(([k]) => !usedKeys.has(k));

                const renderLandingField = (key) => {
                  const val = draftData[key] || '';
                  const isLong = val.length > 80 || key.includes('Disclaimer') || key.includes('Text');
                  return (
                    <EditorField key={key} fieldKey={key} onHover={setHoveredField}>
                      <div className={`space-y-0.5 ${isLong ? 'col-span-full' : ''}`}>
                        <label className="text-[11px] font-semibold text-gray-300 block">{toLabel(key)}</label>
                        {isLong ? (
                          <textarea rows={2} value={val} onChange={e => change(key, e.target.value)} placeholder={`Añadir ${toLabel(key).toLowerCase()}...`} className="w-full p-2 bg-black/40 border border-[#CC0000]/20 rounded-lg text-white font-medium text-xs focus:bg-[#CC0000]/10 focus:border-[#CC0000]/50 outline-none resize-none transition-colors placeholder:text-neutral-600" />
                        ) : (
                          <input type="text" value={val} onChange={e => change(key, e.target.value)} placeholder={`Añadir ${toLabel(key).toLowerCase()}...`} className="w-full px-2.5 py-1.5 bg-black/40 border border-[#CC0000]/20 rounded-lg text-white font-medium text-xs focus:bg-[#CC0000]/10 focus:border-[#CC0000]/50 outline-none transition-colors placeholder:text-neutral-600" />
                        )}
                      </div>
                    </EditorField>
                  );
                };

                return (
                  <div className="space-y-2.5">
                    {sections.map(sec => (
                      <div key={sec.id} className="bg-neutral-900/60 border border-white/5 rounded-xl overflow-hidden">
                        <div onClick={() => toggleAccordion(sec.id)} className="px-3 py-2 bg-black/40 flex items-center justify-between cursor-pointer hover:bg-neutral-800/60 transition-colors">
                          <span className="text-[11px] font-bold text-yellow-400 tracking-wider flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[15px]">tune</span> {sec.title}
                          </span>
                          <span className="material-symbols-outlined text-[16px] text-neutral-400 transition-transform duration-200" style={{ transform: openAccordion[sec.id] ? 'rotate(180deg)' : 'none' }}>
                            expand_more
                          </span>
                        </div>
                        {openAccordion[sec.id] && (
                          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-white/5">
                            {sec.fields.map(k => renderLandingField(k))}
                          </div>
                        )}
                      </div>
                    ))}

                    {remaining.length > 0 && (
                      <div className="bg-neutral-900/60 border border-white/5 rounded-xl p-3">
                        <p className="text-[11px] font-bold text-neutral-400 mb-2">Otros campos</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {remaining.map(([k, v]) => renderLandingField(k))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // ── SECCIONES ESTÁNDAR (Hero, Servicios, Cultura, etc.) ──
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {textFields.map(([key, val]) => {
                    const isLong = typeof val === 'string' && (val.length > 80 || val.includes('\n') || /desc|texto|mission|vision|disclaimer|guarantee|about|body/i.test(key));
                    return (
                      <EditorField key={key} fieldKey={key} onHover={setHoveredField}>
                        <div className={`space-y-0.5 ${isLong ? 'col-span-full' : ''}`}>
                          <label className="text-[11px] font-semibold text-gray-300 block">{toLabel(key)}</label>
                          {isLong ? (
                            <textarea 
                              rows={val.length > 140 ? 3 : 2} 
                              value={val || ''} 
                              onChange={e => change(key, e.target.value)} 
                              className="w-full p-2 bg-black/40 border border-[#CC0000]/20 rounded-lg text-white font-medium text-xs focus:bg-[#CC0000]/10 focus:border-[#CC0000]/50 outline-none resize-none transition-colors" 
                            />
                          ) : (
                            <input 
                              type="text" 
                              value={val || ''} 
                              onChange={e => change(key, e.target.value)} 
                              className="w-full px-2.5 py-1.5 bg-black/40 border border-[#CC0000]/20 rounded-lg text-white font-medium text-xs focus:bg-[#CC0000]/10 focus:border-[#CC0000]/50 outline-none transition-colors" 
                            />
                          )}
                        </div>
                      </EditorField>
                    );
                  })}
                </div>
              );
            })()}
          </>
        )}

        {/* Campos agrupados (service1Title, service2Desc, caso1LogoUrl, caso1Nombre...) */}
        {hasGrouped && Object.entries(groupedFields).map(([prefix, nums]) => (
          <div key={prefix} className="space-y-3 pt-3 border-t border-neutral-800">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
              <p className="text-xs font-bold text-yellow-400 tracking-wider uppercase flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">dataset</span> {toLabel(prefix)} ({Object.keys(nums).length} elementos)
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const next = {};
                    Object.keys(nums).forEach(num => { next[`${prefix}_${num}`] = true; });
                    setOpenAccordion(prev => ({ ...prev, ...next }));
                  }}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-neutral-300 rounded transition-colors"
                >
                  Expandir todos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = {};
                    Object.keys(nums).forEach(num => { next[`${prefix}_${num}`] = false; });
                    setOpenAccordion(prev => ({ ...prev, ...next }));
                  }}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-neutral-300 rounded transition-colors"
                >
                  Colapsar todos
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {Object.entries(nums).sort(([a],[b]) => +a - +b).map(([num, fields]) => {
                const accKey = `${prefix}_${num}`;
                const isOpen = openAccordion[accKey] !== false;
                const titleField = Object.entries(fields).find(([k]) => k.toLowerCase().includes('title') || k.toLowerCase().includes('nombre'))?.[1] || `#${num}`;

                return (
                  <div key={num} className="bg-neutral-900/90 rounded-xl border border-white/10 overflow-hidden shadow-sm">
                    <div 
                      onClick={() => toggleAccordion(accKey)} 
                      className="px-3.5 py-2.5 bg-black/60 flex items-center justify-between cursor-pointer hover:bg-neutral-800/80 transition-colors select-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[10px] font-mono font-bold text-white bg-[#CC0000] px-2 py-0.5 rounded-md shadow-sm shrink-0">#{num}</span>
                        <span className="text-xs font-bold text-white truncate">{String(titleField || `Elemento #${num}`)}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          title="Eliminar este elemento"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`¿Eliminar elemento #${num}?`)) {
                              setDraftData(prev => {
                                const next = { ...prev };
                                Object.keys(next).forEach(k => {
                                  const m = k.match(/^([a-zA-Z]+?)(\d+)([A-Z][a-zA-Z]*)$/);
                                  if (m && m[1] === prefix && m[2] === num) next[k] = '';
                                });
                                return next;
                              });
                            }
                          }}
                          className="px-2 py-0.5 text-[10px] font-bold text-red-400 hover:text-white hover:bg-red-600 rounded transition-colors"
                        >
                          ✕ Eliminar
                        </button>
                        <span className="material-symbols-outlined text-[18px] text-neutral-400 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                          expand_more
                        </span>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-t border-white/5 bg-black/30">
                        {Object.entries(fields).filter(([k]) => k !== '_keys').map(([field, val]) => {
                          const originalKey = fields._keys[field];
                          const isLong = typeof val === 'string' && (val.length > 60 || field.toLowerCase().includes('desc'));
                          return (
                            <EditorField key={originalKey} fieldKey={originalKey} onHover={setHoveredField}>
                              <div className={`space-y-1 ${isLong ? 'col-span-full' : ''}`}>
                                <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wider block">{toLabel(field)}</label>
                                {isLong ? (
                                  <textarea 
                                    rows={2} 
                                    value={val || ''} 
                                    onChange={e => change(originalKey, e.target.value)} 
                                    className="w-full p-2 bg-black/60 border border-white/10 focus:border-[#CC0000] rounded-lg text-white font-medium text-xs outline-none resize-none transition-colors" 
                                  />
                                ) : (
                                  <input 
                                    type="text" 
                                    value={val || ''} 
                                    onChange={e => change(originalKey, e.target.value)} 
                                    className="w-full px-2.5 py-1.5 bg-black/60 border border-white/10 focus:border-[#CC0000] rounded-lg text-white font-medium text-xs outline-none transition-colors" 
                                  />
                                )}
                              </div>
                            </EditorField>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {textFields.length === 0 && !hasGrouped && selectedNodeId !== 'footer' && (
          <p className="text-neutral-500 text-xs text-center py-6">Sin campos de texto configurables para esta sección.</p>
        )}
        </div>
        )}

        {/* ══ TAB MEDIA ══ */}
        {activeTab === 'media' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-white/5">
            <p className="text-[11px] font-bold text-neutral-400 tracking-wider uppercase">
              Media detectada ({mediaFields.length} slots)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {mediaFields.map(([key, val]) => {
              const grpMatch = key.match(/^([a-zA-Z]+?)(\d+)([A-Z][a-zA-Z]*)$/);
              return (
                <div key={key} className="bg-neutral-900/70 border border-white/5 rounded-xl p-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-yellow-400 truncate">
                      {toLabel(key)}
                    </span>
                    {grpMatch && (
                      <button
                        title="Eliminar este elemento"
                        onClick={() => {
                          const [, grpPfx, grpNum] = grpMatch;
                          setDraftData(prev => {
                            const next = { ...prev };
                            Object.keys(next).forEach(k => {
                              const m = k.match(/^([a-zA-Z]+?)(\d+)([A-Z][a-zA-Z]*)$/);
                              if (m && m[1] === grpPfx && m[2] === grpNum) next[k] = '';
                            });
                            return next;
                          });
                        }}
                        className="px-1.5 py-0.5 text-[9px] font-bold text-red-400 hover:text-red-300 rounded"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <EditorField fieldKey={key} onHover={setHoveredField}>
                    <MediaPicker
                      label=""
                      compact={true}
                      value={val || ''}
                      onChange={url => change(key, url)}
                      accept={key.toLowerCase().includes('video') ? 'video' : 'all'}
                    />
                  </EditorField>
                </div>
              );
            })}
          </div>

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
                  className="mt-2 px-3 py-2 bg-[#CC0000]/10 text-[#CC0000] border border-[#CC0000]/30 text-xs font-bold rounded-lg hover:bg-[#CC0000] hover:text-white transition-all w-full flex items-center justify-center gap-1.5"
              >
                  <span className="material-symbols-outlined text-[15px]">add</span> Añadir nuevo caso
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
                  className="mt-2 px-3 py-2 bg-[#CC0000]/10 text-[#CC0000] border border-[#CC0000]/30 text-xs font-bold rounded-lg hover:bg-[#CC0000] hover:text-white transition-all w-full flex items-center justify-center gap-1.5"
              >
                  <span className="material-symbols-outlined text-[15px]">add</span> Añadir nuevo recurso
              </button>
          )}

          {selectedNodeId === 'cultura' && (
              <div className="space-y-3 mt-4 pt-3 border-t border-neutral-800">
                  <p className="text-xs font-bold text-yellow-400 tracking-widest">Carrusel de Cultura</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(draftData.mediaGallery || []).map((mediaItem, idx) => (
                        <div key={idx} className="bg-neutral-900/80 rounded-xl p-2.5 border border-white/5 relative flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-bold text-white">Medio {idx + 1}</span>
                              <button onClick={() => {
                                    if(window.confirm('¿Eliminar este medio?')) {
                                        setDraftData(p => {
                                            const arr = [...(p.mediaGallery || [])];
                                            arr.splice(idx, 1);
                                            return { ...p, mediaGallery: arr };
                                        });
                                    }
                              }} className="text-[10px] text-red-500 font-bold hover:text-red-400">✕ Eliminar</button>
                            </div>
                            
                            <EditorField fieldKey={`mediaGallery_${idx}_url`} onHover={setHoveredField}>
                                <MediaPicker
                                    label=""
                                    compact={true}
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
                            
                            <div className="mt-1.5">
                                  <select 
                                      value={mediaItem.type || 'image'}
                                      onChange={e => {
                                          setDraftData(p => {
                                              const arr = [...(p.mediaGallery || [])];
                                              arr[idx] = { ...arr[idx], type: e.target.value };
                                              return { ...p, mediaGallery: arr };
                                          });
                                      }}
                                      className="w-full px-2 py-1 bg-black/60 border border-white/10 rounded text-neutral-300 text-[10px] outline-none"
                                  >
                                      <option value="image">Imagen</option>
                                      <option value="video">Video</option>
                                  </select>
                            </div>
                        </div>
                    ))}
                  </div>
                  <button 
                      onClick={() => {
                          setDraftData(p => ({
                              ...p,
                              mediaGallery: [...(p.mediaGallery || []), { url: '', type: 'image' }]
                          }));
                      }}
                      className="w-full py-2 bg-[#CC0000]/10 hover:bg-[#CC0000]/20 text-[#CC0000] border border-[#CC0000]/30 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                      <span className="material-symbols-outlined text-[15px]">add_photo_alternate</span> Añadir elemento al carrusel
                  </button>
              </div>
          )}
        </div>
        )}

        {/* ══ TAB COLORES ══ */}
        {activeTab === 'colores' && (
        <div className="space-y-2.5">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Colores de la Sección</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <ColorField label="Color Primario" fieldKey="primaryColor" draftData={draftData} onChange={change} />
            <ColorField label="Color Secundario" fieldKey="secondaryColor" draftData={draftData} onChange={change} />
            <ColorField label="Color de Fondo" fieldKey="bgColor" draftData={draftData} onChange={change} />
            <ColorField label="Color de Texto" fieldKey="textColor" draftData={draftData} onChange={change} />
            <ColorField label="Color de Acento" fieldKey="accentColor" draftData={draftData} onChange={change} />
          </div>
        </div>
        )}

        {/* ══ TAB TIPOGRAFÍA ══ */}
        {activeTab === 'tipografia' && (
        <div className="space-y-2.5">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Tipografía & Fuentes</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <label className="text-[11px] font-semibold text-gray-300 block">Fuente de Títulos</label>
              <select 
                value={draftData.titleFont || 'Inter'}
                onChange={e => change('titleFont', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-black/50 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-[#CC0000]"
              >
                {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div className="space-y-0.5">
              <label className="text-[11px] font-semibold text-gray-300 block">Fuente de Cuerpo</label>
              <select 
                value={draftData.bodyFont || 'Roboto'}
                onChange={e => change('bodyFont', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-black/50 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-[#CC0000]"
              >
                {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
        </div>
        )}

        {/* ══ TAB ELEMENTOS (Features y Precios) ══ */}
        {activeTab === 'elementos' && (
        <div className="space-y-3">
          {hasFeatures && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider">Características ({draftData.planFeaturesExtended?.length || 0})</p>
                <button 
                  onClick={() => {
                      setDraftData(p => ({
                          ...p,
                          planFeaturesExtended: [...(p.planFeaturesExtended || []), { title: 'Nueva característica', desc: '', price: '' }]
                      }));
                      setSelectedFeatureIndex((draftData.planFeaturesExtended || []).length);
                  }}
                  className="px-2 py-1 text-[10px] font-bold text-[#CC0000] border border-[#CC0000]/30 rounded-lg hover:bg-[#CC0000] hover:text-white transition-all flex items-center gap-1"
                >
                  + Añadir
                </button>
              </div>

              <div className="space-y-1.5">
                {(draftData.planFeaturesExtended || []).map((f, idx) => (
                  <div key={idx} className="bg-neutral-900/80 border border-white/5 rounded-xl p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">#{idx + 1}</span>
                      <button
                        onClick={() => {
                          if (window.confirm('¿Eliminar esta característica?')) {
                            setDraftData(p => {
                              const arr = [...(p.planFeaturesExtended || [])];
                              arr.splice(idx, 1);
                              return { ...p, planFeaturesExtended: arr };
                            });
                          }
                        }}
                        className="text-[10px] text-red-400 font-bold hover:text-red-300"
                      >
                        ✕ Eliminar
                      </button>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Título" 
                      value={f.title || ''} 
                      onChange={e => {
                        const arr = [...(draftData.planFeaturesExtended || [])];
                        arr[idx] = { ...arr[idx], title: e.target.value };
                        setDraftData(p => ({ ...p, planFeaturesExtended: arr }));
                      }}
                      className="w-full px-2 py-1 bg-black/60 border border-white/10 rounded text-xs text-white outline-none" 
                    />
                    <textarea 
                      rows={2} 
                      placeholder="Descripción..." 
                      value={f.desc || ''} 
                      onChange={e => {
                        const arr = [...(draftData.planFeaturesExtended || [])];
                        arr[idx] = { ...arr[idx], desc: e.target.value };
                        setDraftData(p => ({ ...p, planFeaturesExtended: arr }));
                      }}
                      className="w-full p-2 bg-black/60 border border-white/10 rounded text-xs text-white outline-none resize-none" 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        )}

        </div>
      </div>
      )}

      {/* ─ PANEL PREVIEW ─ */}
      {(!isMobile || showPreview) && (showPreview && activeTab !== 'correos') && (
      <div className="flex-1 overflow-hidden border-l border-neutral-800 w-full">
        <StudioPreview nodeId={selectedNodeId} draftData={draftData} hoveredField={hoveredField} />
      </div>
      )}

    </div>
  )}
  </>)}
  </div>

 {/* Modal de Feedback Global */}
 {showFeedbackModal && (
 <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
   <div className="bg-[#111111] border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(204,0,0,0.2)] relative">
     <button onClick={() => setShowFeedbackModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white text-2xl font-black">×</button>
     <h3 className="text-xl font-black text-white tracking-widest uppercase mb-4 flex items-center gap-2">
       <span className="material-symbols-outlined text-yellow-500">lightbulb</span> Reportar a IT
     </h3>
     <p className="text-xs text-neutral-400 font-bold mb-4">Envía tus sugerencias, pide funciones o reporta bugs para <span className="text-[#CC0000]">Dani</span> y <span className="text-[#CC0000]">JareG</span>.</p>
     <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="Ej: Un botón para descargar imágenes está fallando..." rows="4" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors resize-none mb-3" />
     
     <label className={`block flex items-center justify-center p-3 mb-6 border border-dashed rounded-lg cursor-pointer transition-all ${isUploadingFeedbackMedia ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-white/20 hover:border-yellow-500 hover:bg-white/5'}`}>
         <span className="text-xs font-black text-neutral-300 uppercase tracking-widest flex items-center gap-2">
             <span className="material-symbols-outlined text-[18px]">camera_alt</span> {isUploadingFeedbackMedia ? 'Subiendo...' : 'Adjuntar Captura (SS)'}
         </span>
         <input type="file" accept="image/*,video/*" className="hidden" disabled={isUploadingFeedbackMedia} onChange={handleUploadFeedbackImage} />
     </label>

     <button onClick={async () => {
          if (!feedbackText.trim()) {
              alert('Añade una descripción para tu sugerencia o reporte.');
              return;
          }
          try {
              const API = import.meta.env.DEV ? 'http://localhost:3000' : '';
              const token = localStorage.getItem('adminToken');
              const res = await fetch(`${API}/api/bugs`, {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                      description: feedbackText,
                      priority: 'media',
                      screenshot_url: '',
                      path_url: window.location.pathname
                  })
              });
              const data = await res.json();
              if (data.success) {
                  alert('🚀 Tu reporte fue enviado a la central de JareG y Dani. ¡Gracias!');
                  setShowFeedbackModal(false);
                  setFeedbackText('');
              } else {
                  alert('Error al enviar: ' + (data.error || 'error desconocido'));
              }
          } catch (e) {
              alert('Error de red al enviar reporte: ' + e.message);
          }
      }} className="w-full bg-gradient-to-r from-yellow-600 to-yellow-800 hover:from-white hover:to-white hover:text-black py-4 rounded-xl font-black uppercase tracking-widest transition-all text-white border border-yellow-900/50">
        Enviar Reporte
      </button>

   </div>
 </div>
 )}

 <GoyiAdmin />
</div>
);
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format } from 'date-fns';
import { parse } from 'date-fns';
import { startOfWeek } from 'date-fns';
import { getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useNavigate } from 'react-router-dom';

const locales = { 'es': es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// ─── EQUIPO (para @menciones) ─────────────────────────────────────────────
const TEAM = ['JareG', 'Oscar', 'Judith', 'Alex'];

// ─── ROLES ────────────────────────────────────────────────────────────────
const canAssign = (profile) => {
    return true; // Desbloqueado para todos los usuarios
};

// ─── PARSEAR MENCIONES para resaltado ─────────────────────────────────────
const renderMentions = (text) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) =>
        part.startsWith('@')
            ? <span key={i} className="text-[#CC0000] font-black">{part}</span>
            : <span key={i}>{part}</span>
    );
};

export const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

export const getBackendUrl = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    return 'https://bot.godzillaconsulting.ai';
};

export const API_URL = getBackendUrl();
const getAPI = () => API_URL;

export const resolveMedia = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
        if (url.includes('localhost:') || url.includes('127.0.0.1:')) {
            try {
                const urlObj = new URL(url);
                return `${API_URL}${urlObj.pathname}${urlObj.search}`;
            } catch(e) { /* ignore */ }
        }
        return url;
    }
    if (url.startsWith('blob:') || url.startsWith('data:')) {
        return url;
    }
    return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

// ─── Mapear evento de DB al shape del cliente ─────────────────────────────
const mapEvent = (row) => ({
    id: row.id,
    title: row.title,
    platform: row.platform || 'ALL',
    status: row.status || 'warning',
    caption: row.caption || '',
    media_url: row.media_url || '',
    provider: row.provider || '',
    start: row.start instanceof Date ? row.start : new Date(row.start_date || row.start),
    end: row.end instanceof Date ? row.end : new Date(row.end_date || row.end_date || row.start_date || row.start),
    empresa: row.empresa || 'godzilla',
    assigned_to: row.assigned_to || '',
    created_by: row.created_by || '',
    comments: row.comments || [],
    is_rescheduled: row.is_rescheduled || false
});

// ─── ICONOS Y COLORES DE PLATAFORMA ──────────────────────────────────────
const PLATFORM_META = {
    facebook:  { icon: '🔵', label: 'FB',      color: '#1877F2', glow: 'rgba(24,119,242,0.4)',  ring: 'border-[#1877F2]' },
    instagram: { icon: '🟣', label: 'IG',      color: '#E1306C', glow: 'rgba(225,48,108,0.4)',  ring: 'border-[#E1306C]' },
    tiktok:    { icon: '⚫', label: 'TK',      color: '#00f2ea', glow: 'rgba(0,242,234,0.4)',   ring: 'border-[#00f2ea]' },
    ALL:       { icon: '🌐', label: 'Multi',   color: '#ffffff', glow: 'rgba(255,255,255,0.2)', ring: 'border-white/30'  },
};

const STATUS_META = {
    urgent:  { bg: 'bg-red-500/20',    border: 'border-red-500',    text: 'text-red-400',    glow: '0 0 12px rgba(204,0,0,0.5)',       label: 'Urgente'    },
    warning: { bg: 'bg-amber-500/20',  border: 'border-amber-500',  text: 'text-amber-400',  glow: '0 0 12px rgba(245,158,11,0.4)',    label: 'En progreso' },
    success: { bg: 'bg-emerald-500/20',border: 'border-emerald-500',text: 'text-emerald-400',glow: '0 0 12px rgba(0,255,136,0.3)',     label: 'Listo'      },
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────
export default React.memo(function CMCalendar({ adminProfile }) {
    const navigate = useNavigate();
    const canCreate = canAssign(adminProfile);
    const currentUser = adminProfile?.username || 'Usuario';
    const canEditSheetsAndAI = canCreate || currentUser.toLowerCase() === 'alex';

    // ─── Tabs ─────────────────────────────────────────────────────────────
    const [calendarTab, setCalendarTab] = useState('contenido');
    const [calendarView, setCalendarView] = useState('month'); // 'month' | 'week'
    const [currentDate, setCurrentDate] = useState(new Date());

    // ─── Estado principal: eventos del calendario (persistidos en DB) ──────
    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);

    // ─── Filtros ──────────────────────────────────────────────────────────
    const [activePlatform, setActivePlatform] = useState('ALL');
    const [activeHashtag, setActiveHashtag] = useState(null);
    const [sortBy, setSortBy] = useState('date'); // 'date' | 'status' | 'platform'

    // ─── UI State ─────────────────────────────────────────────────────────
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showNewAssignModal, setShowNewAssignModal] = useState(false);
    const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
    const [savingCampaign, setSavingCampaign] = useState(false);

    // ─── Drag-and-Drop ────────────────────────────────────────────────────
    const [draggingEventId, setDraggingEventId] = useState(null);
    const [dragOverDay, setDragOverDay] = useState(null);

    const [newCampaign, setNewCampaign] = useState({
        empresa: 'godzilla',
        calendario: 'contenido',
        asignado: '',
        titulo: '',
        fecha: '',
        plataforma: 'ALL',
        briefing: '',
        urlFoto: '',
        urlVideo: '',
        urlReferencia: ''
    });

    // ─── Citas (desde DB) ─────────────────────────────────────────────────
    const [citas, setCitas] = useState([]);
    const [loadingCitas, setLoadingCitas] = useState(false);

    // ─── Sistema de Tareas ────────────────────────────────────────────────
    const [tasks, setTasks] = useState([]);
    const [selectedTaskBoard, setSelectedTaskBoard] = useState(null);
    const [taskView, setTaskView] = useState('pendientes');
    const [newTask, setNewTask] = useState({ que: '', para: '', referencias: '', deadline: '', audience: 'Marketing', priority: 'Medium', contentType: 'Backlog' });
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
    
    // ─── Modal de Publicación ─────────────────────────────────────────────
    const [selectedPublishTask, setSelectedPublishTask] = useState(null);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [publishNetwork, setPublishNetwork] = useState('instagram');
    const [publishTargets, setPublishTargets] = useState(['instagram', 'tiktok', 'facebook']);
    const [isPublishingToSocial, setIsPublishingToSocial] = useState(false);

    // ─── Comentarios & Notificaciones ─────────────────────────────────────
    const [correctionForm, setCorrectionForm] = useState({ que: '', cuando: '', paraQue: '', referencias: '', comentarios: '' });
    const [commentText, setCommentText] = useState('');
    const [mentionQuery, setMentionQuery] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const commentInputRef = useRef(null);

    // ─── Tendencias ───────────────────────────────────────────────────────
    const [trendsNiche, setTrendsNiche] = useState('B2B Tech');
    const [trendsNetwork, setTrendsNetwork] = useState('Todas');
    const [realTrends, setRealTrends] = useState(null);
    const [loadingTrends, setLoadingTrends] = useState(false);

    // ─── Bot AI Configurations ────────────────────────────────────────────
    const [botConfig, setBotConfig] = useState(null);
    const [savingBot, setSavingBot] = useState(false);

    // ─── Google Sheets Importer ───────────────────────────────────────────
    const [showSheetsModal, setShowSheetsModal] = useState(false);
    const [sheetsUrl, setSheetsUrl] = useState('');
    const [sheetsPreview, setSheetsPreview] = useState(null);
    const [sheetsLoading, setSheetsLoading] = useState(false);
    const [sheetsImporting, setSheetsImporting] = useState(false);
    const [sheetsError, setSheetsError] = useState('');
    const [sheetsEmpresa, setSheetsEmpresa] = useState('godzilla'); // empresa destino del import

    const unreadCount = notifications.filter(n => !n.read && n.to?.toLowerCase() === currentUser.toLowerCase()).length;

    // ═══════════════════════════════════════════════════════════════════════
    // ESC KEY — cierra cualquier overlay/modal/panel abierto
    // ═══════════════════════════════════════════════════════════════════════
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key !== 'Escape') return;
            // Prioridad: primero el más "interior"
            if (showSheetsModal)       { setShowSheetsModal(false);       return; }
            if (showNewCampaignModal)  { setShowNewCampaignModal(false);  return; }
            if (showNewAssignModal)    { setShowNewAssignModal(false);    return; }
            if (selectedEvent)         { setSelectedEvent(null);           return; }
            if (showNotifications)     { setShowNotifications(false);      return; }
            if (showTemplateDropdown)  { setShowTemplateDropdown(false);   return; }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [showNewCampaignModal, showNewAssignModal, selectedEvent, showNotifications, showTemplateDropdown]);

    // ═══════════════════════════════════════════════════════════════════════
    // CARGA INICIAL + SSE (TIEMPO REAL)
    // ═══════════════════════════════════════════════════════════════════════
    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        const API = getAPI();

        // 1. Carga inicial de eventos desde DB
        setLoadingEvents(true);
        fetch(`${API}/api/calendar/events`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) setEvents(data.events.map(mapEvent));
        })
        .catch(e => console.error('[Calendar] Error cargando eventos:', e))
        .finally(() => setLoadingEvents(false));

        // 2. SSE — recibe cambios en tiempo real de TODOS los usuarios
        const evtSource = new EventSource(`${API}/api/calendar/events/stream?token=${token}`);

        evtSource.onmessage = (e) => {
            const { type, event } = JSON.parse(e.data);
            if (type === 'CONNECTED') return; // heartbeat inicial
            if (type === 'CREATE') {
                setEvents(prev => {
                    // Evitar duplicados si el propio usuario ya lo agregó optimisticamente
                    const exists = prev.some(ev => ev.id === event.id);
                    return exists ? prev : [mapEvent(event), ...prev];
                });
            }
            if (type === 'UPDATE') {
                setEvents(prev => prev.map(ev => ev.id === event.id ? mapEvent(event) : ev));
                setSelectedEvent(prev => prev?.id === event.id ? mapEvent(event) : prev);
            }
            if (type === 'DELETE') {
                setEvents(prev => prev.filter(ev => ev.id !== event.id));
                setSelectedEvent(prev => prev?.id === event.id ? null : prev);
            }
            if (type === 'RESCHEDULE') {
                setEvents(prev => prev.map(ev => ev.id === event.id ? mapEvent(event) : ev));
            }
        };

        evtSource.onerror = () => {
            console.warn('[SSE Calendar] Conexión interrumpida — reintentando automáticamente...');
        };

        // 3. Cargar tareas de studio
        fetch(`${'' || ''}/api/studio/tasks`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(r => r.json())
        .then(data => {
            if (data.success && data.tasks) {
                const mapped = data.tasks.map(t => ({
                    id: t.id,
                    que: t.title,
                    para: t.assigned_to,
                    referencias: t.prompt,
                    deadline: t.ig_publish_date ? new Date(t.ig_publish_date).toISOString().split('T')[0] : (t.created_at ? new Date(t.created_at).toISOString().split('T')[0] : '2026-12-31'),
                    done: t.status === 'approved',
                    asignadoPor: 'Admin',
                    createdAt: t.created_at,
                    audience: (typeof t.tags === 'string' ? JSON.parse(t.tags) : t.tags)?.join(', ') || 'Marketing',
                    priority: t.priority,
                    contentType: t.content_type || 'Backlog',
                    status: t.status,
                    mediaPayload: typeof t.media_payload === 'string' ? JSON.parse(t.media_payload) : t.media_payload
                }));
                setTasks(mapped.length === 0 ? [
                    { id: 9991, que: 'Crear endpoint S3', para: 'Dani', referencias: '/api/media/upload', deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0], done: false, asignadoPor: 'JareG', createdAt: new Date().toISOString(), audience: 'Product', priority: 'Medium', contentType: 'Launch' }
                ] : mapped);
            }
        }).catch(err => console.error('Error fetching tasks:', err));

        // 4. Notificación demo
        setNotifications([
            { id: 1, to: currentUser, from: 'Sistema', text: `@${currentUser} calendario sincronizado en tiempo real.`, read: false, time: 'ahora', eventTitle: 'Sistema' }
        ]);

        // 5. Citas si es admin
        if (canAssign(adminProfile)) {
            setLoadingCitas(true);
            const API_URL = '';
            fetch(`${API_URL}/api/citas`)
                .then(r => r.json())
                .then(data => {
                    const today = new Date();
                    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
                    const citaEvents = (data.citas || data || []).map(c => ({
                        id: `cita-${c.id}`,
                        title: `📅 ${c.nombre_completo || c.nombre} — ${c.tipo_sesion || 'Consultoría'}`,
                        start: new Date(`${c.fecha}T${c.hora || '10:00'}`),
                        end: new Date(`${c.fecha}T${c.hora || '10:00'}`),
                        status: c.status === 'confirmada' ? 'success' : 'warning',
                        tipo: 'cita',
                        raw: c
                    }));
                    setCitas(citaEvents);
                })
                .catch(() => {
                    const today = new Date();
                    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
                    setCitas([
                        { id: 'cita-1', title: '📅 Carlos Mendez — CRM', start: today, end: today, status: 'success', tipo: 'cita', raw: { email: 'carlos@demo.com', telefono: '664-000-0001', notas_adicionales: 'Interesado en plan B2B' } },
                        { id: 'cita-2', title: '📅 Ana Torres — SEO', start: tomorrow, end: tomorrow, status: 'warning', tipo: 'cita', raw: { email: 'ana@demo.com', telefono: '664-000-0002', notas_adicionales: 'Quiere auditoría SEO completa' } },
                    ]);
                })
                .finally(() => setLoadingCitas(false));
        }

        return () => evtSource.close(); // Cleanup SSE al desmontar
    }, []);

    // ═══════════════════════════════════════════════════════════════════════
    // GOOGLE SHEETS IMPORTER
    // ═══════════════════════════════════════════════════════════════════════
    const extractSpreadsheetId = (urlOrId) => {
        // Si ya es un ID (sin slashes), devolverlo directo
        if (!urlOrId.includes('/')) return urlOrId.trim();
        // Extraer de URL: https://docs.google.com/spreadsheets/d/ID/edit
        const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
        return match ? match[1] : urlOrId.trim();
    };

    const fetchSheetsPreview = async () => {
        if (!sheetsUrl.trim()) return;
        setSheetsLoading(true);
        setSheetsError('');
        setSheetsPreview(null);
        try {
            const spreadsheetId = extractSpreadsheetId(sheetsUrl);
            const API = getAPI();
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API}/api/sheets/import?spreadsheetId=${encodeURIComponent(spreadsheetId)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Error desconocido');
            setSheetsPreview(data);
        } catch (e) {
            setSheetsError(e.message);
        }
        setSheetsLoading(false);
    };

    const confirmSheetsImport = async () => {
        if (!sheetsPreview?.events?.length) return;
        setSheetsImporting(true);
        const API = getAPI();
        const token = localStorage.getItem('adminToken');
        let imported = 0;
        for (const ev of sheetsPreview.events) {
            try {
                const res = await fetch(`${API}/api/calendar/events`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    // Forzar empresa seleccionada + calendario de contenido
                    body: JSON.stringify({ ...ev, empresa: sheetsEmpresa, calendario: 'contenido' })
                });
                const data = await res.json();
                if (data.success) imported++;
            } catch (_) {}
        }
        setSheetsImporting(false);
        setShowSheetsModal(false);
        setSheetsPreview(null);
        setSheetsUrl('');
        // Cambiar tab al calendario de contenido si no estamos ahí
        setCalendarTab('contenido');
        alert(`✅ ${imported} publicaciones importadas al Calendario de Contenido.`);
    };

    const loadBotConfig = async (platform) => {
        if (!platform || platform === 'ALL') { setBotConfig(null); return; }
        try {
            const API_URL = '';
            const res = await fetch(`${API_URL}/api/bots/config/${platform}`);
            const data = await res.json();
            setBotConfig(data.success && data.config ? data.config : { plataforma: platform, keywords: '', comment_template: '', dm_system_prompt: '' });
        } catch (e) { console.error('Error fetching bot config:', e); }
    };

    const saveBotConfig = async () => {
        if (!botConfig) return;
        setSavingBot(true);
        try {
            const API_URL = '';
            const res = await fetch(`${API_URL}/api/bots/config/${botConfig.plataforma}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(botConfig)
            });
            const data = await res.json();
            if (data.success) alert('¡Configuración guardada! El cerebro PM2 tomará estos cambios enseguida.');
        } catch (e) { console.error('Error saving bot config:', e); alert('Error al guardar configuración IA.'); }
        setSavingBot(false);
    };

    useEffect(() => { if (activePlatform !== 'ALL') loadBotConfig(activePlatform); }, [activePlatform]);



    // ═══════════════════════════════════════════════════════════════════════
    // COMENTARIOS & @MENCIONES (ahora persisten en DB)
    // ═══════════════════════════════════════════════════════════════════════
    const handleCommentChange = (e) => {
        const val = e.target.value;
        setCommentText(val);
        const cursor = e.target.selectionStart;
        const textUpToCursor = val.slice(0, cursor);
        const match = textUpToCursor.match(/@(\w*)$/);
        setMentionQuery(match ? match[1] : null);
    };

    const insertMention = (username) => {
        const cursor = commentInputRef.current.selectionStart;
        const before = commentText.slice(0, cursor);
        const after = commentText.slice(cursor);
        const newBefore = before.replace(/@\w*$/, `@${username} `);
        setCommentText(newBefore + after);
        setMentionQuery(null);
        commentInputRef.current.focus();
    };

    const submitComment = async () => {
        if (!commentText.trim() || !selectedEvent) return;

        const API = getAPI();
        const token = localStorage.getItem('adminToken');

        try {
            // Persistir en DB — el SSE notificará a todos los demás usuarios
            const res = await fetch(`${API}/api/calendar/events/${selectedEvent.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ text: commentText })
            });
            const data = await res.json();

            if (data.success) {
                // El SSE actualiza el evento para todos; actualización optimista local
                const newComment = data.comment;
                setSelectedEvent(prev => ({ ...prev, comments: [...(prev.comments || []), newComment] }));
                setEvents(prev => prev.map(ev => ev.id === selectedEvent.id
                    ? { ...ev, comments: [...(ev.comments || []), newComment] }
                    : ev
                ));
            }
        } catch (e) {
            // Fallback: solo actualización local
            const newComment = { id: Date.now(), author: currentUser, text: commentText, time: 'ahora' };
            setSelectedEvent(prev => ({ ...prev, comments: [...(prev.comments || []), newComment] }));
        }

        // Notificaciones de @menciones
        const mentioned = TEAM.filter(u => commentText.toLowerCase().includes(`@${u.toLowerCase()}`));
        if (mentioned.length > 0) {
            const newNotifs = mentioned.map(u => ({
                id: Date.now() + Math.random(), to: u, from: currentUser,
                text: commentText, read: false, time: 'ahora', eventTitle: selectedEvent.title
            }));
            setNotifications(prev => [...newNotifs, ...prev]);
        }

        setCommentText('');
        setMentionQuery(null);
    };

    // ═══════════════════════════════════════════════════════════════════════
    // ENVÍO A REDES (sin cambios)
    // ═══════════════════════════════════════════════════════════════════════
    const [networkSelections, setNetworkSelections] = useState({});

    const toggleNetwork = (taskId, network) => {
        setNetworkSelections(prev => {
            const current = prev[taskId] || { facebook: true, instagram: true, tiktok: true };
            return { ...prev, [taskId]: { ...current, [network]: !current[network] } };
        });
    };

    const handleSendToNetworks = async (task) => {
        const selection = networkSelections[task.id] || { facebook: true, instagram: true, tiktok: true };
        const selectedNetworks = Object.keys(selection).filter(k => selection[k]);
        if (selectedNetworks.length === 0) return alert('Selecciona al menos una red');
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${'' || ''}/api/studio/tasks/${task.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: 'queued', publish_targets: selectedNetworks })
            });
            const data = await res.json();
            if (data.success) {
                alert(`¡Éxito! La tarea ha sido enviada a: ${selectedNetworks.join(', ').toUpperCase()}`);
                setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'queued', done: true } : t));
            } else { throw new Error(data.message || 'Error API'); }
        } catch (e) { alert('Fallo al mandar a redes: ' + e.message); }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // DRAG AND DROP — persiste en DB
    // ═══════════════════════════════════════════════════════════════════════
    const handleDragStart = (eventId) => setDraggingEventId(eventId);

    const handleDragOver = (e, dayKey) => {
        e.preventDefault();
        setDragOverDay(dayKey);
    };

    const handleDrop = async (e, targetDate) => {
        e.preventDefault();
        setDragOverDay(null);
        if (!draggingEventId || !canCreate) { setDraggingEventId(null); return; }

        const API = getAPI();
        const token = localStorage.getItem('adminToken');

        // Actualización optimista inmediata
        const newDate = new Date(targetDate);
        newDate.setHours(12, 0, 0, 0);
        setEvents(prev => prev.map(ev =>
            ev.id === draggingEventId ? { ...ev, start: newDate, end: newDate, is_rescheduled: true } : ev
        ));

        try {
            await fetch(`${API}/api/calendar/events/${draggingEventId}/reschedule`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ start_date: newDate.toISOString(), end_date: newDate.toISOString() })
            });
            // El SSE notificará el cambio a todos los demás automáticamente
        } catch (err) {
            console.error('[DnD] Error al reprogramar:', err);
            // Revertir si falla
            const original = events.find(ev => ev.id === draggingEventId);
            if (original) setEvents(prev => prev.map(ev => ev.id === draggingEventId ? original : ev));
        }

        setDraggingEventId(null);
    };

    // ═══════════════════════════════════════════════════════════════════════
    // CREAR CAMPAÑA — ahora persiste en DB y notifica en tiempo real
    // ═══════════════════════════════════════════════════════════════════════
    const handleCreateCampaign = async () => {
        if (!newCampaign.empresa || !newCampaign.asignado || !newCampaign.titulo || !newCampaign.fecha || !newCampaign.briefing) {
            alert('Por favor completa todos los campos obligatorios (*)');
            return;
        }

        setSavingCampaign(true);
        const API = getAPI();
        const token = localStorage.getItem('adminToken');

        const platformPrefix = newCampaign.plataforma === 'tiktok' ? '⚫ TK' :
                               newCampaign.plataforma === 'instagram' ? '🟣 IG' :
                               newCampaign.plataforma === 'facebook' ? '🔵 FB' : '🌐 Multi';

        try {
            const res = await fetch(`${API}/api/calendar/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    title: `${platformPrefix}: ${newCampaign.titulo}`,
                    platform: newCampaign.plataforma === 'ALL' ? 'ALL' : newCampaign.plataforma,
                    status: 'warning',
                    caption: newCampaign.briefing,
                    media_url: newCampaign.urlFoto || newCampaign.urlVideo || '',
                    provider: newCampaign.empresa,
                    start_date: `${newCampaign.fecha}T12:00:00`,
                    end_date: `${newCampaign.fecha}T12:00:00`,
                    empresa: newCampaign.empresa,
                    assigned_to: newCampaign.asignado
                })
            });
            const data = await res.json();

            if (data.success) {
                // El SSE notificará a todos; añadir optimisticamente al estado local también
                setEvents(prev => {
                    const exists = prev.some(ev => ev.id === data.event.id);
                    return exists ? prev : [mapEvent(data.event), ...prev];
                });

                // Notificar al asignado
                setNotifications(prev => [{
                    id: Date.now() + 1, to: newCampaign.asignado, from: currentUser,
                    text: `@${newCampaign.asignado} te han asignado una nueva campaña: "${newCampaign.titulo}"`,
                    read: false, time: 'ahora', eventTitle: `${platformPrefix}: ${newCampaign.titulo}`
                }, ...prev]);

                setNewCampaign({ empresa: 'godzilla', calendario: 'contenido', asignado: '', titulo: '', fecha: '', plataforma: 'ALL', briefing: '', urlFoto: '', urlVideo: '', urlReferencia: '' });
                setShowNewCampaignModal(false);
            } else {
                alert('Error al crear campaña: ' + (data.error || 'Error desconocido'));
            }
        } catch (err) {
            console.error('[Calendar] Error creando campaña:', err);
            alert('Error de conexión al crear campaña.');
        }
        setSavingCampaign(false);
    };

    const handleDeleteEvent = async (eventId, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm('¿Estás seguro de que quieres eliminar este elemento de forma permanente?')) return;
        
        const API = getAPI();
        const token = localStorage.getItem('adminToken');
        const isIA = typeof eventId === 'string' && eventId.startsWith('ia-');
        const isTask = typeof eventId === 'string' && eventId.startsWith('task-');
        
        try {
            if (isIA || isTask) {
                const realId = eventId.replace('ia-', '').replace('task-', '');
                const res = await fetch(`${API}/api/studio/tasks/${realId}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    setTasks(prev => prev.filter(t => t.id != realId));
                } else {
                    const data = await res.json();
                    alert('Error eliminando tarea: ' + (data.error || 'No tienes permisos'));
                }
            } else {
                const res = await fetch(`${API}/api/calendar/events/${eventId}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    setEvents(prev => prev.filter(ev => ev.id !== eventId));
                } else {
                    const data = await res.json();
                    alert('Error eliminando evento: ' + (data.error || 'No tienes permisos'));
                }
            }
        } catch (err) {
            alert('Error de conexión al eliminar.');
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // UPLOAD DE MEDIA EN TAREAS
    // ═══════════════════════════════════════════════════════════════════════
    const handleUploadTaskImage = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploadingMedia(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const token = localStorage.getItem('adminToken');
            const API = getAPI(); // ← usa el helper consistente del componente
            const isVideo = file.type.startsWith('video/');
            const endpoint = isVideo ? `${API}/api/media/upload-video` : `${API}/api/media/upload`;
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                const addedUrl = data.url; // relativa: /api/media/file/{id} o /api/media/assets/{file}
                const newRef = newTask.referencias ? `${newTask.referencias}\n${addedUrl}` : addedUrl;
                setNewTask({ ...newTask, referencias: newRef });
            } else { alert('Error subiendo media: ' + (data.error || 'Server error')); }
        } catch (err) { alert('Falló la subida (Conexión)'); }
        setIsUploadingMedia(false);
    };


    // ═══════════════════════════════════════════════════════════════════════
    // DATOS DERIVADOS
    // ═══════════════════════════════════════════════════════════════════════
    const filteredEvents = activePlatform === 'ALL'
        ? events
        : events.filter(e => e.platform === activePlatform);

    // Counts para badges de filtro
    const platformCounts = {
        ALL: events.length,
        facebook: events.filter(e => e.platform === 'facebook').length,
        instagram: events.filter(e => e.platform === 'instagram').length,
        tiktok: events.filter(e => e.platform === 'tiktok').length,
    };

    const pendingTaskEvents = tasks.filter(t => !t.done).map(t => ({
        id: `task-${t.id}`,
        title: `✅ ${t.para}: ${t.que.substring(0, 35)}...`,
        start: new Date(t.deadline + 'T00:00'),
        end: new Date(t.deadline + 'T00:00'),
        status: 'warning', tipo: 'pendiente', raw: t
    }));

    const aiContentEvents = tasks.filter(t => t.mediaPayload && (Array.isArray(t.mediaPayload) ? t.mediaPayload.length > 0 : Object.keys(t.mediaPayload).length > 0)).map(t => {
        let deadlineStr = t.deadline || new Date().toISOString().split('T')[0];
        if (!deadlineStr.includes('T')) deadlineStr += 'T12:00:00';

        let media_url = '';
        if (Array.isArray(t.mediaPayload) && t.mediaPayload.length > 0) {
            media_url = t.mediaPayload[0].url || t.mediaPayload[0];
        } else if (t.mediaPayload && t.mediaPayload.url) {
            media_url = t.mediaPayload.url;
        } else if (typeof t.mediaPayload === 'string') {
            media_url = t.mediaPayload;
        }

        return {
            id: `ia-${t.id}`,
            title: `🤖 ${t.que || '(Sin título)'}`,
            start: new Date(deadlineStr),
            end: new Date(deadlineStr),
            status: t.status === 'published' ? 'published' : t.status === 'approved' ? 'approved' : 'queued',
            tipo: 'contenido_ia',
            platform: 'instagram', // Render as instagram for preview
            media_url: media_url,
            caption: t.referencias || t.que || '',
            raw: t
        };
    });

    const calendarEventsMap = {
        contenido: filteredEvents,
        contenido_ia: aiContentEvents,
        citas: citas,
        pendientes: pendingTaskEvents,
        aprobadas: tasks.filter(t => t.status === 'approved'),
        todos: [...filteredEvents, ...citas, ...pendingTaskEvents, ...aiContentEvents]
    };

    const myFilteredTasks = tasks.filter(t =>
        t.para?.toLowerCase() === currentUser.toLowerCase() || currentUser.toLowerCase() === 'godzilla_admin'
    );
    const pendingTasks = myFilteredTasks.filter(t => !t.done);
    const doneTasks = myFilteredTasks.filter(t => t.done);

    // ═══════════════════════════════════════════════════════════════════════
    // GENERADOR DE GRID MENSUAL CUSTOM (Asana-style)
    // ═══════════════════════════════════════════════════════════════════════
    const generateMonthDays = useCallback((date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const startDay = startOfWeek(firstDay, { weekStartsOn: 1 }); // Lunes
        const days = [];
        let cursor = new Date(startDay);
        for (let i = 0; i < 35; i++) {
            days.push(new Date(cursor));
            cursor.setDate(cursor.getDate() + 1);
        }
        // Extender a 42 si el mes lo necesita
        while (cursor.getMonth() === month || days.length % 7 !== 0) {
            days.push(new Date(cursor));
            cursor.setDate(cursor.getDate() + 1);
            if (days.length >= 42) break;
        }
        return days;
    }, []);

    const generateWeekDays = useCallback((date) => {
        const startDay = startOfWeek(date, { weekStartsOn: 1 }); // Lunes
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startDay);
            d.setDate(d.getDate() + i);
            days.push(d);
        }
        return days;
    }, []);

    const monthDays = generateMonthDays(currentDate);
    const weekDays = generateWeekDays(currentDate);
    const activeDays = calendarView === 'week' ? weekDays : monthDays;
    
    const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    // Agrupar eventos por día para el grid
    const eventsByDay = useCallback(() => {
        const map = {};
        const eventsToShow = calendarEventsMap[calendarTab] || calendarEventsMap['todos'];

        eventsToShow.forEach(ev => {
            const d = ev.start instanceof Date ? ev.start : new Date(ev.start);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            if (!map[key]) map[key] = [];
            map[key].push(ev);
        });
        return map;
    }, [filteredEvents, citas, pendingTaskEvents, aiContentEvents, calendarTab]);

    const dayEventsMap = eventsByDay();

    // ═══════════════════════════════════════════════════════════════════════
    // ESTILOS DEL CALENDAR RBC (para tabs que siguen usándolo)
    // ═══════════════════════════════════════════════════════════════════════
    const eventStyleGetter = (event) => {
        let backgroundColor = '#333333'; let border = '1px solid #111111';
        if (event.status === 'urgent') { backgroundColor = '#CC0000'; border = '1px solid #ff4444'; }
        else if (event.status === 'warning') { backgroundColor = '#d97706'; border = '1px solid #f59e0b'; }
        else if (event.status === 'success' || event.status === 'approved') { backgroundColor = '#15803d'; border = '1px solid #22c55e'; }
        else if (event.status === 'published') { backgroundColor = '#2563eb'; border = '1px solid #3b82f6'; }
        else if (event.tipo === 'contenido_ia') { backgroundColor = '#9333ea'; border = '1px solid #c084fc'; }
        return { style: { backgroundColor, border, borderRadius: '8px', opacity: 0.9, color: 'white', borderLeft: '4px solid white', display: 'block', fontWeight: 'bold', fontSize: '11px', padding: '2px 5px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' } };
    };

    const hackerCalendarStyles = `
      .rbc-calendar { font-family: 'Inter', sans-serif; min-height: 50vh; }
      .rbc-month-view, .rbc-time-view, .rbc-agenda-view { border-color: #333; background: #0a0a0a; border-radius: 12px; overflow: hidden; }
      .rbc-header { padding: 10px 0; border-bottom: 1px solid #333 !important; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #888; }
      .rbc-header + .rbc-header { border-left: 1px solid #333 !important; }
      .rbc-day-bg { border-left: 1px solid #222 !important; }
      .rbc-month-row + .rbc-month-row { border-top: 1px solid #222 !important; }
      .rbc-off-range-bg { background-color: #050505; }
      .rbc-today { background-color: rgba(0,255,136,0.04); border: 1px solid rgba(0,255,136,0.2) !important; }
      .rbc-date-cell { padding: 5px; font-weight: bold; color: #aaa; }
      .rbc-btn-group button { background: #111; color: #fff; border: 1px solid #333; padding: 5px 15px; font-weight: bold; transition: 0.3s; }
      .rbc-btn-group button:hover { background: #333; }
      .rbc-btn-group button.rbc-active { background: #CC0000; border-color: #CC0000; box-shadow: none; }
      .rbc-toolbar-label { color: white; font-weight: 900; font-size: 1.2rem; text-transform: uppercase; letter-spacing: 2px; }
    `;

    // ═══════════════════════════════════════════════════════════════════════
    // RENDERIZADORES
    // ═══════════════════════════════════════════════════════════════════════

    // ─── Neuron Card (el corazón del nuevo diseño) ─────────────────────────
    const renderNeuronCard = (event) => {
        const pm = PLATFORM_META[event.platform] || PLATFORM_META.ALL;
        const sm = STATUS_META[event.status] || STATUS_META.warning;
        const isDragging = draggingEventId === event.id;

        return (
            <div
                key={event.id}
                draggable={canCreate}
                onDragStart={() => handleDragStart(event.id)}
                onDragEnd={() => { setDraggingEventId(null); setDragOverDay(null); }}
                onClick={() => { setSelectedEvent(event); setCommentText(''); setMentionQuery(null); }}
                className={`
                    group relative cursor-pointer rounded-xl overflow-hidden border transition-all duration-200
                    ${sm.bg} ${sm.border}
                    ${isDragging ? 'opacity-40 scale-95' : 'hover:-translate-y-0.5 hover:scale-[1.02]'}
                `}
                style={{ boxShadow: isDragging ? 'none' : sm.glow }}
            >
                {/* Thumbnail */}
                {event.media_url && (
                    <div className="relative h-16 bg-black overflow-hidden">
                        <img
                            src={resolveMedia(event.media_url)}
                            alt=""
                            className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                            onError={e => { e.target.style.display = 'none'; }}
                        />
                        {/* Glass overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        {/* Platform badge */}
                        <div
                            className="absolute top-1 left-1 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider backdrop-blur-md border"
                            style={{ background: `${pm.color}25`, borderColor: `${pm.color}60`, color: pm.color }}
                        >
                            <span>{pm.icon}</span> {pm.label}
                        </div>
                        {/* Rescheduled badge */}
                        {event.is_rescheduled && (
                            <div className="absolute top-1 right-1 bg-amber-500/80 text-black text-[8px] font-black px-1 rounded">
                                ⟳ Moved
                            </div>
                        )}
                        {/* Delete badge/button (absolute) */}
                        {canCreate && (
                            <button
                                onClick={(e) => handleDeleteEvent(event.id, e)}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-600/90 hover:bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow z-10 transition-opacity"
                            >
                                🗑️
                            </button>
                        )}
                        {/* Sheets badge */}
                        {event.provider === 'sheets_import' && (
                            <div className="absolute bottom-1 right-1 bg-green-500/80 text-black text-[8px] font-black px-1 rounded">
                                📊 Sheets
                            </div>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="px-2 py-1.5">
                    {/* Without media: show platform inline */}
                    {!event.media_url && (
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1">
                                <span className="text-[10px]">{pm.icon}</span>
                                <span className="text-[8px] font-black uppercase tracking-wider"
                                      style={{ color: pm.color }}>
                                    {pm.label}
                                </span>
                            </div>
                            <div className="flex gap-1 items-center">
                                {event.provider === 'sheets_import' && (
                                    <span className="text-[8px] bg-green-500/20 text-green-400 font-black px-1 rounded">📊</span>
                                )}
                                {canCreate && (
                                    <button onClick={(e) => handleDeleteEvent(event.id, e)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-opacity ml-1 z-10 p-0.5 rounded bg-red-900/20">
                                        🗑️
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <p className={`text-[10px] font-bold leading-tight truncate ${sm.text}`}>
                        {event.title?.replace(/^[🔵🟣⚫🌐]\s*\w+:\s*/u, '')}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-[8px] text-neutral-600 truncate max-w-[60%]">
                            {event.provider || event.assigned_to || ''}
                        </span>
                        {(event.comments?.length > 0) && (
                            <span className="text-[8px] text-neutral-600 flex items-center gap-0.5">
                                💬 {event.comments.length}
                            </span>
                        )}
                    </div>

                    {/* Botón Generar en Studio — visible solo al hover */}
                    {canCreate && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate('/studio', {
                                    state: {
                                        prompt: event.caption || event.title,
                                        platform: event.platform,
                                        eventTitle: event.title,
                                        empresa: event.empresa
                                    }
                                });
                            }}
                            className="mt-1.5 w-full opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black bg-[#CC0000]/80 hover:bg-[#CC0000] text-white py-1 rounded flex items-center justify-center gap-1"
                        >
                            ✨ Generar en Studio
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // ─── GRID MENSUAL ASANA-STYLE ──────────────────────────────────────────
    const renderMonthGrid = () => {
        const today = new Date();
        const isToday = (d) =>
            d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
        const isCurrentMonth = (d) => d.getMonth() === currentDate.getMonth();

        return (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '600px' }}>
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-white/5 shrink-0">
                    {DAY_NAMES.map(d => (
                        <div key={d} className="py-2 text-center text-[10px] font-black uppercase tracking-widest text-neutral-600">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Weeks */}
                <div className="grid grid-cols-7 flex-1" style={{ gridTemplateRows: `repeat(${activeDays.length / 7}, minmax(${calendarView === 'week' ? '400px' : '120px'}, 1fr))` }}>
                    {activeDays.map((day, idx) => {
                        const dayKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
                        const dayEvents = dayEventsMap[dayKey] || [];
                        const todayDay = isToday(day);
                        const currentMonth = isCurrentMonth(day);
                        const isDragOver = dragOverDay === dayKey;

                        return (
                            <div
                                key={idx}
                                onDragOver={(e) => handleDragOver(e, dayKey)}
                                onDrop={(e) => {
                                    const targetDate = new Date(day);
                                    handleDrop(e, targetDate);
                                }}
                                className={`
                                    relative border-b border-r border-white/[0.04] p-1.5 flex flex-col gap-1 transition-all duration-150 group/day
                                    ${currentMonth || calendarView === 'week' ? 'bg-transparent' : 'bg-black/20'}
                                    ${todayDay ? 'ring-1 ring-inset ring-[#00ff88]/30' : ''}
                                    ${isDragOver ? 'bg-[#00ff88]/5 ring-1 ring-inset ring-[#00ff88]/50' : ''}
                                `}
                            >
                                {/* Date number */}
                                <div className="flex items-center justify-between shrink-0">
                                    <span className={`
                                        text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full transition-colors
                                        ${todayDay
                                            ? 'bg-[#00ff88] text-black shadow-[0_0_12px_rgba(0,255,136,0.6)]'
                                            : currentMonth
                                                ? 'text-neutral-400 hover:text-white'
                                                : 'text-neutral-700'
                                        }
                                    `}>
                                        {day.getDate()}
                                    </span>

                                    {/* Add event button (hover) */}
                                    {canCreate && currentMonth && (
                                        <button
                                            onClick={() => {
                                                setNewCampaign(prev => ({ ...prev, fecha: day.toISOString().split('T')[0] }));
                                                setShowNewCampaignModal(true);
                                            }}
                                            className="opacity-0 group-hover/day:opacity-100 w-4 h-4 rounded-full bg-white/10 hover:bg-[#CC0000] text-white text-[10px] flex items-center justify-center transition-all"
                                        >
                                            +
                                        </button>
                                    )}
                                </div>

                                {/* Events */}
                                <div className="flex flex-col gap-1 overflow-hidden flex-1">
                                    {dayEvents.slice(0, calendarView === 'week' ? 12 : 3).map(ev => renderNeuronCard(ev))}
                                    {dayEvents.length > (calendarView === 'week' ? 12 : 3) && (
                                        <button
                                            className="text-[8px] text-neutral-600 hover:text-white font-bold text-left px-1 transition-colors"
                                            onClick={() => {/* TODO: expandir día */}}
                                        >
                                            +{dayEvents.length - (calendarView === 'week' ? 12 : 3)} más
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ─── Mockup de red social ──────────────────────────────────────────────
    const renderSocialMockup = (event) => (
        <div className="bg-white rounded-xl overflow-hidden shadow-xl text-black font-sans border border-white/20">
            {event.platform === 'instagram' && (
                <div>
                    <div className="flex items-center gap-3 p-3 border-b border-gray-100">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-[2px]">
                            <div className="w-full h-full rounded-full bg-white border-2 border-white overflow-hidden"><img src="/logo192.png" alt="Godzilla" className="w-full h-full object-cover bg-black" /></div>
                        </div>
                        <p className="font-bold text-sm">godzillaconsulting</p>
                    </div>
                    {event.media_url && <img src={resolveMedia(event.media_url)} className="w-full aspect-square object-cover" alt="post" />}
                    <div className="p-3">
                        <div className="flex gap-4 mb-2"><span className="text-xl">❤️</span><span className="text-xl">💬</span><span className="text-xl">↗️</span></div>
                        <p className="font-bold text-sm mb-1">1,234 Me gusta</p>
                        <p className="text-sm"><span className="font-bold mr-1">godzillaconsulting</span><span className="text-gray-700">{event.caption?.substring(0, 60)}...</span></p>
                    </div>
                </div>
            )}
            {event.platform === 'facebook' && (
                <div>
                    <div className="flex items-center gap-3 p-3">
                        <div className="w-10 h-10 rounded-full bg-black overflow-hidden relative"><img src="/logo192.png" alt="Godzilla" className="w-full h-full object-cover absolute top-0 left-0" /></div>
                        <div><p className="font-bold text-[15px] leading-tight">Godzilla Consulting</p><p className="text-xs text-gray-500">Publicado • Hace 2 min • 🌎</p></div>
                    </div>
                    <div className="px-3 pb-3 text-[14px] text-gray-800"><p className="whitespace-pre-wrap line-clamp-3">{event.caption}</p></div>
                    {event.media_url && <img src={resolveMedia(event.media_url)} className="w-full h-52 object-cover" alt="post" />}
                    <div className="p-3 border-t border-gray-200 flex justify-between text-gray-500 text-sm font-semibold"><span>👍 Me gusta</span><span>💬 Comentar</span><span>↪️ Compartir</span></div>
                </div>
            )}
            {event.platform === 'tiktok' && (
                <div className="relative bg-black text-white h-[350px] flex items-center justify-center overflow-hidden">
                    {event.media_url && <img src={resolveMedia(event.media_url)} className="absolute inset-0 w-full h-full object-cover opacity-90" alt="post" />}
                    <div className="absolute right-2 bottom-12 flex flex-col items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white border-2 border-white overflow-hidden shadow-lg"><img src="/logo192.png" className="w-full h-full object-cover bg-black" alt="logo" /></div>
                        <div className="flex flex-col items-center"><span className="text-3xl drop-shadow-md">❤️</span><span className="text-xs font-bold drop-shadow-md">124K</span></div>
                    </div>
                    <div className="absolute bottom-4 left-4 right-16">
                        <p className="font-bold text-sm drop-shadow-md">@godzillaconsulting</p>
                        <p className="text-xs mt-1 line-clamp-2 drop-shadow-md leading-tight">{event.caption}</p>
                    </div>
                </div>
            )}
        </div>
    );

    // ─── SIDEBAR ──────────────────────────────────────────────────────────
    const renderSidebar = () => {

        return (
            <div className="w-[300px] border-l border-white/10 bg-black/40 backdrop-blur-2xl flex flex-col">
                <div className="p-5 border-b border-red-900/50 bg-gradient-to-r from-[#CC0000]/10 to-transparent">
                    <h3 className="text-[#CC0000] font-black uppercase text-sm tracking-widest">🔔 Mis Tareas</h3>
                    <p className="text-xs text-red-500/70 font-bold">Asignadas por CM / Dirección</p>
                </div>
                <div className="flex border-b border-white/10">
                    {[['pendientes', 'Por Realizar'], ['realizadas', 'Realizadas'], ['aprobadas', 'Listas']].map(([key, label]) => (
                        <button key={key} onClick={() => setTaskView(key)}
                            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors ${taskView === key ? 'text-[#CC0000] border-b-2 border-[#CC0000]' : 'text-neutral-600 hover:text-neutral-400'}`}>
                            {label}
                        </button>
                    ))}
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                    {taskView === 'pendientes' && (
                        pendingTasks.length === 0
                            ? <p className="text-neutral-600 text-xs font-bold text-center py-8">✅ Sin tareas pendientes</p>
                            : pendingTasks.map(task => (
                                <div key={task.id} className="bg-black/30 border border-red-900/40 hover:border-red-500/60 p-4 rounded-xl transition-colors">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <p className="text-xs font-black text-white leading-snug">{task.que}</p>
                                        <button onClick={(e) => handleDeleteEvent('task-' + task.id, e)}
                                            className="shrink-0 w-6 h-6 rounded-full border-2 border-neutral-700 hover:border-red-500 hover:bg-red-500/20 transition-all flex items-center justify-center text-neutral-500 hover:text-red-400">
                                            <span className="text-[10px]">✕</span>
                                        </button>
                                    </div>
                                    <div className="space-y-1 mt-2 border-t border-white/5 pt-2">
                                        <p className="text-[10px] text-neutral-500 font-bold">📎 Ref: <span className="text-neutral-400">{task.referencias}</span></p>
                                        <p className="text-[10px] text-neutral-500 font-bold">📅 Para: <span className="text-yellow-400">{task.deadline}</span></p>
                                        <p className="text-[10px] text-neutral-500 font-bold">👤 Asignó: <span className="text-[#CC0000]">{task.asignadoPor}</span></p>
                                    </div>
                                    <button onClick={() => navigate('/studio')} className="mt-3 w-full text-[10px] bg-black/60 border border-neutral-700 text-[#CC0000] px-3 py-1.5 rounded-lg font-black hover:bg-[#CC0000] hover:text-white transition-all">Ir al Estudio ➔</button>
                                </div>
                            ))
                    )}
                    {taskView === 'realizadas' && (
                        doneTasks.length === 0
                            ? <p className="text-neutral-600 text-xs font-bold text-center py-8">Aún no hay tareas completadas</p>
                            : doneTasks.map(task => (
                                <div key={task.id} className="bg-green-950/10 border border-green-900/30 p-4 rounded-xl opacity-70">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-green-500 text-sm">✅</span>
                                        <p className="text-xs font-bold text-neutral-400 line-through">{task.que}</p>
                                    </div>
                                    <p className="text-[10px] text-neutral-600 font-bold">Asignó: {task.asignadoPor}</p>
                                </div>
                            ))
                    )}
                    {taskView === 'aprobadas' && (
                        tasks.filter(t => t.status === 'approved').length === 0
                            ? <p className="text-neutral-600 text-xs font-bold text-center py-8">Aún no hay contenido listo</p>
                            : tasks.filter(t => t.status === 'approved').map(task => {
                                const mediaUrl = task.mediaPayload?.[0]?.url || task.mediaPayload?.url;
                                const isVideo = task.mediaPayload?.[0]?.isVideo || (mediaUrl && mediaUrl.includes('.mp4'));
                                return (
                                    <div key={task.id} className="group bg-yellow-950/20 border border-yellow-500/30 hover:border-yellow-500/60 p-4 rounded-xl transition-colors cursor-pointer relative overflow-hidden" onClick={() => { setSelectedPublishTask(task); setShowPublishModal(true); setPublishNetwork('instagram'); }}>
                                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-yellow-500/0 via-yellow-400 to-yellow-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="flex gap-3 mb-2">
                                            <div className="w-12 h-12 bg-black rounded shrink-0 overflow-hidden relative">
                                                {mediaUrl ? (isVideo ? <video src={resolveMedia(mediaUrl)} className="w-full h-full object-cover" /> : <img src={resolveMedia(mediaUrl)} className="w-full h-full object-cover" />) : <span className="text-lg absolute inset-0 flex items-center justify-center">📷</span>}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-white line-clamp-2">{task.caption || task.que}</p>
                                                <p className="text-[9px] text-yellow-500 font-black uppercase mt-1">🌟 Aprobado</p>
                                            </div>
                                        </div>
                                        <button className="w-full bg-yellow-600/10 border border-yellow-600/30 text-yellow-500 text-[10px] font-black uppercase tracking-widest py-1.5 rounded transition-all mt-2 group-hover:bg-yellow-500 group-hover:text-black">Previsualizar</button>
                                    </div>
                                );
                            })
                    )}
                </div>
            </div>
        );
    };

    const handleDeleteTask = async (taskId) => {
        if(!window.confirm('¿Estás seguro de que deseas eliminar esta tarea permanentemente?')) return;
        
        try {
            const token = localStorage.getItem('adminToken');
            const API = import.meta.env.DEV ? 'http://localhost:3000' : '';
            const res = await fetch(`${API}/api/studio/tasks/${taskId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!data.success || !res.ok) throw new Error(data.error || data.message || `Error HTTP: ${res.status}`);
            
            setTasks(prev => prev.filter(t => t.id !== taskId));
            if (selectedTaskBoard?.id === taskId) setSelectedTaskBoard(null);
        } catch (error) {
            console.error('Error deleting task:', error);
            alert(`Error al eliminar la tarea en la base de datos: ${error.message}`);
        }
    };

    const handleApproveAIContent = async (eventId) => {
        try {
            const token = localStorage.getItem('adminToken');
            const API = import.meta.env.DEV ? 'http://localhost:3000' : '';
            const realId = String(eventId).replace('ia-', '').replace('task-', '');
            
            const res = await fetch(`${API}/api/studio/tasks/${realId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: 'approved' })
            });
            const data = await res.json();
            if (data.success || res.ok) {
                setTasks(prev => prev.map(t => t.id == realId ? { ...t, status: 'approved' } : t));
                setEvents(prev => prev.map(e => String(e.id).replace('ia-','').replace('task-','') == realId ? { ...e, status: 'approved' } : e));
                setSelectedEvent(prev => prev ? { ...prev, status: 'approved' } : prev);
                alert('Contenido aprobado y agendado correctamente.');
            } else {
                alert('Error al aprobar: ' + (data.message || data.error));
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error de conexión.');
        }
    };

    const handleRejectAIContent = async (eventId) => {
        try {
            const token = localStorage.getItem('adminToken');
            const API = import.meta.env.DEV ? 'http://localhost:3000' : '';
            const realId = String(eventId).replace('ia-', '').replace('task-', '');
            
            const res = await fetch(`${API}/api/studio/tasks/${realId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setTasks(prev => prev.filter(t => t.id != realId));
                setEvents(prev => prev.filter(e => String(e.id).replace('ia-','').replace('task-','') != realId));
                setSelectedEvent(null);
                alert('Contenido rechazado. La IA deberá rehacer la petición.');
            } else {
                const data = await res.json();
                alert('Error al rechazar: ' + (data.error || data.message));
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error de conexión.');
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER PRINCIPAL
    // ═══════════════════════════════════════════════════════════════════════
    return (
        <div
            className="h-full w-full bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(204,0,0,0.1),rgba(255,255,255,0))] relative flex overflow-hidden text-white"
            onClick={(e) => {
                // Clic fuera de dropdowns → cerrar
                if (!e.target.closest('[data-dropdown="notifications"]')) setShowNotifications(false);
                if (!e.target.closest('[data-dropdown="templates"]'))     setShowTemplateDropdown(false);
            }}
        >
            <style>{hackerCalendarStyles}</style>

            {/* Frutiger Aero orbs */}
            <div className="absolute top-[-15%] left-[20%] w-[40%] h-[40%] bg-[#00ff88]/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[10%] w-[30%] h-[30%] bg-[#0ea5e9]/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex-1 flex flex-col h-full overflow-hidden">

                {/* ── HEADER ── */}
                <div className="px-8 py-4 bg-black/60 backdrop-blur-xl border-b border-white/[0.06] shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-black text-white tracking-widest uppercase">
                                    {canCreate ? "Control de Emisión" : "Calendario de Campañas"}
                                </h2>
                                {/* Indicador de tiempo real */}
                                <div className="flex items-center gap-1.5 bg-[#00ff88]/10 border border-[#00ff88]/30 px-2.5 py-1 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse shadow-[0_0_6px_rgba(0,255,136,0.8)]" />
                                    <span className="text-[9px] font-black text-[#00ff88] uppercase tracking-widest">EN VIVO</span>
                                </div>
                            </div>
                            <p className="text-neutral-500 font-bold text-xs mt-0.5">
                                {canCreate ? `Gestión completa • ${currentUser}` : `Solo lectura y comentarios • ${currentUser}`}
                                {loadingEvents && <span className="ml-2 animate-pulse text-neutral-600">• Cargando...</span>}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Notificaciones */}
                            <div className="relative" data-dropdown="notifications">
                                <button onClick={() => { setShowNotifications(!showNotifications); setNotifications(prev => prev.map(n => n.to?.toLowerCase() === currentUser.toLowerCase() ? { ...n, read: true } : n)); }}
                                    className="relative w-10 h-10 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center hover:border-[#00ff88]/50 transition-colors backdrop-blur-sm">
                                    <span className="text-lg">🔔</span>
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#CC0000] rounded-full text-[10px] font-black flex items-center justify-center text-white animate-pulse shadow-[0_0_8px_rgba(204,0,0,0.8)]">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                                {showNotifications && (
                                    <div className="absolute right-0 top-12 w-80 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-50 overflow-hidden">
                                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                                            <h4 className="text-white font-black text-xs uppercase tracking-widest">Menciones & Alertas</h4>
                                            <button onClick={() => setShowNotifications(false)} className="text-neutral-500 hover:text-white text-lg font-black">×</button>
                                        </div>
                                        <div className="max-h-80 overflow-y-auto">
                                            {notifications.filter(n => n.to?.toLowerCase() === currentUser.toLowerCase()).length === 0
                                                ? <p className="text-neutral-600 text-xs font-bold text-center py-8">Sin notificaciones</p>
                                                : notifications.filter(n => n.to?.toLowerCase() === currentUser.toLowerCase()).map(n => (
                                                    <div key={n.id} className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${!n.read ? 'border-l-2 border-l-[#00ff88]' : ''}`}>
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-[#CC0000] font-black text-xs">{n.from}</span>
                                                            <span className="text-neutral-600 text-[10px]">{n.time}</span>
                                                        </div>
                                                        <p className="text-xs text-neutral-300 font-bold leading-snug">{renderMentions(n.text)}</p>
                                                        <p className="text-[10px] text-neutral-600 mt-1 font-bold">📅 En: {n.eventTitle}</p>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}
                            </div>

                            {canCreate && calendarTab !== 'pendientes' && (
                                <button onClick={() => setShowNewAssignModal(true)}
                                    className="px-4 py-2 bg-white/[0.05] backdrop-blur-sm border border-white/10 hover:border-[#CC0000]/40 text-[#CC0000] rounded-xl font-black text-xs transition-all uppercase tracking-widest">
                                    📋 Asignar Tarea
                                </button>
                            )}
                            {canEditSheetsAndAI && calendarTab !== 'pendientes' && (
                                <button
                                    onClick={() => { setShowSheetsModal(true); setSheetsPreview(null); setSheetsError(''); setSheetsUrl(''); }}
                                    className="px-4 py-2 bg-white/[0.05] backdrop-blur-sm border border-white/10 hover:border-green-500/50 text-green-400 rounded-xl font-black text-xs transition-all uppercase tracking-widest flex items-center gap-1.5">
                                    📊 Importar Sheets
                                </button>
                            )}
                            {canCreate && calendarTab !== 'pendientes' && (
                                <button onClick={() => setShowNewCampaignModal(true)}
                                    className="px-4 py-2 bg-gradient-to-r from-[#CC0000] to-red-800 hover:from-white hover:to-white hover:text-[#CC0000] text-white rounded-xl font-black text-xs transition-all shadow-[0_4px_15px_rgba(204,0,0,0.4)] uppercase tracking-widest flex items-center gap-1">
                                    ➕ Campaña
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-4">
                        {[
                            { id: 'contenido', label: '📣 Contenido', count: events.length },
                            { id: 'contenido_ia', label: '🤖 Contenido IA', count: tasks.filter(t => t.mediaPayload && t.mediaPayload.length > 0).length },
                            { id: 'citas', label: '📅 Citas', count: citas.length },
                            { id: 'pendientes', label: '✅ Tablero', count: tasks.filter(t => !t.done).length },
                            { id: 'todos', label: '🗺️ Todo', count: null },
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setCalendarTab(tab.id)}
                                className={`px-4 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 ${
                                    calendarTab === tab.id
                                        ? 'bg-[#CC0000] text-white shadow-[0_0_12px_rgba(204,0,0,0.4)]'
                                        : 'bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] text-neutral-500 hover:text-white hover:border-white/20'
                                }`}>
                                {tab.label}
                                {tab.count !== null && (
                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${calendarTab === tab.id ? 'bg-white/20' : 'bg-white/10'}`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Filtros + controles */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        {(calendarTab === 'contenido' || calendarTab === 'todos' || !canCreate) ? (
                            <div className="flex gap-2 flex-wrap">
                                {[
                                    { id: 'ALL', label: 'Todas', icon: '🌐' },
                                    { id: 'facebook', label: 'Facebook', icon: '🔵' },
                                    { id: 'instagram', label: 'Instagram', icon: '🟣' },
                                    { id: 'tiktok', label: 'TikTok', icon: '⚫' }
                                ].map(tab => (
                                    <button key={tab.id} onClick={() => setActivePlatform(tab.id)}
                                        className={`px-4 py-1.5 rounded-full font-black text-xs transition-all flex items-center gap-1.5 ${
                                            activePlatform === tab.id
                                                ? 'bg-white text-black shadow-[0_0_12px_rgba(255,255,255,0.2)]'
                                                : 'bg-white/[0.04] border border-white/[0.06] text-neutral-500 hover:text-white hover:bg-white/10'
                                        }`}>
                                        <span>{tab.icon}</span>
                                        {tab.label}
                                        <span className="text-[9px] opacity-60">({platformCounts[tab.id] || 0})</span>
                                    </button>
                                ))}
                            </div>
                        ) : <div />}

                        <div className="flex items-center gap-3">
                            {/* Month/Week toggle (solo tab contenido) */}
                            {(calendarTab === 'contenido' || calendarTab === 'todos') && (
                                <div className="flex bg-white/[0.04] border border-white/[0.06] rounded-xl overflow-hidden">
                                    {['month', 'week'].map(v => (
                                        <button key={v} onClick={() => setCalendarView(v)}
                                            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${calendarView === v ? 'bg-[#CC0000] text-white' : 'text-neutral-500 hover:text-white'}`}>
                                            {v === 'month' ? '🗓 Mes' : '📅 Semana'}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Ir a fecha */}
                            <div className="flex items-center gap-2">
                                <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); }}
                                    className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-xs hover:bg-white/10 transition-colors">
                                    ‹
                                </button>
                                <span className="text-[11px] font-black text-white uppercase tracking-widest min-w-[100px] text-center">
                                    {currentDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                                </span>
                                <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); }}
                                    className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-xs hover:bg-white/10 transition-colors">
                                    ›
                                </button>
                                <button onClick={() => setCurrentDate(new Date())}
                                    className="px-3 py-1 text-[9px] font-black uppercase text-[#00ff88] border border-[#00ff88]/30 rounded-lg hover:bg-[#00ff88]/10 transition-colors">
                                    Hoy
                                </button>
                            </div>
                        </div>
                    </div>

                    {calendarTab === 'citas' && loadingCitas && (
                        <p className="text-xs text-neutral-500 font-black animate-pulse mt-2">Cargando citas desde la base de datos...</p>
                    )}
                </div>

                {/* ── BODY ── */}
                <div className="flex-1 overflow-hidden flex flex-col">

                    {/* Panel de Configuración de IA / Neurona */}
                    {canCreate && (calendarTab === 'contenido' || calendarTab === 'todos') && activePlatform !== 'ALL' && (
                        <div className="mx-6 mt-4 mb-2 bg-[#0a0a0a]/80 backdrop-blur-sm border border-[#CC0000]/30 rounded-xl p-4 shadow-[0_0_20px_rgba(204,0,0,0.1)] shrink-0">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-black text-white text-xs tracking-widest uppercase flex items-center gap-2">
                                    <span className="text-[#CC0000]">🤖</span>
                                    Configuración Neurona: <span className="text-neutral-400">{activePlatform}</span>
                                </h3>
                                <button onClick={saveBotConfig} disabled={savingBot || !botConfig}
                                    className="bg-[#CC0000] hover:bg-white hover:text-[#CC0000] text-white text-[10px] font-black uppercase px-4 py-1.5 rounded transition-colors disabled:opacity-50">
                                    {savingBot ? "Guardando..." : "Guardar Ajustes"}
                                </button>
                            </div>
                            {!botConfig ? (
                                <div className="text-neutral-500 text-xs py-2 flex items-center gap-2">
                                    <span className="animate-spin text-xl">⚙️</span> Conectando con IA...
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <label className="text-neutral-500 font-bold mb-1 block uppercase tracking-widest text-[10px]">Palabras Clave (Trigger)</label>
                                        <input type="text" value={botConfig.keywords}
                                            onChange={(e) => setBotConfig({...botConfig, keywords: e.target.value})}
                                            className="w-full bg-black/60 border border-white/10 rounded p-2 text-white font-bold focus:outline-none focus:border-[#CC0000] transition-colors"
                                            placeholder="ej. tecnologia, info, precio" />
                                    </div>
                                    <div>
                                        <label className="text-neutral-500 font-bold mb-1 block uppercase tracking-widest text-[10px]">Respuesta Automática Template</label>
                                        <input type="text" value={botConfig.comment_template}
                                            onChange={(e) => setBotConfig({...botConfig, comment_template: e.target.value})}
                                            className="w-full bg-black/60 border border-white/10 rounded p-2 text-white font-bold focus:outline-none focus:border-[#CC0000] transition-colors"
                                            placeholder="Ej: ¡Hola! Mándanos un DM..." />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-neutral-500 font-bold mb-1 block uppercase tracking-widest text-[10px]">System Prompt (Inbox Privado)</label>
                                        <textarea value={botConfig.dm_system_prompt || ''}
                                            onChange={(e) => setBotConfig({...botConfig, dm_system_prompt: e.target.value})}
                                            className="w-full h-14 bg-black/60 border border-[#CC0000]/20 rounded p-2 text-yellow-300/80 font-mono text-[10px] focus:outline-none focus:border-[#CC0000] transition-colors resize-none"
                                            placeholder="Instrucciones especiales para Gemini en esta red social." />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── CONTENIDO PRINCIPAL ── */}
                    <div className="flex-1 flex overflow-hidden">
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* TAB: PENDIENTES */}
                            {calendarTab === 'pendientes' ? (
                                <div className="flex bg-[#0a0a0a] border border-neutral-800 rounded-2xl overflow-hidden flex-1 m-4 font-sans shadow-2xl">
                                    {/* Left Pane */}
                                    <div className="w-1/2 md:w-5/12 border-r border-neutral-800 flex flex-col bg-[#050505] text-white">
                                        <div className="flex items-center px-4 py-3 border-b border-neutral-800 shrink-0 bg-[#0a0a0a] relative" data-dropdown="templates">
                                            <button onClick={() => setShowTemplateDropdown(!showTemplateDropdown)} className="bg-[#CC0000] hover:bg-red-800 text-white rounded-lg px-4 py-1.5 text-xs font-black uppercase tracking-widest flex items-center shadow-[0_0_15px_rgba(204,0,0,0.3)] transition-all relative z-10">
                                                <span className="mr-2 text-sm">+</span> Add Task <span className="ml-2 text-[10px]">▼</span>
                                            </button>
                                            {showTemplateDropdown && (
                                                <div className="absolute top-12 left-4 w-64 bg-[#111] border border-neutral-700 rounded-xl shadow-2xl z-50 overflow-hidden text-white font-sans">
                                                    <button onClick={() => { setShowTemplateDropdown(false); setNewTask({ que: '', para: '', referencias: '', deadline: '', audience: 'Marketing', priority: 'Medium', contentType: 'Backlog' }); setShowNewAssignModal(true); }}
                                                        className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-neutral-800 transition-colors border-b border-neutral-800 flex items-center gap-2">
                                                        <span className="text-[#CC0000] text-sm">+</span> Blank task
                                                    </button>
                                                    <div className="px-4 py-2 text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Task templates</div>
                                                    <div className="flex flex-col">
                                                        <button onClick={() => { setShowTemplateDropdown(false); setNewTask({ que: 'Rebrand Outreach Campaign', para: 'Alex', referencias: 'Objetivo: Renovación visual de pautas Q4.', deadline: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0], audience: 'Social Media', priority: 'High', contentType: 'Launch' }); setShowNewAssignModal(true); }}
                                                            className="w-full text-left px-4 py-2.5 text-[11px] font-bold hover:bg-[#CC0000]/10 hover:text-[#CC0000] transition-colors flex items-center gap-2 group text-neutral-300">
                                                            <span className="opacity-50 group-hover:opacity-100 text-sm">☑</span> Rebrand Outreach Campaign
                                                        </button>
                                                        <button onClick={() => { setShowTemplateDropdown(false); setNewTask({ que: 'Blog Updates Template', para: 'Judith', referencias: 'Revisar y actualizar SEO on-page.', deadline: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], audience: 'Marketing', priority: 'Medium', contentType: 'Testing' }); setShowNewAssignModal(true); }}
                                                            className="w-full text-left px-4 py-2.5 text-[11px] font-bold hover:bg-[#CC0000]/10 hover:text-[#CC0000] transition-colors flex items-center gap-2 group text-neutral-300">
                                                            <span className="opacity-50 group-hover:opacity-100 text-sm">☑</span> Blog Updates Template
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-y-auto">
                                            <div className="px-4 py-3 flex items-center text-[10px] font-black uppercase tracking-widest text-neutral-500 mt-2">
                                                <span className="mr-2">▼</span> Asignaciones Recientes
                                            </div>
                                            <div className="flex flex-col mt-1">
                                                {tasks.length === 0 ? (
                                                    <p className="text-neutral-600 text-xs font-bold text-center py-6 uppercase tracking-widest">No hay tareas pendientes.</p>
                                                ) : tasks.map(task => (
                                                    <div key={task.id} onClick={() => setSelectedTaskBoard(task)}
                                                        className={`flex items-center border-b border-neutral-800/50 px-4 py-2 cursor-pointer max-h-12 transition-all ${selectedTaskBoard?.id === task.id ? 'bg-[#CC0000]/10 border-l-[3px] border-l-[#CC0000]' : 'hover:bg-white/5 border-l-[3px] border-l-transparent'}`}>
                                                        <div className={`flex-1 text-sm font-bold truncate transition-colors ${task.done ? 'text-neutral-500 line-through' : 'text-white'}`}>{task.que}</div>
                                                        <div className="hidden xl:flex items-center space-x-1.5 mr-3 shrink-0">
                                                            <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider w-16 text-center truncate">{task.audience || 'Marketing'}</div>
                                                            <div className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider w-14 text-center border ${task.priority === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' : task.priority === 'Low' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>{task.priority || 'Medium'}</div>
                                                        </div>
                                                        <div className="w-7 h-7 rounded-full bg-neutral-800 border-2 border-neutral-600 flex items-center justify-center text-[10px] font-black text-white mr-3 shrink-0 uppercase shadow-md">{task.para?.[0] || '?'}</div>
                                                        <div className="text-[10px] font-black uppercase tracking-wider w-16 text-right truncate">
                                                            {task.deadline === new Date().toISOString().split('T')[0] ? <span className="text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">Hoy</span> : <span className="text-neutral-500">{task.deadline}</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Pane */}
                                    <div className="w-1/2 md:w-7/12 flex flex-col bg-[#080808] text-white">
                                        {selectedTaskBoard ? (
                                            <div className="flex-1 flex flex-col overflow-hidden">
                                                <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 shrink-0 bg-[#0a0a0a]">
                                                    <div className="flex items-center space-x-3 text-xs">
                                                        <button onClick={() => handleDeleteTask(selectedTaskBoard.id)}
                                                            className="border border-red-500/50 rounded-lg px-4 py-1.5 font-black uppercase tracking-widest flex items-center transition-all bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white">
                                                            <span className="mr-2">❌</span> Eliminar Tarea
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex-1 overflow-y-auto px-8 py-8">
                                                    <div className="flex items-center text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-6 bg-neutral-900/50 w-max px-3 py-1.5 rounded-lg border border-neutral-800">
                                                        <span className="mr-2 text-[#CC0000]">🔒</span>
                                                        Tarea Interna • Reporte asignado por {selectedTaskBoard.asignadoPor}.
                                                    </div>
                                                    <h1 className={`text-3xl font-black leading-tight mb-8 ${selectedTaskBoard.done ? 'text-neutral-600 line-through' : 'text-white'}`}>
                                                        {selectedTaskBoard.que}
                                                    </h1>
                                                    <div className="flex flex-col space-y-5 mb-10 border-b border-neutral-800 pb-8">
                                                        <div className="flex items-center">
                                                            <div className="w-32 text-xs font-black uppercase tracking-widest text-neutral-500">Asignado a</div>
                                                            <div className="flex items-center text-sm font-bold text-white">
                                                                <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-600 flex items-center justify-center text-[10px] text-white uppercase font-black mr-3 shadow">{selectedTaskBoard.para?.[0] || '?'}</div>
                                                                {selectedTaskBoard.para}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center">
                                                            <div className="w-32 text-xs font-black uppercase tracking-widest text-neutral-500">Deadline</div>
                                                            <div className="text-sm font-bold text-yellow-500">{selectedTaskBoard.deadline}</div>
                                                        </div>
                                                        <div className="flex items-start mt-4">
                                                            <div className="w-32 text-xs font-black uppercase tracking-widest text-neutral-500 mt-2">Briefing</div>
                                                            <div className="flex-1 text-sm text-neutral-300 bg-[#111] hover:bg-[#1a1a1a] border border-neutral-800 p-4 rounded-xl min-h-[100px] transition-colors shadow-inner leading-relaxed whitespace-pre-wrap">
                                                                {selectedTaskBoard.referencias || <span className="text-neutral-500 italic">No hay brief detallado...</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="pt-2">
                                                        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">Comentarios:</h3>
                                                        <div className="flex space-x-4">
                                                            <div className="w-10 h-10 rounded-full bg-[#CC0000] flex items-center justify-center text-sm font-black text-white shrink-0 uppercase border-2 border-red-900">{(currentUser || 'U')[0]}</div>
                                                            <div className="flex-1 border border-neutral-800 hover:border-neutral-600 rounded-xl bg-[#111] p-0 shadow-inner flex flex-col focus-within:border-[#CC0000]/50 transition-colors">
                                                                <textarea className="w-full bg-transparent resize-none outline-none p-3 text-sm text-white placeholder-neutral-600 min-h-[80px]" placeholder="Añadir una actualización..." />
                                                                <div className="p-2 flex justify-end shrink-0 border-t border-neutral-800">
                                                                    <button className="bg-white text-black text-[10px] uppercase font-black px-4 py-1.5 rounded-lg hover:bg-neutral-200 transition-colors">Comentar</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center text-[#6D6E6F]">
                                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4 text-[#2a2a2a]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                                <p className="text-sm">Click on a task to view details</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (calendarTab === 'contenido_ia' || calendarTab === 'citas' || calendarTab === 'todos') ? (
                                // CITAS, IA y TODOS → siguen usando React Big Calendar
                                <div className="flex-1 p-4 min-h-0" style={{ minHeight: '600px' }}>
                                    <Calendar
                                        date={currentDate} onNavigate={(newDate) => setCurrentDate(newDate)}
                                        localizer={localizer}
                                        events={calendarEventsMap[calendarTab] || []}
                                        startAccessor="start" endAccessor="end"
                                        style={{ height: '100%' }}
                                        messages={{ today: "Hoy", month: "Mes", week: "Semana", day: "Día", next: "Sig", previous: "Ant" }}
                                        culture="es" eventPropGetter={eventStyleGetter}
                                        onSelectEvent={(event) => {
                                            if (event.tipo === 'cita') setSelectedEvent({ ...event, isCita: true });
                                            else if (event.tipo === 'pendiente') setSelectedEvent({ ...event, isPendiente: true });
                                            else setSelectedEvent(event);
                                            setCommentText(''); setMentionQuery(null);
                                        }}
                                    />
                                </div>

                            ) : (
                                // ── CONTENIDO → CUSTOM GRID ASANA-STYLE ──
                                <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                                    {loadingEvents ? (
                                        <div className="flex flex-col items-center justify-center h-64 opacity-40">
                                            <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin mb-4" />
                                            <p className="text-xs font-black text-neutral-500 uppercase tracking-widest">Cargando calendario...</p>
                                        </div>
                                    ) : (
                                        events.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center flex-1 opacity-40 gap-3 py-20">
                                                <span className="text-5xl">📅</span>
                                                <p className="text-sm font-black text-neutral-500 uppercase tracking-widest">Sin eventos. Crea tu primera campaña.</p>
                                                {canCreate && (
                                                    <button onClick={() => setShowNewCampaignModal(true)}
                                                        className="mt-2 px-6 py-2 bg-[#CC0000] text-white font-black text-xs rounded-xl uppercase tracking-widest hover:bg-white hover:text-[#CC0000] transition-all">
                                                        + Nueva Campaña
                                                    </button>
                                                )}
                                            </div>
                                        ) : renderMonthGrid()
                                    )}
                                </div>
                            )}
                        </div>

                        {/* SIDEBAR */}
                        {calendarTab !== 'pendientes' && renderSidebar()}
                    </div>
                </div>
            </div>

            {/* ── PANEL DE EVENTO SELECCIONADO ── */}
            {selectedEvent && (
                <div className="absolute top-0 right-0 h-full w-[420px] bg-black/50 backdrop-blur-2xl border-l border-white/[0.06] shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col z-50">
                    <div className={`p-4 border-b flex justify-between items-center shrink-0 ${selectedEvent.status === 'urgent' ? 'bg-gradient-to-r from-[#CC0000] to-red-800 border-red-900' : 'bg-black/30 border-white/[0.06]'}`}>
                        <div>
                            <h3 className="font-black text-sm uppercase text-white tracking-widest">{selectedEvent.title}</h3>
                            <p className="text-[10px] text-white/60 font-bold mt-0.5 uppercase">{selectedEvent.provider}</p>
                        </div>
                        <div className="flex gap-2 items-center">
                            {canCreate && (
                                <button onClick={(e) => { handleDeleteEvent(selectedEvent.id, e); setSelectedEvent(null); }} className="text-red-500 hover:text-white font-black text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-600 transition-colors" title="Eliminar Evento">
                                    🗑️
                                </button>
                            )}
                            <button onClick={() => setSelectedEvent(null)} className="text-white hover:text-black font-black text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors">×</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-5">
                        {selectedEvent.isCita || selectedEvent.tipo === 'cita' ? (
                            <div className="space-y-4">
                                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                    <h4 className="text-xs font-black text-white uppercase tracking-widest mb-3 border-b border-white/10 pb-2 flex items-center gap-2">
                                        <span>👤</span> Información del Cliente
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        <p><span className="text-neutral-500 font-bold">Nombre:</span> <span className="text-white font-bold">{selectedEvent.raw?.nombre_completo || selectedEvent.raw?.nombre || 'No especificado'}</span></p>
                                        <p><span className="text-neutral-500 font-bold">Email:</span> <span className="text-white font-bold">{selectedEvent.raw?.email || 'No especificado'}</span></p>
                                        <p><span className="text-neutral-500 font-bold">Teléfono:</span> <span className="text-white font-bold">{selectedEvent.raw?.telefono || 'No especificado'}</span></p>
                                        <p><span className="text-neutral-500 font-bold">Tipo de Sesión:</span> <span className="text-white font-bold">{selectedEvent.raw?.tipo_sesion || 'Consultoría'}</span></p>
                                    </div>
                                </div>

                                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                    <h4 className="text-xs font-black text-white uppercase tracking-widest mb-3 border-b border-white/10 pb-2 flex items-center gap-2">
                                        <span>📝</span> Resumen de Conversación / Notas
                                    </h4>
                                    <p className="text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
                                        {selectedEvent.raw?.notas_adicionales || selectedEvent.raw?.resumen || 'No hay notas adicionales o resumen de conversación disponible para esta cita.'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Preview */}
                                <div>
                                    <p className="text-[10px] text-neutral-600 font-black uppercase tracking-widest mb-2">Vista Previa en Red Social:</p>
                                    {renderSocialMockup(selectedEvent)}
                                </div>

                                {/* Caption editable */}
                                <div>
                                    <p className="text-xs font-black text-neutral-500 uppercase mb-2">Copy / Caption:</p>
                                    {canCreate
                                        ? <textarea defaultValue={selectedEvent.caption} className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-sm text-white outline-none focus:border-yellow-500 transition-colors resize-none" rows="3" />
                                        : <p className="bg-black/40 border border-white/5 p-3 rounded-xl text-sm text-neutral-300 font-bold">{selectedEvent.caption}</p>
                                    }
                                </div>

                                {/* Asignar corrección — solo admins */}
                                {canCreate && (
                                    <div className="pt-3 border-t border-white/[0.06]">
                                        <p className="text-xs font-black text-neutral-500 uppercase mb-2">Asignar Corrección al diseñador:</p>
                                        <div className="space-y-2 mb-3">
                                            <input type="text" placeholder="¿El qué? (Ej: Oscurecer imagen)" value={correctionForm.que} onChange={e => setCorrectionForm({...correctionForm, que: e.target.value})} className="w-full bg-black/30 border border-red-900/50 p-2.5 text-white text-xs rounded-lg outline-none focus:border-[#CC0000]" />
                                            <input type="text" placeholder="¿El cuándo? (Ej: Urgente, Hoy 5PM)" value={correctionForm.cuando} onChange={e => setCorrectionForm({...correctionForm, cuando: e.target.value})} className="w-full bg-black/30 border border-red-900/50 p-2.5 text-white text-xs rounded-lg outline-none focus:border-[#CC0000]" />
                                            <input type="text" placeholder="¿Para qué? (Ej: Post de mañana IG)" value={correctionForm.paraQue} onChange={e => setCorrectionForm({...correctionForm, paraQue: e.target.value})} className="w-full bg-black/30 border border-red-900/50 p-2.5 text-white text-xs rounded-lg outline-none focus:border-[#CC0000]" />
                                            <input type="url" placeholder="Referencias (URLs, Drive, etc.)" value={correctionForm.referencias} onChange={e => setCorrectionForm({...correctionForm, referencias: e.target.value})} className="w-full bg-black/30 border border-red-900/50 p-2.5 text-white text-xs rounded-lg outline-none focus:border-[#CC0000]" />
                                            <textarea placeholder="Comentarios adicionales / @Menciones..." value={correctionForm.comentarios} onChange={e => setCorrectionForm({...correctionForm, comentarios: e.target.value})} className="w-full bg-black/30 border border-red-900/50 p-2.5 text-white text-xs rounded-lg resize-none outline-none focus:border-[#CC0000]" rows="2" />
                                        </div>
                                        <button onClick={() => {
                                            if (!correctionForm.que) return alert('Debes especificar al menos el ¿Qué?');
                                            const finalComment = `📌 NUEVO PENDIENTE:\n• ¿Qué?: ${correctionForm.que}\n• ¿Cuándo?: ${correctionForm.cuando}\n• ¿Para qué?: ${correctionForm.paraQue}\n• Refs: ${correctionForm.referencias}\n• Comentarios: ${correctionForm.comentarios}`;
                                            const newComment = { id: Date.now(), author: currentUser, text: finalComment, time: 'ahora' };
                                            const mentioned = TEAM.filter(u => correctionForm.comentarios.toLowerCase().includes(`@${u.toLowerCase()}`));
                                            if (mentioned.length > 0) {
                                                const newNotifs = mentioned.map(u => ({ id: Date.now() + Math.random(), to: u, from: currentUser, text: `Asignación: ${correctionForm.que}`, read: false, time: 'ahora', eventTitle: selectedEvent.title }));
                                                setNotifications(prev => [...newNotifs, ...prev]);
                                            }
                                            setEvents(prev => prev.map(ev => ev.id === selectedEvent.id ? { ...ev, status: 'urgent', comments: [...(ev.comments || []), newComment] } : ev));
                                            setSelectedEvent(prev => ({ ...prev, status: 'urgent', comments: [...(prev.comments || []), newComment] }));
                                            setCorrectionForm({ que: '', cuando: '', paraQue: '', referencias: '', comentarios: '' });
                                            alert('Tarea de corrección enviada.');
                                        }} className="w-full bg-gradient-to-r from-[#CC0000] to-red-800 text-white font-black py-2.5 rounded-xl text-xs uppercase transition-all hover:from-red-700 shadow-md">
                                            Mandar a Corregir ➔
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Comentarios */}
                        <div className="pt-3 border-t border-white/[0.06]">
                            <p className="text-xs font-black text-neutral-500 uppercase mb-3 flex items-center gap-2">
                                💬 Comentarios del equipo
                                <span className="text-[10px] text-neutral-700 font-normal normal-case">Usa @Nombre para mencionar</span>
                            </p>
                            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                                {(selectedEvent.comments || []).length === 0
                                    ? <p className="text-neutral-700 text-xs font-bold text-center py-4">Sin comentarios aún. Sé el primero.</p>
                                    : (selectedEvent.comments || []).map(c => (
                                        <div key={c.id} className={`flex gap-2 ${c.author?.toLowerCase() === currentUser.toLowerCase() ? 'flex-row-reverse' : ''}`}>
                                            <div className="w-7 h-7 rounded-full bg-[#CC0000]/20 border border-[#CC0000]/40 flex items-center justify-center shrink-0 text-[10px] font-black text-[#CC0000]">{(c.author || '?')[0].toUpperCase()}</div>
                                            <div className={`max-w-[75%] ${c.author?.toLowerCase() === currentUser.toLowerCase() ? 'items-end' : 'items-start'} flex flex-col`}>
                                                <div className={`px-3 py-2 rounded-xl text-xs font-bold leading-snug ${c.author?.toLowerCase() === currentUser.toLowerCase() ? 'bg-[#CC0000]/20 border border-[#CC0000]/30 text-white rounded-tr-none' : 'bg-white/5 border border-white/10 text-neutral-300 rounded-tl-none'}`}>
                                                    {renderMentions(c.text)}
                                                </div>
                                                <p className="text-[10px] text-neutral-600 font-bold mt-1">{c.author} · {typeof c.time === 'string' && c.time.includes('T') ? new Date(c.time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : c.time}</p>
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                            <div className="relative">
                                {mentionQuery !== null && (
                                    <div className="absolute bottom-full mb-1 left-0 bg-[#1a1a1a] border border-[#CC0000]/30 rounded-xl overflow-hidden shadow-xl z-10 min-w-[160px]">
                                        {TEAM.filter(u => u.toLowerCase().startsWith(mentionQuery.toLowerCase())).map(u => (
                                            <button key={u} onClick={() => insertMention(u)} className="w-full text-left px-4 py-2 text-sm font-black text-white hover:bg-[#CC0000]/20 transition-colors flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full bg-[#CC0000]/20 border border-[#CC0000]/40 flex items-center justify-center text-[10px] text-[#CC0000]">{u[0]}</span>
                                                @{u}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <input ref={commentInputRef} value={commentText} onChange={handleCommentChange}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                                        placeholder="Comenta... usa @Nombre para mencionar"
                                        className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#CC0000] transition-colors placeholder:text-neutral-700" />
                                    <button onClick={submitComment} className="bg-[#CC0000] hover:bg-red-700 text-white font-black px-4 rounded-xl text-xs transition-colors shrink-0">↑</button>
                                </div>
                            </div>
                        </div>

                        {(selectedEvent.tipo === 'contenido_ia' || selectedEvent.isPendiente || selectedEvent.status === 'pending') && (
                            <div className="pt-3 border-t border-white/[0.06] flex gap-3">
                                <button onClick={() => handleRejectAIContent(selectedEvent.id)} className="w-1/3 bg-transparent border border-[#CC0000] text-[#CC0000] hover:bg-[#CC0000] hover:text-white font-black py-3 rounded-xl transition-all uppercase text-[10px] tracking-widest">Tachar ❌</button>
                                <button onClick={() => handleApproveAIContent(selectedEvent.id)} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-xl shadow-[0_5px_15px_rgba(22,163,74,0.3)] transition-all uppercase text-[10px] tracking-widest">Aprobar y Agendar ✔️</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── MODAL: ASIGNAR TAREA ── */}
            {showNewAssignModal && canCreate && createPortal(
                <div className="absolute inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#0d0d0d] border border-white/[0.06] p-8 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(204,0,0,0.15)] relative">
                        <button onClick={() => setShowNewAssignModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white text-2xl font-black">×</button>
                        <h3 className="text-xl font-black text-white tracking-widest uppercase mb-6 flex items-center gap-2"><span className="text-[#CC0000]">📋</span> Asignar Tarea</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-neutral-500 uppercase mb-2">¿Qué se debe hacer? *</label>
                                <textarea value={newTask.que} onChange={e => setNewTask({ ...newTask, que: e.target.value })} placeholder="Ej: Hacer imagen menos oscura..." rows="3" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors resize-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-500 uppercase mb-2">¿Para quién? *</label>
                                <select value={newTask.para} onChange={e => setNewTask({ ...newTask, para: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors">
                                    <option value="">— Selecciona —</option>
                                    {TEAM.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-yellow-500/80 uppercase mb-2 flex items-center gap-2">
                                    <span>📸 Referencias</span>
                                    <span className="bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded text-[9px]">Opcional</span>
                                </label>
                                <div className="space-y-3 p-4 border border-white/5 bg-white/[0.02] rounded-xl">
                                    <input type="text" value={newTask.referencias} onChange={e => setNewTask({ ...newTask, referencias: e.target.value })} placeholder="Link, brief, notas o URL..." className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors" />
                                    <label className={`w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer transition-all ${isUploadingMedia ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-neutral-600 hover:border-yellow-500 hover:bg-white/5'}`}>
                                        <span className="text-xl mb-1">↑</span>
                                        <span className="text-xs font-black text-white uppercase tracking-widest text-center">{isUploadingMedia ? 'Subiendo...' : 'Subir foto o screenshot'}</span>
                                        <input type="file" accept="image/*,video/*" className="hidden" disabled={isUploadingMedia} onChange={handleUploadTaskImage} />
                                    </label>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-neutral-500 uppercase mb-2">Audience</label>
                                    <select value={newTask.audience} onChange={e => setNewTask({ ...newTask, audience: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-emerald-400 focus:outline-none transition-colors">
                                        <option>Marketing</option><option>Social Media</option><option>Product</option><option>Branding</option><option>Finance</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-neutral-500 uppercase mb-2">Priority</label>
                                    <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-orange-400 focus:outline-none transition-colors">
                                        <option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-neutral-500 uppercase mb-2">Content Type</label>
                                    <select value={newTask.contentType} onChange={e => setNewTask({ ...newTask, contentType: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-fuchsia-400 focus:outline-none transition-colors">
                                        <option>Backlog</option><option>Launch</option><option>Testing</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-500 uppercase mb-2">¿Para cuándo? *</label>
                                <input type="date" value={newTask.deadline} onChange={e => setNewTask({ ...newTask, deadline: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors [color-scheme:dark]" />
                            </div>
                            <button onClick={async () => {
                                if (!newTask.que || !newTask.para || !newTask.deadline) return alert('Completa los campos obligatorios (*)');
                                try {
                                    const token = localStorage.getItem('adminToken');
                                    const res = await fetch(`${'' || ''}/api/studio/tasks`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                        body: JSON.stringify({ title: newTask.que, prompt: newTask.referencias || 'No referenciado', assigned_to: newTask.para.toLowerCase().replace('@', ''), tags: [newTask.audience], priority: newTask.priority, content_type: newTask.contentType, ig_publish_date: new Date(newTask.deadline).toISOString() })
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                        const t = data.task;
                                        setTasks(prev => [{ id: t.id, que: t.title, para: t.assigned_to, referencias: t.prompt, deadline: newTask.deadline, done: false, asignadoPor: currentUser, createdAt: t.created_at, audience: newTask.audience, priority: newTask.priority, contentType: newTask.contentType, status: t.status }, ...prev]);
                                    } else { alert('Error al crear tarea: ' + data.message); }
                                } catch (error) { alert("Fallo de red al asignar tarea."); }
                                setNotifications(prev => [{ id: Date.now(), to: newTask.para, from: currentUser, text: `@${newTask.para} tienes una nueva tarea: "${newTask.que}"`, read: false, time: 'ahora', eventTitle: 'Tarea directa' }, ...prev]);
                                setNewTask({ que: '', para: '', referencias: '', deadline: '', audience: 'Marketing', priority: 'Medium', contentType: 'Backlog' });
                                setShowNewAssignModal(false);
                            }} className="w-full bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] py-4 rounded-xl font-black uppercase tracking-widest transition-all">
                                Asignar Tarea ✔️
                            </button>
                        </div>
                    </div>
                </div>
            , document.body)}

            {/* ── MODAL: NUEVA CAMPAÑA ── */}
            {showNewCampaignModal && canCreate && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#0d0d0d] border border-white/[0.06] p-6 md:p-8 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(204,0,0,0.15)] relative">
                        <button onClick={() => setShowNewCampaignModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white text-2xl font-black">×</button>
                        <h3 className="text-xl font-black text-white tracking-widest uppercase mb-6 flex items-center gap-2">
                            <span className="text-[#CC0000]">🎯</span> Programar Campaña
                            <span className="text-[10px] bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] px-2 py-0.5 rounded-full uppercase tracking-wider font-black">Persiste en DB • Tiempo Real</span>
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-neutral-500 uppercase mb-2">Empresa *</label>
                                    <select value={newCampaign.empresa} onChange={e => setNewCampaign({...newCampaign, empresa: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#CC0000] transition-colors">
                                        <option value="godzilla">🦖 Godzilla Consulting</option>
                                        <option value="accrual" disabled>🏢 Accrual (Próximamente)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-neutral-500 uppercase mb-2">Responsable *</label>
                                    <select value={newCampaign.asignado} onChange={e => setNewCampaign({...newCampaign, asignado: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#CC0000] transition-colors">
                                        <option value="">— Selecciona —</option>
                                        {TEAM.map(u => <option key={u} value={u}>@{u}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-neutral-500 uppercase mb-2">Título *</label>
                                    <input type="text" value={newCampaign.titulo} onChange={e => setNewCampaign({...newCampaign, titulo: e.target.value})} placeholder="Ej: Video explicativo Godzilla..." className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#CC0000] transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-neutral-500 uppercase mb-2">Fecha *</label>
                                    <input type="date" value={newCampaign.fecha} onChange={e => setNewCampaign({...newCampaign, fecha: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#CC0000] transition-colors [color-scheme:dark]" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-500 uppercase mb-2">Plataforma *</label>
                                <select value={newCampaign.plataforma} onChange={e => setNewCampaign({...newCampaign, plataforma: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#CC0000] transition-colors">
                                    <option value="ALL">🌐 Multicanal (Todas)</option>
                                    <option value="tiktok">⚫ TikTok</option>
                                    <option value="instagram">🟣 Instagram</option>
                                    <option value="facebook">🔵 Facebook</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-yellow-500/80 uppercase mb-2 flex items-center gap-2">
                                    <span>📸 Referencias</span>
                                    <span className="bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded text-[9px]">Opcional</span>
                                </label>
                                <div className="space-y-2 border border-white/5 p-3 rounded-xl bg-white/[0.02]">
                                    {[['🖼️', 'urlFoto', 'URL de Foto/Drive...'], ['🎬', 'urlVideo', 'URL de TikTok/Reel...'], ['🔗', 'urlReferencia', 'URL al documento...']].map(([icon, key, ph]) => (
                                        <div key={key} className="flex items-center gap-3">
                                            <span className="shrink-0 text-base w-6 text-center">{icon}</span>
                                            <input type="url" value={newCampaign[key]} onChange={e => setNewCampaign({...newCampaign, [key]: e.target.value})} placeholder={ph} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#CC0000] transition-colors" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-500 uppercase mb-2">Briefing detallado *</label>
                                <textarea value={newCampaign.briefing} onChange={e => setNewCampaign({...newCampaign, briefing: e.target.value})} placeholder="Explica la visión, tono y activos necesarios..." rows="3" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors resize-none" />
                            </div>
                            <button
                                onClick={handleCreateCampaign}
                                disabled={savingCampaign}
                                className="w-full bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] py-4 rounded-xl font-black uppercase tracking-widest transition-all mt-4 border border-red-900/50 shadow-[0_4px_15px_rgba(204,0,0,0.5)] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {savingCampaign ? (
                                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando en DB...</>
                                ) : '📡 AGREGAR AL CALENDARIO ✔️'}
                            </button>
                        </div>
                    </div>
                </div>
            , document.body)}
            {/* ── MODAL: PUBLICACIÓN (PREVIEW Y ENVIO A REDES) ── */}
            {showPublishModal && selectedPublishTask && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-[#0a0a0a] border border-[#d4af37]/30 p-0 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(212,175,55,0.15)] relative overflow-hidden">
                        <div className="bg-[#111] p-5 border-b border-neutral-800 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                                    🌟 Publicador de Redes
                                </h3>
                                <p className="text-[10px] text-neutral-400 font-bold uppercase mt-1">Visualiza cómo se verá la media en el dispositivo móvil.</p>
                            </div>
                            <button onClick={() => setShowPublishModal(false)} className="text-neutral-500 hover:text-white text-2xl font-black transition-colors w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center">×</button>
                        </div>
                        
                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                            {/* Panel Izquierdo: Selección y Config */}
                            <div className="w-full md:w-1/3 border-r border-neutral-800 bg-[#050505] p-5 flex flex-col overflow-y-auto">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-black uppercase text-neutral-500">Canales a Publicar & Preview</label>
                                    <button 
                                        onClick={() => setPublishTargets(['instagram', 'tiktok', 'facebook'])}
                                        className="text-[9px] font-bold text-[#d4af37] hover:text-white transition-colors uppercase"
                                    >
                                        [ Seleccionar Todas ]
                                    </button>
                                </div>
                                <div className="flex flex-col gap-2 mb-6">
                                    {[
                                        { id: 'instagram', icon: '🟣', label: 'Instagram Feed' }, 
                                        { id: 'tiktok', icon: '⚫', label: 'TikTok For You' }, 
                                        { id: 'facebook', icon: '🔵', label: 'Facebook Feed' }
                                    ].map(net => (
                                        <div key={net.id} className={`flex items-center justify-between p-3 rounded-xl transition-colors border ${publishNetwork === net.id ? 'bg-[#d4af37]/10 border-[#d4af37] text-white' : 'bg-transparent border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.02]'}`}>
                                            <button onClick={() => setPublishNetwork(net.id)} className="flex flex-1 items-center gap-3">
                                                <span className="text-lg">{net.icon}</span>
                                                <span className="text-xs font-black uppercase tracking-wider">{net.label}</span>
                                            </button>
                                            <div className="flex flex-col items-center gap-1 shrink-0 ml-3">
                                                <span className="text-[8px] uppercase tracking-widest text-[#d4af37] font-bold">Publicar</span>
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 accent-[#d4af37] cursor-pointer" 
                                                    checked={publishTargets.includes(net.id)}
                                                    onChange={(e) => {
                                                        if(e.target.checked) setPublishTargets([...publishTargets, net.id]);
                                                        else setPublishTargets(publishTargets.filter(t => t !== net.id));
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <label className="text-[10px] font-black uppercase text-neutral-500 mb-2">Texto (Caption)</label>
                                <textarea 
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-white text-xs resize-none focus:border-[#d4af37] focus:outline-none mb-6 min-h-[120px]" 
                                    value={selectedPublishTask.caption || selectedPublishTask.referencias || selectedPublishTask.que}
                                    readOnly
                                />
                                
                                <button 
                                    disabled={isPublishingToSocial || publishTargets.length === 0} 
                                    onClick={() => {
                                        setIsPublishingToSocial(true);
                                        fetch(`${getAPI()}/api/studio/tasks/${selectedPublishTask.id}`, { 
                                            method: 'PUT', 
                                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }, 
                                            body: JSON.stringify({ status: 'published', publish_targets: publishTargets }) 
                                        }).then(async (res) => {
                                            setIsPublishingToSocial(false);
                                            const dt = await res.json();
                                            if(!dt.success) return alert('Hubo errores al publicar:\n' + JSON.stringify(dt.error || dt.message, null, 2));
                                            
                                            // Extraemos reporte parcial si existiera en el payload
                                            if (dt.report) {
                                                const oks = Object.keys(dt.report).filter(k => dt.report[k].success).join(', ');
                                                if (oks) alert('Aprobado y Enviado a:\n' + oks);
                                            } else {
                                                alert('El servidor procesó la petición de impacto con éxito.');
                                            }
                                            
                                            setTasks(prev => prev.filter(t => t.id !== selectedPublishTask.id));
                                            setShowPublishModal(false);
                                        }).catch(err => {
                                            setIsPublishingToSocial(false);
                                            alert('Error crítico de red al publicar.');
                                        });
                                }} className="mt-auto w-full bg-gradient-to-r from-[#d4af37] to-yellow-600 hover:from-yellow-500 hover:to-yellow-400 text-black py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-[0_4px_15px_rgba(212,175,55,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isPublishingToSocial ? <><span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span> ESPERANDO REDES...</> : '🚀 IMPACTAR AHORA'}
                                </button>
                            </div>
                            
                            {/* Panel Derecho: Preview del HUD */}
                            <div className="w-full md:w-2/3 bg-neutral-950 flex items-center justify-center p-6 md:p-10 relative">
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(212,175,55,0.05),transparent)]"></div>
                                <div className="w-full max-w-[320px] shadow-2xl relative z-10 transition-all duration-300 transform rounded-[2rem] border-[6px] border-black bg-black">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-black rounded-b-xl z-50"></div>
                                    <div className="h-[650px] w-full overflow-hidden rounded-[1.5rem] bg-[#111] custom-scrollbar-hide overflow-y-auto">
                                        {/* Mockup Renderer Inyectando Datos de la Tarea Actual */}
                                        {renderSocialMockup({ 
                                            platform: publishNetwork, 
                                            media_url: selectedPublishTask.mediaPayload?.[0]?.url || selectedPublishTask.mediaPayload?.url, 
                                            caption: selectedPublishTask.caption || selectedPublishTask.referencias || selectedPublishTask.que 
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            , document.body)}
            {/* ═══ MODAL: IMPORTAR DESDE GOOGLE SHEETS ═══ */}
            {showSheetsModal && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-[0_30px_80px_rgba(0,0,0,0.9)]">
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <div>
                                <h3 className="text-white font-black text-lg flex items-center gap-2">
                                    📊 Automatizar Contenido desde Sheets
                                </h3>
                                <p className="text-neutral-500 text-xs font-bold mt-0.5">
                                    Las publicaciones importadas <span className="text-green-400">irán al Calendario de Contenido</span>, no al de citas
                                </p>
                            </div>
                            <button onClick={() => setShowSheetsModal(false)} className="text-neutral-600 hover:text-white text-2xl font-black">×</button>
                        </div>
                        <div className="p-6 flex flex-col gap-4 flex-1 overflow-y-auto">
                            {/* Empresa destino */}
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black uppercase text-neutral-500 mb-2 block">Empresa / Proyecto</label>
                                    <select
                                        value={sheetsEmpresa}
                                        onChange={e => setSheetsEmpresa(e.target.value)}
                                        className="w-full bg-black border border-white/20 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-green-500/60"
                                    >
                                        <option value="godzilla">🦖 Godzilla Consulting</option>
                                        <option value="cliente1">📁 Cliente 1</option>
                                        <option value="cliente2">📁 Cliente 2</option>
                                        <option value="cockers">🎬 Cockers Studio</option>
                                    </select>
                                </div>
                                <div className="flex items-end pb-0.5">
                                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-green-400 text-[10px] font-black uppercase tracking-wider">→ Contenido</span>
                                    </div>
                                </div>
                            </div>
                            {/* URL Input */}
                            <div>
                                <label className="text-[10px] font-black uppercase text-neutral-500 mb-2 block">URL del Google Sheet con el calendario</label>
                                <div className="flex gap-2">
                                    <input type="text" value={sheetsUrl} onChange={e => setSheetsUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchSheetsPreview()} placeholder="https://docs.google.com/spreadsheets/d/..." className="flex-1 bg-black border border-white/20 text-white text-xs rounded-xl px-4 py-3 focus:outline-none focus:border-green-500/60 placeholder-neutral-700 font-mono" />
                                    <button onClick={fetchSheetsPreview} disabled={sheetsLoading || !sheetsUrl.trim()} className="px-5 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-black text-xs rounded-xl transition-colors">
                                        {sheetsLoading ? '⏳' : '🔍 Leer'}
                                    </button>
                                </div>
                                <p className="text-[10px] text-neutral-600 mt-2 font-bold">
                                    ⚠️ Comparte el Sheet con: <span className="text-green-400 font-mono text-[9px]">zilla-calendar@bot-godzilla.iam.gserviceaccount.com</span>
                                </p>
                            </div>

                            {sheetsError && <div className="bg-red-950/50 border border-red-800 rounded-xl p-4 text-red-400 text-xs font-bold">❌ {sheetsError}</div>}
                            {sheetsPreview && (
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-green-400 font-black text-sm">✅ {sheetsPreview.total} eventos detectados</span>
                                        <span className="text-neutral-600 text-[10px] font-bold">Cols: {sheetsPreview.headers?.slice(0,5).join(', ')}</span>
                                    </div>
                                    <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto">
                                        {sheetsPreview.events.map((ev, i) => {
                                            const pm = PLATFORM_META[ev.platform] || PLATFORM_META.ALL;
                                            const sm = STATUS_META[ev.status] || STATUS_META.warning;
                                            return (
                                                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${sm.bg} ${sm.border}`}>
                                                    <span className="text-lg shrink-0" style={{ color: pm.color }}>{pm.icon}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-xs font-black truncate ${sm.text}`}>{ev.title}</p>
                                                        {ev.caption && <p className="text-[10px] text-neutral-500 line-clamp-1">{ev.caption}</p>}
                                                        <div className="flex gap-3 mt-1">
                                                            <span className="text-[9px] text-neutral-600 font-bold">📅 {new Date(ev.start_date).toLocaleDateString('es-MX', { day:'2-digit', month:'short' })}</span>
                                                            {ev.assigned_to && <span className="text-[9px] text-neutral-600 font-bold">👤 {ev.assigned_to}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-white/10 flex gap-3 justify-end">
                            <button onClick={() => setShowSheetsModal(false)} className="px-6 py-3 bg-white/5 border border-white/10 text-neutral-400 hover:text-white rounded-xl font-black text-xs">Cancelar</button>
                            {sheetsPreview?.events?.length > 0 && (
                                <button onClick={confirmSheetsImport} disabled={sheetsImporting} className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 disabled:opacity-50 text-white rounded-xl font-black text-xs flex items-center gap-2">
                                    {sheetsImporting ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>Importando...</> : `📥 Importar ${sheetsPreview.total} eventos`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            , document.body)}
        </div>

    );
});

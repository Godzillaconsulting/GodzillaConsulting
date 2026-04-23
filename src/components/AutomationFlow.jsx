import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Bot, MessageCircle, Webhook, Zap, Calendar, Server, Plus, Settings2, X, Trash2, Shield, Activity, Power, Smartphone, Video, Camera, Database, Mail, Wand2, CheckSquare, Image, Play, Clock, CheckCircle, XCircle, ArrowLeft, Layers, Cpu, Globe, Brain, Network, LayoutDashboard, GitBranch, Timer, Braces, Send, Sparkles, Cloud, CreditCard, TrendingUp, Search } from 'lucide-react';

const getIcons = () => ({ Bot, MessageCircle, Webhook, Zap, Calendar, Server, Plus, Settings2, X, Trash2, Shield, Activity, Power, Smartphone, Video, Camera, Database, Mail, Wand2, CheckSquare, Image, Play, Clock, CheckCircle, XCircle, ArrowLeft, Layers, Cpu, Globe, Brain, Network, LayoutDashboard, GitBranch, Timer, Braces, Send, Sparkles, Cloud, CreditCard, TrendingUp, Search });

// ─── Plantillas ────────────────────────────────────────────────────────────────
const FLOW_TEMPLATES = [
  {
    name: '🌌 El Cerebro de Godzilla',
    description: 'Topología Masiva: Cloudflare, APIs y Ejército de Bots',
    nodes: [
      /* --- NÚCLEO --- */
      { id: 'core1', type: 'action', title: 'Cerebro Central AI', subtitle: 'Motor Principal', icon: 'Brain', x: 800, y: 550, color: '#eab308', pm2_process: 'ai-core' },
      { id: 'core2', type: 'action', title: 'Memoria a Largo Plazo', subtitle: 'Pinecone Vector DB', icon: 'Network', x: 800, y: 350, color: '#0d9488', pm2_process: 'vector-db' },
      { id: 'core3', type: 'action', title: 'Gemini API', subtitle: 'LLM Core', icon: 'Sparkles', x: 800, y: 750, color: '#4285f4', pm2_process: '' },
      
      /* --- ESCUDO / GATEWAY --- */
      { id: 'edge1', type: 'action', title: 'Cloudflare Workers', subtitle: 'Gateway Edge', icon: 'Cloud', x: 450, y: 550, color: '#f38020', pm2_process: '' },
      
      /* --- EJÉRCITO DE BOTS (Conectados al Gateway) --- */
      { id: 'bot1', type: 'trigger', title: 'Zilla Bot', subtitle: 'Asistente / Atención', icon: 'Bot', x: 100, y: 100, color: '#10b981', pm2_process: 'zilla-bot' },
      { id: 'bot2', type: 'trigger', title: 'Goyi Bot', subtitle: 'Asistente / Cierre', icon: 'Bot', x: 100, y: 250, color: '#ec4899', pm2_process: 'goyi-bot' },
      { id: 'bot3', type: 'trigger', title: 'WhatsApp Bot', subtitle: 'Alerta WA', icon: 'Smartphone', x: 100, y: 400, color: '#25d366', pm2_process: 'whatsapp-bot' },
      { id: 'bot4', type: 'trigger', title: 'TikTok Bot', subtitle: 'Interacción TikTok', icon: 'Video', x: 100, y: 550, color: '#ff0050', pm2_process: 'tiktok-bot' },
      { id: 'bot5', type: 'trigger', title: 'IG / Messenger Bot', subtitle: 'Interacción Meta', icon: 'MessageCircle', x: 100, y: 700, color: '#d946ef', pm2_process: 'meta-bot' },
      { id: 'bot6', type: 'action', title: 'Bot Newsletter', subtitle: 'Redacción / Difusión', icon: 'Mail', x: 100, y: 850, color: '#f97316', pm2_process: 'newsletter-bot' },
      { id: 'bot7', type: 'action', title: 'Trends Bot', subtitle: 'Analizador Redes', icon: 'TrendingUp', x: 100, y: 1000, color: '#8b5cf6', pm2_process: 'trends-bot' },
      
      /* --- ENTRADAS EXTERNAS --- */
      { id: 'in1', type: 'trigger', title: 'GoDaddy', subtitle: 'DNS / Dominios', icon: 'Globe', x: 450, y: 200, color: '#1bbb11', pm2_process: '' },
      { id: 'in2', type: 'trigger', title: 'Vercel', subtitle: 'Hosting / Deployment', icon: 'Server', x: 450, y: 900, color: '#ffffff', pm2_process: '' },

      /* --- FLUJO DE CITAS (Appointments) --- */
      { id: 'cita1', type: 'trigger', title: 'Webhook Cita', subtitle: 'Formulario Web', icon: 'Globe', x: 1200, y: 100, color: '#06b6d4', pm2_process: '' },
      { id: 'cita2', type: 'action', title: 'Calendario Global', subtitle: 'Registrar Cita', icon: 'Calendar', x: 1200, y: 300, color: '#8b5cf6', pm2_process: '' },

      /* --- MÁQUINA UGC --- */
      { id: 'ugc1', type: 'action', title: 'Planificador IA', subtitle: 'Origen Mensual', icon: 'Wand2', x: 1200, y: 500, color: '#a855f7', pm2_process: '' },
      { id: 'ugc2', type: 'action', title: 'Generador Visual', subtitle: 'Imagen 3', icon: 'Image', x: 1500, y: 400, color: '#3b82f6', pm2_process: '' },
      { id: 'ugc3', type: 'action', title: 'Generador Video', subtitle: 'Veo / Kling', icon: 'Video', x: 1500, y: 600, color: '#f59e0b', pm2_process: '' },
      { id: 'ugc4', type: 'action', title: 'Editor Pro', subtitle: 'Capcut', icon: 'Video', x: 1800, y: 500, color: '#2563eb', pm2_process: '' },
      { id: 'ugc5', type: 'action', title: 'Publicador Social', subtitle: 'Tiktok/IG', icon: 'Send', x: 2100, y: 500, color: '#10b981', pm2_process: 'publisher-bot' },

      /* --- RESOLUCIÓN / SALIDAS --- */
      { id: 'out1', type: 'action', title: 'Godzilla CM', subtitle: 'CRM & Tareas', icon: 'LayoutDashboard', x: 1200, y: 800, color: '#2563eb', pm2_process: '' },
      { id: 'out2', type: 'action', title: 'Brevo', subtitle: 'Email Marketing', icon: 'Mail', x: 1200, y: 1000, color: '#0092ff', pm2_process: '' },
      
      /* --- CAPA FINANCIERA / DATOS --- */
      { id: 'fin1', type: 'action', title: 'Stripe', subtitle: 'Pasarela Pagos', icon: 'CreditCard', x: 1600, y: 800, color: '#6366f1', pm2_process: '' },
      { id: 'fin2', type: 'action', title: 'Neon DB', subtitle: 'PostgreSQL Serverless', icon: 'Database', x: 1600, y: 300, color: '#00e599', pm2_process: '' },
    ],
    edges: [
      /* Núcleo -> Memoria y LLM */
      { id: 'e_core_1', source: 'core1', target: 'core2', color: '#eab308' },
      { id: 'e_core_2', source: 'core2', target: 'core1', color: '#0d9488' },
      { id: 'e_core_3', source: 'core1', target: 'core3', color: '#eab308' },
      { id: 'e_core_4', source: 'core3', target: 'core1', color: '#4285f4' },

      /* Edge Gateway -> Cerebro Central */
      { id: 'e_edge_1', source: 'edge1', target: 'core1', color: '#f38020' },
      { id: 'e_edge_2', source: 'core1', target: 'edge1', color: '#eab308' },

      /* Bots -> Edge Gateway */
      { id: 'eb1', source: 'bot1', target: 'edge1', color: '#10b981' },
      { id: 'eb2', source: 'bot2', target: 'edge1', color: '#ec4899' },
      { id: 'eb3', source: 'bot3', target: 'edge1', color: '#25d366' },
      { id: 'eb4', source: 'bot4', target: 'edge1', color: '#ff0050' },
      { id: 'eb7', source: 'bot5', target: 'edge1', color: '#d946ef' },
      { id: 'eb5', source: 'core1', target: 'bot6', color: '#f97316' }, /* El cerebro manda la señal al Newsletter */
      { id: 'eb6', source: 'bot7', target: 'core1', color: '#8b5cf6' }, /* Trends le avisa al cerebro */

      /* Integraciones Frontend -> Edge Gateway */
      { id: 'ei1', source: 'in1', target: 'edge1', color: '#1bbb11' },
      { id: 'ei2', source: 'in2', target: 'edge1', color: '#ffffff' },

      /* Cerebro -> Salidas (CM, Calendario, Brevo) */
      { id: 'eo2', source: 'core1', target: 'out1', color: '#2563eb' },
      { id: 'eo3', source: 'core1', target: 'out2', color: '#0092ff' },

      /* Citas Flow */
      { id: 'cita_e1', source: 'cita1', target: 'cita2', color: '#06b6d4' },
      { id: 'cita_e2', source: 'cita2', target: 'fin2', color: '#8b5cf6' }, /* Calendario -> Database */
      { id: 'cita_e3', source: 'cita2', target: 'bot3', color: '#25d366' }, /* Calendario -> WA Alerta */

      /* UGC Flow */
      { id: 'ugc_e1', source: 'core1', target: 'ugc1', color: '#a855f7' }, /* Cerebro dispara Planificador */
      { id: 'ugc_e2', source: 'ugc1', target: 'ugc2', color: '#3b82f6' },
      { id: 'ugc_e3', source: 'ugc1', target: 'ugc3', color: '#f59e0b' },
      { id: 'ugc_e4', source: 'ugc2', target: 'ugc4', color: '#3b82f6' },
      { id: 'ugc_e5', source: 'ugc3', target: 'ugc4', color: '#f59e0b' },
      { id: 'ugc_e6', source: 'ugc4', target: 'ugc5', color: '#2563eb' },

      /* Salidas -> Capa Financiera/Persistencia */
      { id: 'ef1', source: 'out1', target: 'fin1', color: '#6366f1' }, /* CRM trigger Stripe */
      { id: 'ef2', source: 'out1', target: 'fin2', color: '#00e599' }, /* CRM guarda en Neon */
    ]
  },
  {
    name: '🌌 Ecosistema Central Godzilla',
    description: 'Cerebro AI Central ↔ Memoria + Bots + Citas',
    nodes: [
      { id: 'ec1', type: 'trigger', title: 'WhatsApp Bot', subtitle: 'Recepción Leads', icon: 'Smartphone', x: 80, y: 100, color: '#25d366', pm2_process: 'whatsapp-bot' },
      { id: 'ec2', type: 'trigger', title: 'TikTok Bot', subtitle: 'Comentarios/DMs', icon: 'Video', x: 80, y: 240, color: '#ff0050', pm2_process: 'tiktok-bot' },
      { id: 'ec3', type: 'trigger', title: 'Webhook Cita', subtitle: 'Formulario Web', icon: 'Globe', x: 80, y: 380, color: '#06b6d4', pm2_process: '' },
      { id: 'ec4', type: 'action', title: 'Cerebro Central AI', subtitle: 'Motor Principal', icon: 'Brain', x: 380, y: 240, color: '#eab308', pm2_process: 'ai-core' },
      { id: 'ec5', type: 'action', title: 'Memoria a Largo Plazo', subtitle: 'Pinecone Vector DB', icon: 'Network', x: 380, y: 80, color: '#0d9488', pm2_process: 'vector-db' },
      { id: 'ec6', type: 'action', title: 'Calendario Global', subtitle: 'Asignación de Citas', icon: 'Calendar', x: 680, y: 160, color: '#8b5cf6', pm2_process: '' },
      { id: 'ec7', type: 'action', title: 'Godzilla CM', subtitle: 'CRM & Tareas', icon: 'LayoutDashboard', x: 680, y: 320, color: '#2563eb', pm2_process: '' },
    ],
    edges: [
      { id: 'e1', source: 'ec1', target: 'ec4', color: '#25d366' },
      { id: 'e2', source: 'ec2', target: 'ec4', color: '#ff0050' },
      { id: 'e3', source: 'ec3', target: 'ec4', color: '#06b6d4' },
      { id: 'e4', source: 'ec4', target: 'ec5', color: '#eab308' },
      { id: 'e5', source: 'ec5', target: 'ec4', color: '#0d9488' },
      { id: 'e6', source: 'ec4', target: 'ec6', color: '#eab308' },
      { id: 'e7', source: 'ec4', target: 'ec7', color: '#eab308' },
    ],
  },
  {
    name: '🌌 Ecosistema Central Godzilla',
    description: 'Cerebro AI Central ↔ Memoria + Bots + Citas',
    nodes: [
      { id: 'ec1', type: 'trigger', title: 'WhatsApp Bot', subtitle: 'Recepción Leads', icon: 'Smartphone', x: 80, y: 100, color: '#25d366', pm2_process: 'whatsapp-bot' },
      { id: 'ec2', type: 'trigger', title: 'TikTok Bot', subtitle: 'Comentarios/DMs', icon: 'Video', x: 80, y: 240, color: '#ff0050', pm2_process: 'tiktok-bot' },
      { id: 'ec3', type: 'trigger', title: 'Webhook Cita', subtitle: 'Formulario Web', icon: 'Globe', x: 80, y: 380, color: '#06b6d4', pm2_process: '' },
      { id: 'ec4', type: 'action', title: 'Cerebro Central AI', subtitle: 'Motor Principal', icon: 'Brain', x: 380, y: 240, color: '#eab308', pm2_process: 'ai-core' },
      { id: 'ec5', type: 'action', title: 'Memoria a Largo Plazo', subtitle: 'Pinecone Vector DB', icon: 'Network', x: 380, y: 80, color: '#0d9488', pm2_process: 'vector-db' },
      { id: 'ec6', type: 'action', title: 'Calendario Global', subtitle: 'Asignación de Citas', icon: 'Calendar', x: 680, y: 160, color: '#8b5cf6', pm2_process: '' },
      { id: 'ec7', type: 'action', title: 'Godzilla CM', subtitle: 'CRM & Tareas', icon: 'LayoutDashboard', x: 680, y: 320, color: '#2563eb', pm2_process: '' },
    ],
    edges: [
      { id: 'e1', source: 'ec1', target: 'ec4', color: '#25d366' },
      { id: 'e2', source: 'ec2', target: 'ec4', color: '#ff0050' },
      { id: 'e3', source: 'ec3', target: 'ec4', color: '#06b6d4' },
      { id: 'e4', source: 'ec4', target: 'ec5', color: '#eab308' },
      { id: 'e5', source: 'ec5', target: 'ec4', color: '#0d9488' },
      { id: 'e6', source: 'ec4', target: 'ec6', color: '#eab308' },
      { id: 'e7', source: 'ec4', target: 'ec7', color: '#eab308' },
    ],
  },
  {
    name: '🌱 Flujo Básico',
    description: 'Planificador IA → Tarea de Studio',
    nodes: [
      { id: 't1', type: 'trigger', title: 'Planificador IA', subtitle: 'Origen', icon: 'Wand2', x: 200, y: 220, color: '#a855f7', pm2_process: '' },
      { id: 't2', type: 'action', title: 'Tarea de Studio', subtitle: 'CEO Estudio', icon: 'CheckSquare', x: 560, y: 220, color: '#10b981', pm2_process: '' },
    ],
    edges: [{ id: 'e1', source: 't1', target: 't2', color: '#a855f7' }],
  },
  {
    name: '🚀 Máquina UGC Completa',
    description: 'Planificador → Imagen → Video → Tarea → WA + Email',
    nodes: [
      { id: 'n1', type: 'trigger', title: 'Planificador IA', subtitle: 'Origen', icon: 'Wand2', x: 80, y: 250, color: '#a855f7', pm2_process: '' },
      { id: 'n2', type: 'action', title: 'Generador Visual', subtitle: 'Imagen 3', icon: 'Image', x: 340, y: 120, color: '#3b82f6', pm2_process: '' },
      { id: 'n3', type: 'action', title: 'Generador Video', subtitle: 'Veo / Kling', icon: 'Video', x: 340, y: 380, color: '#f59e0b', pm2_process: '' },
      { id: 'n4', type: 'action', title: 'Tarea de Studio', subtitle: 'CEO Estudio', icon: 'CheckSquare', x: 620, y: 250, color: '#10b981', pm2_process: '' },
      { id: 'n5', type: 'action', title: 'WhatsApp Bot', subtitle: 'Alerta WA', icon: 'Smartphone', x: 880, y: 140, color: '#25d366', pm2_process: 'whatsapp-bot' },
      { id: 'n6', type: 'action', title: 'Email Worker', subtitle: 'Notificación', icon: 'Mail', x: 880, y: 360, color: '#f97316', pm2_process: 'email-worker' },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', color: '#a855f7' },
      { id: 'e2', source: 'n1', target: 'n3', color: '#a855f7' },
      { id: 'e3', source: 'n2', target: 'n4', color: '#3b82f6' },
      { id: 'e4', source: 'n3', target: 'n4', color: '#f59e0b' },
      { id: 'e5', source: 'n4', target: 'n5', color: '#10b981' },
      { id: 'e6', source: 'n4', target: 'n6', color: '#10b981' },
    ],
  },
  {
    name: '📅 Recepción de Citas Omnicanal',
    description: 'Cita Web → Calendario → WhatsApp + Email',
    nodes: [
      { id: 'c1', type: 'trigger', title: 'Webhook Cita', subtitle: 'Entrada Web', icon: 'Globe', x: 100, y: 220, color: '#06b6d4', pm2_process: '' },
      { id: 'c2', type: 'action', title: 'Calendario Global', subtitle: 'Registrar cita', icon: 'Calendar', x: 380, y: 220, color: '#8b5cf6', pm2_process: '' },
      { id: 'c3', type: 'action', title: 'WhatsApp Bot', subtitle: 'Confirmar al cliente', icon: 'Smartphone', x: 660, y: 120, color: '#25d366', pm2_process: 'whatsapp-bot' },
      { id: 'c4', type: 'action', title: 'Email Worker', subtitle: 'Confirmar por email', icon: 'Mail', x: 660, y: 320, color: '#f97316', pm2_process: 'email-worker' },
    ],
    edges: [
      { id: 'e1', source: 'c1', target: 'c2', color: '#06b6d4' },
      { id: 'e2', source: 'c2', target: 'c3', color: '#8b5cf6' },
      { id: 'e3', source: 'c2', target: 'c4', color: '#8b5cf6' },
    ],
  },
  {
    name: '🤖 Cerebro WhatsApp Bot',
    description: 'WA Bot → Base de Datos → Tarea de Studio',
    nodes: [
      { id: 'w1', type: 'trigger', title: 'WhatsApp Bot', subtitle: 'Mensaje recibido', icon: 'Smartphone', x: 100, y: 220, color: '#25d366', pm2_process: 'whatsapp-bot' },
      { id: 'w2', type: 'action', title: 'Base de Datos', subtitle: 'Guardar log', icon: 'Database', x: 380, y: 220, color: '#64748b', pm2_process: '' },
      { id: 'w3', type: 'action', title: 'Tarea de Studio', subtitle: 'CEO Estudio', icon: 'CheckSquare', x: 660, y: 220, color: '#10b981', pm2_process: '' },
    ],
    edges: [
      { id: 'e1', source: 'w1', target: 'w2', color: '#25d366' },
      { id: 'e2', source: 'w2', target: 'w3', color: '#64748b' },
    ],
  },
  {
    name: '📱 Bot de Alertas Omnicanal',
    description: 'Tarea → WhatsApp + Email simultáneo',
    nodes: [
      { id: 'a1', type: 'trigger', title: 'Planificador IA', subtitle: 'Origen', icon: 'Wand2', x: 100, y: 220, color: '#a855f7', pm2_process: '' },
      { id: 'a2', type: 'action', title: 'Tarea de Studio', subtitle: 'CEO Estudio', icon: 'CheckSquare', x: 380, y: 220, color: '#10b981', pm2_process: '' },
      { id: 'a3', type: 'action', title: 'Email Worker', subtitle: 'Notificación', icon: 'Mail', x: 660, y: 120, color: '#f97316', pm2_process: 'email-worker' },
      { id: 'a4', type: 'action', title: 'WhatsApp Bot', subtitle: 'Alerta WA', icon: 'Smartphone', x: 660, y: 320, color: '#25d366', pm2_process: 'whatsapp-bot' },
    ],
    edges: [
      { id: 'e1', source: 'a1', target: 'a2', color: '#a855f7' },
      { id: 'e2', source: 'a2', target: 'a3', color: '#10b981' },
      { id: 'e3', source: 'a2', target: 'a4', color: '#10b981' },
    ],
  },
  {
    name: '🗄️ Recolector de Datos',
    description: 'Webhook → Base de Datos → Tarea',
    nodes: [
      { id: 'r1', type: 'trigger', title: 'Webhook Entrada', subtitle: 'API Externo', icon: 'Globe', x: 100, y: 220, color: '#06b6d4', pm2_process: '' },
      { id: 'r2', type: 'action', title: 'Base de Datos', subtitle: 'Persistencia', icon: 'Database', x: 380, y: 220, color: '#64748b', pm2_process: '' },
      { id: 'r3', type: 'action', title: 'Tarea de Studio', subtitle: 'CEO Estudio', icon: 'CheckSquare', x: 660, y: 220, color: '#10b981', pm2_process: '' },
    ],
    edges: [
      { id: 'e1', source: 'r1', target: 'r2', color: '#06b6d4' },
      { id: 'e2', source: 'r2', target: 'r3', color: '#64748b' },
    ],
  },
  {
    name: '📣 Pipeline de Contenido Social',
    description: 'Planificador → Visual → Base de Datos → Tarea',
    nodes: [
      { id: 's1', type: 'trigger', title: 'Planificador IA', subtitle: 'Origen', icon: 'Wand2', x: 80, y: 220, color: '#a855f7', pm2_process: '' },
      { id: 's2', type: 'action', title: 'Generador Visual', subtitle: 'Imagen 3', icon: 'Image', x: 340, y: 220, color: '#3b82f6', pm2_process: '' },
      { id: 's3', type: 'action', title: 'Base de Datos', subtitle: 'Guardar asset', icon: 'Database', x: 600, y: 220, color: '#64748b', pm2_process: '' },
      { id: 's4', type: 'action', title: 'Tarea de Studio', subtitle: 'CEO Estudio', icon: 'CheckSquare', x: 860, y: 220, color: '#10b981', pm2_process: '' },
    ],
    edges: [
      { id: 'e1', source: 's1', target: 's2', color: '#a855f7' },
      { id: 'e2', source: 's2', target: 's3', color: '#3b82f6' },
      { id: 'e3', source: 's3', target: 's4', color: '#64748b' },
    ],
  },
  {
    name: '🤖 Cerebro TikTok Bot',
    description: 'TikTok → Planificador IA → Tarea',
    nodes: [
      { id: 'tk1', type: 'trigger', title: 'TikTok Bot', subtitle: 'Interacción TikTok', icon: 'Video', x: 100, y: 220, color: '#ff0050', pm2_process: 'tiktok-bot' },
      { id: 'tk2', type: 'action', title: 'Planificador IA', subtitle: 'Generar respuesta', icon: 'Wand2', x: 380, y: 220, color: '#a855f7', pm2_process: '' },
      { id: 'tk3', type: 'action', title: 'Tarea de Studio', subtitle: 'CEO Estudio', icon: 'CheckSquare', x: 660, y: 220, color: '#10b981', pm2_process: '' },
    ],
    edges: [
      { id: 'e1', source: 'tk1', target: 'tk2', color: '#ff0050' },
      { id: 'e2', source: 'tk2', target: 'tk3', color: '#a855f7' },
    ],
  },
  {
    name: '🔁 Monitor de Sistema',
    description: 'Server → PM2 Status → Alerta WA',
    nodes: [
      { id: 'm1', type: 'trigger', title: 'Monitor Servidor', subtitle: 'Health Check', icon: 'Server', x: 100, y: 220, color: '#ef4444', pm2_process: 'godzilla-server' },
      { id: 'm2', type: 'action', title: 'Base de Datos', subtitle: 'Log de estado', icon: 'Database', x: 380, y: 220, color: '#64748b', pm2_process: '' },
      { id: 'm3', type: 'action', title: 'WhatsApp Bot', subtitle: 'Alerta crítica', icon: 'Smartphone', x: 660, y: 220, color: '#25d366', pm2_process: 'whatsapp-bot' },
    ],
    edges: [
      { id: 'e1', source: 'm1', target: 'm2', color: '#ef4444' },
      { id: 'e2', source: 'm2', target: 'm3', color: '#64748b' },
    ],
  },
];

// ─── Curved SVG connector ─────────────────────────────────────────────────────
const CurvedConnector = ({ startX, startY, endX, endY, color, animated = true }) => {
  const midX = (startX + endX) / 2;
  const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
  return (
    <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible" style={{ zIndex: 0 }}>
      <path d={path} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" opacity="0.25" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {animated && (
        <circle r="3.5" fill="#fff" opacity="0.9">
          <animateMotion dur="2.5s" repeatCount="indefinite" path={path} />
        </circle>
      )}
    </svg>
  );
};

// ─── Galaxy View ─────────────────────────────────────────────────────────────
function GalaxyView({ flows, pm2Status, onEditFlow, onNewFlow, onDeleteFlow, username }) {
  const containerRef = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(0.85);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef(null);

  const COLS = 3;
  const CARD_W = 340;
  const CARD_H = 200;
  const GAP = 60;

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setScale(s => Math.min(2, Math.max(0.3, s + delta)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };
  const onMouseMove = useCallback((e) => {
    if (!isPanning || !panStart.current) return;
    setOffset({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  }, [isPanning]);
  const onMouseUp = () => setIsPanning(false);

  const getCardPos = (idx) => ({
    x: (idx % COLS) * (CARD_W + GAP),
    y: Math.floor(idx / COLS) * (CARD_H + GAP),
  });

  const totalW = COLS * (CARD_W + GAP);
  const totalH = Math.ceil((flows.length + 1) / COLS) * (CARD_H + GAP);

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full h-full overflow-hidden relative"
      style={{ cursor: isPanning ? 'grabbing' : 'grab', background: 'radial-gradient(ellipse at 50% 50%, #0a0a1a 0%, #050505 100%)' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Star field */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Zoom hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-neutral-600 pointer-events-none select-none flex items-center gap-3">
        <span>🖱 Arrastra para mover</span><span>🔍 Rueda para zoom ({Math.round(scale * 100)}%)</span>
      </div>

      {/* Canvas */}
      <div
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '50% 50%', width: totalW, height: totalH, position: 'absolute', top: '50%', left: '50%', marginTop: -(totalH / 2), marginLeft: -(totalW / 2) }}
      >
        {flows.map((flow, idx) => {
          const { x, y } = getCardPos(idx);
          const isCore = flow.id === 1;
          const canEdit = !isCore || username === 'jareg';
          const nodeCount = parseInt(flow.node_count || 0);
          const edgeCount = parseInt(flow.edge_count || 0);
          const preview = flow.mini_nodes || [];

          return (
            <div
              key={flow.id}
              style={{ position: 'absolute', left: x, top: y, width: CARD_W, height: CARD_H }}
              className={`rounded-2xl border transition-all duration-300 select-none group ${
                isCore
                  ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-950/60 via-neutral-950 to-black shadow-[0_0_40px_rgba(234,179,8,0.2)]'
                  : 'border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black hover:border-neutral-600 shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
              } hover:scale-[1.03] cursor-pointer`}
              onDoubleClick={() => onEditFlow(flow.id)}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  {isCore && <span className="text-lg">👑</span>}
                  <div>
                    <p className={`text-sm font-black leading-none ${isCore ? 'text-yellow-300' : 'text-white'}`}>{flow.name}</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">ID #{flow.id} · Por {flow.created_by || 'sistema'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                  {username === 'jareg' && !isCore && (
                    <button
                      onClick={(e) => { e.stopPropagation(); if(window.confirm('¿Eliminar esta neurona?')) onDeleteFlow(flow.id); }}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-neutral-600 hover:text-rose-400 transition rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Mini stat bar */}
              <div className="flex items-center gap-3 px-4 py-1">
                <span className="text-[10px] text-neutral-500 flex items-center gap-1"><Layers className="w-3 h-3" /> {nodeCount} nodos</span>
                <span className="text-[10px] text-neutral-500 flex items-center gap-1"><Zap className="w-3 h-3" /> {edgeCount} conexiones</span>
                {flow.updated_at && <span className="text-[10px] text-neutral-600 ml-auto">{new Date(flow.updated_at).toLocaleDateString('es-MX')}</span>}
              </div>

              {/* Mini connector preview */}
              <div className="mx-4 mt-1 mb-3 h-16 relative bg-black/30 rounded-xl overflow-hidden border border-neutral-800/50">
                <div className="absolute inset-0 flex items-center justify-center">
                  {nodeCount === 0
                    ? <span className="text-[10px] text-neutral-700">Canvas vacío — doble clic para editar</span>
                    : (
                      <div className="flex items-center gap-1.5 px-3">
                        {Array.from({ length: Math.min(nodeCount, 5) }).map((_, i) => (
                          <React.Fragment key={i}>
                            <div className="w-6 h-6 rounded-md bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-neutral-500" />
                            </div>
                            {i < Math.min(nodeCount, 5) - 1 && <div className="flex-1 h-px bg-neutral-700 min-w-[8px]" />}
                          </React.Fragment>
                        ))}
                        {nodeCount > 5 && <span className="text-[9px] text-neutral-600 ml-1">+{nodeCount - 5}</span>}
                      </div>
                    )
                  }
                </div>
              </div>

              {/* Edit CTA */}
              <div className="flex items-center justify-between px-4 pb-3">
                <span className="text-[10px] text-neutral-600">Doble clic para editar</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onEditFlow(flow.id); }}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition ${
                    canEdit ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                  }`}
                >
                  {canEdit ? 'Editar →' : '🔒 Ver'}
                </button>
              </div>
            </div>
          );
        })}

        {/* New Neuron Card */}
        {(() => {
          const { x, y } = getCardPos(flows.length);
          return (
            <div
              key="new"
              style={{ position: 'absolute', left: x, top: y, width: CARD_W, height: CARD_H }}
              onClick={onNewFlow}
              className="rounded-2xl border-2 border-dashed border-neutral-800 hover:border-neutral-600 bg-black/20 hover:bg-neutral-900/30 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-700 group-hover:border-neutral-500 flex items-center justify-center transition-all">
                <Plus className="w-5 h-5 text-neutral-500 group-hover:text-white transition" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-neutral-500 group-hover:text-white transition">Nueva Neurona</p>
                <p className="text-[10px] text-neutral-700 mt-0.5">Crear automatización personalizada</p>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ─── Change Request Modal ─────────────────────────────────────────────────────
function ChangeRequestModal({ flowId, nodes, edges, username, onClose, onSubmitted }) {
  const [reason, setReason] = useState('');
  const [idea, setIdea] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim() || !idea.trim()) {
      alert('Por favor completa ambos campos.');
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/automation/change-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ flowId, reason, idea, nodes, edges }),
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Solicitud enviada a JareG para revisión.');
        onSubmitted();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      alert('Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-950 border border-yellow-500/40 rounded-2xl shadow-[0_0_40px_rgba(234,179,8,0.2)] w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">🔒 Solicitud de Cambio</h3>
            <p className="text-xs text-neutral-400 mt-0.5">Solo JareG puede editar el Sistema Central. Envía tu propuesta.</p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-yellow-400 mb-1.5 block">¿Por qué necesitas este cambio?</label>
            <textarea
              rows={2} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Ej: El flujo actual no notifica correctamente cuando una cita se cancela..."
              className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-yellow-500/60 transition resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-yellow-400 mb-1.5 block">¿Cuál es tu idea o solución?</label>
            <textarea
              rows={3} value={idea} onChange={e => setIdea(e.target.value)}
              placeholder="Ej: Agregar un nodo de WhatsApp Bot después de Calendario Global para enviar una alerta de cancelación automática..."
              className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-yellow-500/60 transition resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-neutral-800">
          <button onClick={onClose} className="flex-1 py-2.5 bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-white rounded-xl text-xs font-bold transition">Cancelar</button>
          <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl text-xs font-black transition disabled:opacity-50">
            {submitting ? 'Enviando...' : '📨 Enviar a JareG'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── Main EditorView (canvas existente) ──────────────────────────────────────
function EditorView({ flowId, flowName, username, pm2Status, onBack, onSaved }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isDraggingNode, setIsDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x:0, y:0 });
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [connectingToPos, setConnectingToPos] = useState(null);
  const [showNodeMenu, setShowNodeMenu] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [runHistory, setRunHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [executingNodes, setExecutingNodes] = useState(new Set());
  const [editName, setEditName] = useState(flowName || 'Sin nombre');
  const canvasRef = useRef(null);
  const isCore = flowId === 1;
  const canSave = !isCore || username === 'jareg';

  const nodeMap = useMemo(() => { const m = new Map(); nodes.forEach(n => m.set(n.id, n)); return m; }, [nodes]);
  const selectedNode = nodeMap.get(selectedNodeId);
  const NODE_PRESETS = [
    { title:'Cerebro Central AI', subtitle:'Motor RAG/Lógica', icon:'Brain', color:'#eab308', pm2_process:'ai-core' },
    { title:'Memoria a Largo Plazo', subtitle:'Base Vectorial', icon:'Network', color:'#0d9488', pm2_process:'vector-db' },
    { title:'Godzilla CM', subtitle:'Gestor de Leads/Tareas', icon:'LayoutDashboard', color:'#2563eb', pm2_process:'' },
    { title:'Planificador IA', subtitle:'Origen', icon:'Wand2', color:'#a855f7', pm2_process:'' },
    { title:'Generador Visual', subtitle:'Imagen 3 API', icon:'Image', color:'#3b82f6', pm2_process:'' },
    { title:'Generador Video', subtitle:'Veo / Kling', icon:'Video', color:'#f59e0b', pm2_process:'' },
    { title:'Tarea de Studio', subtitle:'CEO Estudio', icon:'CheckSquare', color:'#10b981', pm2_process:'' },
    { title:'Email Worker', subtitle:'Notificación', icon:'Mail', color:'#f97316', pm2_process:'email-worker' },
    { title:'WhatsApp Bot', subtitle:'Alerta WA', icon:'Smartphone', color:'#25d366', pm2_process:'whatsapp-bot' },
    { title:'TikTok Bot', subtitle:'Interacción TikTok', icon:'Video', color:'#ff0050', pm2_process:'tiktok-bot' },
    { title:'IG / Messenger Bot', subtitle:'Interacción Meta', icon:'MessageCircle', color:'#d946ef', pm2_process:'meta-bot' },
    { title:'Calendario Global', subtitle:'Registrar cita', icon:'Calendar', color:'#8b5cf6', pm2_process:'' },
    { title:'Base de Datos', subtitle:'Persistencia', icon:'Database', color:'#64748b', pm2_process:'' },
    { title:'Monitor Servidor', subtitle:'Health Check', icon:'Server', color:'#ef4444', pm2_process:'godzilla-server' },
    { title:'Webhook Entrada', subtitle:'API Externa', icon:'Globe', color:'#06b6d4', pm2_process:'' },
    { title:'Router / Switch', subtitle:'Condición Lógica', icon:'GitBranch', color:'#f43f5e', pm2_process:'' },
    { title:'Reloj / Cron', subtitle:'Programador', icon:'Timer', color:'#14b8a6', pm2_process:'' },
    { title:'Transformador JSON', subtitle:'Data Mapper', icon:'Braces', color:'#f59e0b', pm2_process:'' },
    { title:'HTTP Request', subtitle:'API Call', icon:'Send', color:'#6366f1', pm2_process:'' },
    { title:'Zilla Bot', subtitle:'Asistente / Atención', icon:'Bot', color:'#10b981', pm2_process:'zilla-bot' },
    { title:'Goyi Bot', subtitle:'Asistente / Cierre', icon:'Bot', color:'#ec4899', pm2_process:'goyi-bot' },
    { title:'Bot Newsletter', subtitle:'Redacción / Difusión', icon:'Mail', color:'#f97316', pm2_process:'newsletter-bot' },
    { title:'Trends Bot', subtitle:'Analizador Redes', icon:'TrendingUp', color:'#8b5cf6', pm2_process:'trends-bot' },
    { title:'Cloudflare Workers', subtitle:'Gateway Edge', icon:'Cloud', color:'#f38020', pm2_process:'' },
    { title:'Vercel', subtitle:'Hosting / Deployment', icon:'Server', color:'#ffffff', pm2_process:'' },
    { title:'Brevo', subtitle:'Email Marketing', icon:'Mail', color:'#0092ff', pm2_process:'' },
    { title:'GoDaddy', subtitle:'DNS / Dominios', icon:'Globe', color:'#1bbb11', pm2_process:'' },
    { title:'Gemini API', subtitle:'LLM Core', icon:'Sparkles', color:'#4285f4', pm2_process:'' },
    { title:'Stripe', subtitle:'Pasarela Pagos', icon:'CreditCard', color:'#6366f1', pm2_process:'' },
    { title:'Neon DB', subtitle:'PostgreSQL Serverless', icon:'Database', color:'#00e599', pm2_process:'' },
  ];

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    fetch(`/api/automation/flow?id=${flowId}`, { headers:{ Authorization:`Bearer ${token}` } })
      .then(r => r.json()).then(d => { 
        if(d.success){ 
          if (d.name === 'Sistema Central' || flowId === 'central') {
            setNodes(FLOW_TEMPLATES[0].nodes);
            setEdges(FLOW_TEMPLATES[0].edges);
          } else {
            let safeNodes = d.nodes || [];
            let safeEdges = d.edges || [];
            if (typeof safeNodes === 'string') {
              try { safeNodes = JSON.parse(safeNodes); } catch(e) { safeNodes = []; }
            }
            if (typeof safeEdges === 'string') {
              try { safeEdges = JSON.parse(safeEdges); } catch(e) { safeEdges = []; }
            }
            setNodes(Array.isArray(safeNodes) ? safeNodes : []); 
            setEdges(Array.isArray(safeEdges) ? safeEdges : []); 
          }
          if(d.name) setEditName(d.name); 
        } 
      })
      .catch(()=>{}).finally(()=>setIsLoading(false));
    fetch('/api/automation/runs',{ headers:{ Authorization:`Bearer ${token}` } })
      .then(r=>r.json()).then(d=>{ if(d.success) setRunHistory(d.runs||[]); }).catch(()=>{});
  }, [flowId]);

  const handlePointerDown = (e, id) => {
    e.stopPropagation();
    if (e.target.dataset.port === 'out') { setConnectingFrom(id); setConnectingToPos({x:e.clientX,y:e.clientY}); return; }
    setSelectedNodeId(id);
    const el = document.getElementById(`node-${id}`);
    if(el && canvasRef.current){ const r = el.getBoundingClientRect(); setDragOffset({x:e.clientX-r.left,y:e.clientY-r.top}); setIsDraggingNode(id); }
  };
  const handlePointerMove = (e) => {
    if(!canvasRef.current) return;
    const cr = canvasRef.current.getBoundingClientRect();
    const nx = e.clientX-cr.left+canvasRef.current.scrollLeft, ny = e.clientY-cr.top+canvasRef.current.scrollTop;
    if(connectingFrom) setConnectingToPos({x:nx,y:ny});
    else if(isDraggingNode) setNodes(p=>p.map(n=>n.id===isDraggingNode?{...n,x:nx-dragOffset.x,y:ny-dragOffset.y}:n));
  };
  const handlePointerUp = (e) => {
    if(connectingFrom){
      const tgt = document.elementFromPoint(e.clientX,e.clientY)?.closest('.node-container');
      if(tgt){ const tid=tgt.getAttribute('data-id'); if(tid&&tid!==connectingFrom){ const src=nodeMap.get(connectingFrom); setEdges(p=>[...p,{id:`e${connectingFrom}-${tid}-${Date.now()}`,source:connectingFrom,target:tid,color:src?.color||'#fff'}]); } }
    }
    setIsDraggingNode(null); setConnectingFrom(null); setConnectingToPos(null);
  };

  const addPreset = (p) => {
    const id=Date.now().toString(), vx=(canvasRef.current?.scrollLeft||0)+300, vy=(canvasRef.current?.scrollTop||0)+200;
    setNodes(n=>[...n,{id,type:p.title==='Planificador IA'?'trigger':'action',title:p.title,subtitle:p.subtitle,icon:p.icon,x:vx+Math.random()*50,y:vy+Math.random()*50,color:p.color,pm2_process:p.pm2_process}]);
    setSelectedNodeId(id); setShowNodeMenu(false);
  };
  const loadTemplate = (t) => {
    if(nodes.length>0 && !window.confirm('Esto reemplazará el canvas actual. ¿Continuar?')) return;
    const idMap={};
    const nn=t.nodes.map(n=>{ const nid=`n_${Math.random().toString(36).substr(2,8)}`; idMap[n.id]=nid; return{...n,id:nid}; });
    const ne=t.edges.map(e=>({...e,id:`e_${Math.random().toString(36).substr(2,8)}`,source:idMap[e.source],target:idMap[e.target]}));
    setNodes(nn); setEdges(ne); setSelectedNodeId(null); setShowTemplateMenu(false);
  };
  const deleteNode = (id) => { setNodes(p=>p.filter(n=>n.id!==id)); setEdges(p=>p.filter(e=>e.source!==id&&e.target!==id)); if(selectedNodeId===id) setSelectedNodeId(null); };
  const updateNode = (upd) => setNodes(p=>p.map(n=>n.id===selectedNodeId?{...n,...upd}:n));

  const handleSave = async () => {
    if(!canSave){ setShowChangeModal(true); return; }
    const token=localStorage.getItem('adminToken');
    try {
      const r=await fetch('/api/automation/flow',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({nodes,edges,flowId,name:editName})});
      const d=await r.json();
      if(d.success){ onSaved(); } else alert('Error: '+d.error);
    } catch(e){ alert('Error de conexión.'); }
  };

  const executeFlow = async () => {
    const src=nodes.find(n=>n.title==='Planificador IA');
    if(!src){ alert('Agrega un nodo "Planificador IA" para ejecutar.'); return; }
    const token=localStorage.getItem('adminToken');
    setIsExecuting(true); setExecutingNodes(new Set(nodes.map(n=>n.id)));
    try { await fetch('/api/automation/trigger',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({sourceTitle:'Planificador IA',payload:{}})}); }
    catch(e){}
    setTimeout(async()=>{
      try{ const r=await fetch('/api/automation/runs',{headers:{Authorization:`Bearer ${token}`}}); const d=await r.json(); if(d.success){setRunHistory(d.runs||[]);setShowHistory(true);} }catch(e){}
      setIsExecuting(false); setExecutingNodes(new Set());
    },4000);
  };

  if(isLoading) return <div className="flex-1 flex items-center justify-center text-neutral-600 text-sm">Cargando flujo...</div>;

  const NODE_W=160, NODE_H=120;
  const nodePositions=new Map(nodes.map(n=>[n.id,{cx:n.x+NODE_W/2,cy:n.y+NODE_H/2,rx:n.x+NODE_W,ry:n.y+NODE_H/2,lx:n.x,ly:n.y+NODE_H/2}]));

  const flowHealth = (() => {
    if (nodes.length === 0) return { status: 'empty', msg: 'Arrastra un nodo desde Añadir para comenzar a construir tu neurona.' };
    const hasTrigger = nodes.some(n => n.type === 'trigger' || ['Webhook Entrada', 'Reloj / Cron', 'Zilla Bot', 'Goyi Bot', 'WhatsApp Bot', 'TikTok Bot', 'IG / Messenger Bot', 'GoDaddy', 'Vercel'].includes(n.title));
    const hasAction = nodes.some(n => n.type === 'action' || ['Cerebro Central AI', 'Memoria a Largo Plazo', 'Godzilla CM', 'Calendario Global', 'Bot Newsletter', 'Trends Bot', 'Brevo', 'Stripe', 'Neon DB'].includes(n.title));
    
    // Check missing configs
    const missing = nodes.find(n => {
      if (n.title === 'Webhook Entrada' && (!n.config?.method || !n.config?.url)) return true;
      if (n.title === 'Reloj / Cron' && !n.config?.cron) return true;
      if (n.title === 'Cerebro Central AI' && !n.config?.prompt) return true;
      if (n.title === 'Calendario Global' && !n.config?.action) return true;
      if (['WhatsApp Bot', 'TikTok Bot', 'IG / Messenger Bot'].includes(n.title) && !n.config?.fallback) return true;
      return false;
    });

    if (missing) return { status: 'warning', msg: `⚠️ El nodo "${missing.title}" requiere configuración. Seleccionalo y completa los campos obligatorios.` };
    if (!hasTrigger) return { status: 'error', msg: '🛑 Falta un Nodo Origen (Trigger). El flujo necesita saber cómo iniciarse (ej. Webhook, Cron, Bot).' };
    if (!hasAction) return { status: 'error', msg: '🛑 Falta un Nodo Acción (Salida). El flujo se activa pero no hace nada (ej. Guardar en DB, Enviar Email).' };
    if (edges.length === 0 && nodes.length > 1) return { status: 'warning', msg: '⚠️ Conecta los nodos arrastrando desde el punto de salida al punto de entrada.' };
    return { status: 'success', msg: '✅ Flujo válido y listo para ejecutarse en el servidor.' };
  })();

  return (
    <div className="flex-1 flex flex-col overflow-hidden"
      onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>

      {showChangeModal && <ChangeRequestModal flowId={flowId} nodes={nodes} edges={edges} username={username} onClose={()=>setShowChangeModal(false)} onSubmitted={()=>setShowChangeModal(false)} />}

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-neutral-800 bg-black/60 backdrop-blur-xl shrink-0 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-1.5 text-neutral-400 hover:text-white text-xs font-bold transition">
          <ArrowLeft className="w-4 h-4"/>Galaxia
        </button>
        <div className="w-px h-5 bg-neutral-800"/>
        {isCore && <span className="text-sm">👑</span>}
        <input value={editName} onChange={e=>setEditName(e.target.value)} disabled={!canSave}
          className="bg-transparent text-sm font-black text-white outline-none border-b border-transparent focus:border-neutral-600 transition w-48 disabled:text-neutral-500" />
        <div className="flex-1"/>
        <button onClick={()=>setShowHistory(!showHistory)} className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-neutral-400 px-3 py-1.5 rounded-xl text-xs font-bold transition">
          <Clock className="w-3.5 h-3.5"/>{runHistory.length>0&&<span className={`w-1.5 h-1.5 rounded-full ${runHistory[0]?.status==='success'?'bg-emerald-400':runHistory[0]?.status==='error'?'bg-rose-400':'bg-yellow-400'}`}/>}
        </button>
        <button onClick={executeFlow} disabled={isExecuting} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${isExecuting?'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 cursor-wait animate-pulse':'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border-emerald-500/30'}`}>
          <Play className="w-3.5 h-3.5"/>{isExecuting?'Ejecutando...':'Ejecutar'}
        </button>
        {/* Plantillas */}
        <div className="relative">
          <button onClick={()=>{setShowTemplateMenu(!showTemplateMenu);setShowNodeMenu(false);}} className="flex items-center gap-1.5 bg-purple-900/30 border border-purple-500/30 hover:border-purple-400 text-purple-300 px-3 py-1.5 rounded-xl text-xs font-bold transition">
            <Wand2 className="w-3.5 h-3.5"/>Plantillas
          </button>
          {showTemplateMenu&&(
            <div className="absolute top-full mt-2 right-0 w-72 bg-neutral-950 border border-neutral-800 shadow-2xl rounded-xl overflow-hidden z-50">
              <div className="p-2 border-b border-neutral-800"><span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold px-2">Plantillas Rápidas</span></div>
              <div className="max-h-64 overflow-y-auto">
                {FLOW_TEMPLATES.map((t,i)=>(
                  <button key={i} onClick={()=>loadTemplate(t)} className="w-full text-left p-3 hover:bg-neutral-800 flex flex-col gap-0.5 border-b border-neutral-800/50 last:border-0 transition">
                    <p className="text-xs text-purple-300 font-bold">{t.name}</p>
                    <p className="text-[10px] text-neutral-500">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* Añadir Nodo */}
        <div className="relative">
          <button onClick={()=>{setShowNodeMenu(!showNodeMenu);setShowTemplateMenu(false);}} className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-700 hover:border-white text-white px-3 py-1.5 rounded-xl text-xs font-bold transition">
            <Plus className="w-3.5 h-3.5"/>Añadir
          </button>
          {showNodeMenu&&(
            <div className="absolute top-full mt-2 right-0 w-60 bg-neutral-950 border border-neutral-800 shadow-2xl rounded-xl overflow-hidden z-50">
              <div className="p-2 border-b border-neutral-800"><span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold px-2">Catálogo</span></div>
              <div className="max-h-64 overflow-y-auto p-1">
                {NODE_PRESETS.map((p,i)=>(
                  <button key={i} onClick={()=>addPreset(p)} className="w-full text-left p-2 hover:bg-neutral-800 rounded flex items-center gap-2.5 transition group">
                    <div className="w-7 h-7 rounded flex items-center justify-center shrink-0" style={{backgroundColor:`${p.color}22`,color:p.color}}>
                      {React.createElement(getIcons()[p.icon]||Webhook,{className:'w-3.5 h-3.5'})}
                    </div>
                    <div>
                      <p className="text-xs text-white font-bold">{p.title}</p>
                      <p className="text-[10px] text-neutral-500">{p.pm2_process?`PM2: ${p.pm2_process}`:'Nativo'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <button onClick={handleSave} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black transition border ${canSave?'bg-white text-black border-white/20 hover:bg-neutral-200':'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20'}`}>
          {canSave?'💾 Guardar':'🔒 Proponer'}
        </button>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-900/20 px-3 py-1.5 rounded-xl border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>ACTIVO
        </span>
      </div>

      {/* Run History panel */}
      {showHistory&&(
        <div className="shrink-0 border-b border-neutral-800 bg-black/50 max-h-36 overflow-y-auto">
          {runHistory.length===0?<p className="text-xs text-neutral-600 p-3">Sin ejecuciones previas.</p>:runHistory.map(r=>(
            <div key={r.id} className="flex items-center gap-3 px-4 py-2 border-b border-neutral-900 text-xs">
              {r.status==='success'?<CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0"/>:<XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0"/>}
              <span className="text-neutral-300 font-bold">{r.source}</span>
              <span className="text-neutral-500">{r.duration_ms}ms</span>
              <span className="text-neutral-600 ml-auto">{new Date(r.started_at).toLocaleTimeString('es-MX')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Educational Banner */}
      <div className={`shrink-0 p-2.5 flex items-center justify-center text-xs font-bold transition-colors ${
        flowHealth.status === 'success' ? 'bg-emerald-900/30 border-b border-emerald-500/40 text-emerald-400' :
        flowHealth.status === 'warning' ? 'bg-yellow-900/30 border-b border-yellow-500/40 text-yellow-400' :
        flowHealth.status === 'error' ? 'bg-rose-900/30 border-b border-rose-500/40 text-rose-400' :
        'bg-neutral-900 border-b border-neutral-800 text-neutral-400'
      }`}>
        {flowHealth.msg}
      </div>

      {/* Canvas */}
      <div ref={canvasRef} className="flex-1 overflow-auto relative" style={{background:'#060608'}}
        onClick={e=>{if(e.target===canvasRef.current){setSelectedNodeId(null);setShowNodeMenu(false);setShowTemplateMenu(false);}}}>
        <div style={{backgroundImage:'radial-gradient(rgba(255,255,255,0.04) 1px,transparent 1px)',backgroundSize:'28px 28px'}} className="min-w-[2400px] min-h-[1600px] relative">

          {/* Draw edges */}
          {edges.map(e=>{
            const s=nodePositions.get(e.source), t=nodePositions.get(e.target);
            if(!s||!t) return null;
            return <CurvedConnector key={e.id} startX={s.rx} startY={s.ry} endX={t.lx} endY={t.ly} color={e.color} animated={!isExecuting}/>;
          })}
          {connectingFrom&&connectingToPos&&(()=>{
            const s=nodePositions.get(connectingFrom);
            if(!s) return null;
            return <CurvedConnector startX={s.rx} startY={s.ry} endX={connectingToPos.x} endY={connectingToPos.y} color="#666" animated={false}/>;
          })()}

          {/* Draw nodes */}
          {nodes.map(n=>{
            const Icon=getIcons()[n.icon]||Webhook;
            const isSelected=selectedNodeId===n.id;
            const isRunning=executingNodes.has(n.id);
            const isTrigger=n.type==='trigger';
            const isCoreNode=n.title==='Cerebro Central AI'||n.title==='Memoria a Largo Plazo';
            return (
              <div key={n.id} id={`node-${n.id}`} data-id={n.id}
                className={`node-container absolute select-none ${isSelected?'z-30':'z-20'}`}
                style={{left:n.x,top:n.y,width:NODE_W,height:NODE_H}}
                onPointerDown={e=>handlePointerDown(e,n.id)}>
                <div className={`w-full h-full rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-200 cursor-grab active:cursor-grabbing ${
                  isRunning?'animate-pulse shadow-[0_0_30px_rgba(52,211,153,0.5)] border-emerald-400':
                  isSelected?'shadow-[0_0_24px_rgba(255,255,255,0.15)] border-white/50':
                  isCoreNode?'border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.25)] animate-[pulse_3s_ease-in-out_infinite]':
                  isTrigger?'border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.25)]':
                  'border-neutral-700 hover:border-neutral-500'
                }`} style={{background:`linear-gradient(135deg,${n.color}18 0%,#111 100%)`}}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{backgroundColor:`${n.color}28`,border:`1px solid ${n.color}40`}}>
                    <Icon className="w-5 h-5" style={{color:n.color}}/>
                  </div>
                  <div className="text-center px-2">
                    <p className="text-[11px] font-black text-white leading-none">{n.title}</p>
                    <p className="text-[9px] text-neutral-500 mt-0.5 uppercase tracking-wider">{n.subtitle}</p>
                    {n.config?.displayValue && (
                      <span className="inline-block mt-1.5 px-2 py-0.5 bg-black/40 rounded-md text-[8px] text-neutral-300 font-bold border border-neutral-700/50 max-w-[130px] truncate">
                        {n.config.displayValue}
                      </span>
                    )}
                  </div>
                  {/* Out port */}
                  <div data-port="out" className="absolute right-[-7px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-neutral-600 bg-neutral-900 hover:border-white hover:bg-white cursor-crosshair z-10"/>
                  {/* In port */}
                  <div className="absolute left-[-7px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-neutral-700 bg-neutral-900"/>
                  {isTrigger&&<div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center"><Zap className="w-2.5 h-2.5 text-white"/></div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right config panel */}
      {selectedNode&&(
        <div className="absolute top-16 right-0 bottom-0 w-72 bg-neutral-950 border-l border-neutral-800 flex flex-col z-40 shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-neutral-800">
            <p className="text-sm font-black text-white">Configuración</p>
            <button onClick={()=>setSelectedNodeId(null)} className="text-neutral-500 hover:text-white"><X className="w-4 h-4"/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div><label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">Título</label>
              <input value={selectedNode.title} onChange={e=>updateNode({title:e.target.value})} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition"/></div>
            <div><label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">Subtítulo</label>
              <input value={selectedNode.subtitle||''} onChange={e=>updateNode({subtitle:e.target.value})} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition"/></div>
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase mb-2 block">Color</label>
              <div className="flex gap-2 flex-wrap">
                {['#a855f7','#3b82f6','#10b981','#f59e0b','#f97316','#ef4444','#06b6d4','#25d366','#64748b','#ff0050'].map(c=>(
                  <button key={c} onClick={()=>updateNode({color:c})} className="w-7 h-7 rounded-lg border-2 transition" style={{backgroundColor:c,borderColor:selectedNode.color===c?'#fff':'transparent'}}/>
                ))}
              </div>
            </div>
            <div><label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">PM2 Process (Opcional)</label>
              <input value={selectedNode.pm2_process||''} onChange={e=>updateNode({pm2_process:e.target.value})} placeholder="ej. whatsapp-bot" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition"/></div>
            
            
            {/* Dynamic Config Block */}
            <div className="pt-3 mt-3 border-t border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-yellow-400 uppercase flex items-center gap-1.5"><Settings2 className="w-3 h-3"/> Ajustes Obligatorios</label>
                <span className="text-[8px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/30">Admite {"{{ $json.var }}"}</span>
              </div>
              
              {selectedNode.title === 'Webhook Entrada' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">Método HTTP</label>
                    <select value={selectedNode.config?.method||''} onChange={e=>updateNode({config:{...selectedNode.config, method:e.target.value}})} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition">
                      <option value="">Selecciona...</option>
                      <option value="POST">POST</option>
                      <option value="GET">GET</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">Endpoint URL</label>
                    <input value={selectedNode.config?.url||''} onChange={e=>updateNode({config:{...selectedNode.config, url:e.target.value}})} placeholder="/api/hooks/mi-evento" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition"/>
                  </div>
                </div>
              )}

              {selectedNode.title === 'Cerebro Central AI' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">Modelo LLM</label>
                    <select value={selectedNode.config?.model||''} onChange={e=>updateNode({config:{...selectedNode.config, model:e.target.value}})} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition">
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Rápido)</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (Razonamiento)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">System Prompt</label>
                    <textarea value={selectedNode.config?.prompt||''} onChange={e=>updateNode({config:{...selectedNode.config, prompt:e.target.value}})} placeholder="Eres un asistente experto. Evalúa este JSON: {{ $json.mensaje }}" rows={3} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition resize-none"/>
                  </div>
                </div>
              )}

              {selectedNode.title === 'Reloj / Cron' && (
                <div>
                  <label className="text-[10px] text-neutral-400 mb-1 block">Expresión Cron</label>
                  <input value={selectedNode.config?.cron||''} onChange={e=>updateNode({config:{...selectedNode.config, cron:e.target.value}})} placeholder="0 9 * * 1 (Ej. Lunes 9 AM)" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition"/>
                </div>
              )}

              {['WhatsApp Bot', 'TikTok Bot', 'IG / Messenger Bot'].includes(selectedNode.title) && (
                <div>
                  <label className="text-[10px] text-neutral-400 mb-1 block">Mensaje / Fallback Reply</label>
                  <textarea value={selectedNode.config?.fallback||''} onChange={e=>updateNode({config:{...selectedNode.config, fallback:e.target.value}})} placeholder="Hola {{ $json.nombre }}, recibimos tu solicitud." rows={2} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition resize-none"/>
                </div>
              )}

              {selectedNode.title === 'Calendario Global' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">Acción de Calendario</label>
                    <select value={selectedNode.config?.action||''} onChange={e=>updateNode({config:{...selectedNode.config, action:e.target.value}})} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition">
                      <option value="">Selecciona...</option>
                      <option value="Agendar">Agendar Cita</option>
                      <option value="Leer">Leer Disponibilidad</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">Datos de Cita (JSON)</label>
                    <input value={selectedNode.config?.payload||''} onChange={e=>updateNode({config:{...selectedNode.config, payload:e.target.value}})} placeholder="{ fecha: '{{ $json.date }}' }" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition"/>
                  </div>
                </div>
              )}

              {['Brevo', 'GoDaddy'].includes(selectedNode.title) && (
                <div>
                  <label className="text-[10px] text-neutral-400 mb-1 block">API Key / Token (Oculto)</label>
                  <input type="password" value={selectedNode.config?.apiKey||''} onChange={e=>updateNode({config:{...selectedNode.config, apiKey:e.target.value}})} placeholder="••••••••••••••••" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-rose-500 transition"/>
                </div>
              )}

              {['Gemini API', 'Stripe', 'Neon DB', 'Cloudflare Workers', 'Vercel'].includes(selectedNode.title) && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 mt-2">
                  <p className="text-[10px] font-bold text-emerald-400 mb-1 flex items-center gap-1.5"><Shield className="w-3 h-3"/> Credenciales Nativas Seguras</p>
                  <p className="text-[8.5px] text-emerald-500/70 leading-tight">API administrada desde las variables de entorno locales (<code>.env</code>). Todo el tráfico entrante/saliente está monitoreado activamente por el WAF.</p>
                </div>
              )}

            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
              <p className="text-[10px] font-bold text-blue-400 mb-1 flex items-center gap-1"><Power className="w-3 h-3"/>Motor</p>
              {selectedNode.pm2_process
                ? (() => { const p=pm2Status.find(x=>x.name===selectedNode.pm2_process); return p?<p className="text-[10px] text-emerald-400 font-bold">🟢 ONLINE · {Math.round(p.memory/1024/1024)}MB · {p.cpu}%</p>:<p className="text-[10px] text-rose-400 font-bold">🔴 OFFLINE</p>; })()
                : <><p className="text-[10px] text-emerald-400 font-bold">🟢 ONLINE - Integración Nativa</p><p className="text-[9px] text-emerald-500/60">Corre dentro del núcleo de Godzilla Server.</p></>
              }
            </div>
          </div>
          <div className="p-4 border-t border-neutral-800">
            <button onClick={()=>deleteNode(selectedNode.id)} className="w-full py-2.5 flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition">
              <Trash2 className="w-3.5 h-3.5"/>Eliminar Nodo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
// ─── Root AutomationFlow Component ───────────────────────────────────────────
export default function AutomationFlow() {
  const [view, setView] = useState('galaxy'); // 'galaxy' | 'editor'
  const [flows, setFlows] = useState([]);
  const [pm2Status, setPm2Status] = useState([]);
  const [isLoadingGalaxy, setIsLoadingGalaxy] = useState(true);
  const [activeFlowId, setActiveFlowId] = useState(null);
  const [activeFlowName, setActiveFlowName] = useState('');
  const [pendingRequests, setPendingRequests] = useState([]);

  const adminProfile = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('godzilla_cached_profile')) || {}; } catch { return {}; }
  }, []);
  const username = (adminProfile.username || '').toLowerCase();
  const isJareg = username === 'jareg';

  const loadGalaxy = useCallback(async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    setIsLoadingGalaxy(true);
    try {
      const [flowsRes, statusRes] = await Promise.all([
        fetch('/api/automation/flows', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/automation/status', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const fd = await flowsRes.json();
      const sd = await statusRes.json();
      if (fd.success) {
        const mappedFlows = (fd.flows || []).map(flow => {
          if (flow.name === 'Sistema Central' || flow.id === 'central') {
            return { ...flow, nodes: FLOW_TEMPLATES[0].nodes, edges: FLOW_TEMPLATES[0].edges };
          }
          return flow;
        });
        setFlows(mappedFlows);
      }
      if (sd.success) setPm2Status(sd.pm2 || []);

      if (isJareg) {
        const pr = await fetch('/api/automation/change-requests', { headers: { Authorization: `Bearer ${token}` } });
        const pd = await pr.json();
        if (pd.success) setPendingRequests(pd.requests || []);
      }
    } catch (e) { console.error(e); }
    finally { setIsLoadingGalaxy(false); }
  }, [isJareg]);

  useEffect(() => { loadGalaxy(); }, [loadGalaxy]);

  const handleEditFlow = (id) => {
    const f = flows.find(x => x.id === id);
    setActiveFlowId(id);
    setActiveFlowName(f?.name || 'Sin nombre');
    setView('editor');
  };

  const handleNewFlow = async () => {
    const name = window.prompt('Nombre de la nueva Neurona:', 'Nueva Automatización');
    if (!name) return;
    const token = localStorage.getItem('adminToken');
    try {
      const r = await fetch('/api/automation/flow/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });
      const d = await r.json();
      if (d.success) { setActiveFlowId(d.flowId); setActiveFlowName(name); setView('editor'); }
    } catch (e) { alert('Error creando neurona.'); }
  };

  const handleDeleteFlow = async (id) => {
    const token = localStorage.getItem('adminToken');
    try {
      const r = await fetch(`/api/automation/flow/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (d.success) loadGalaxy(); else alert(d.error);
    } catch (e) { alert('Error eliminando neurona.'); }
  };

  const handleSaved = () => { setView('galaxy'); loadGalaxy(); };

  const handleApprove = async (id) => {
    const token = localStorage.getItem('adminToken');
    const r = await fetch(`/api/automation/change-requests/${id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    alert(d.success ? '✅ Aprobado y aplicado.' : '❌ ' + d.error);
    loadGalaxy();
  };
  const handleReject = async (id) => {
    const token = localStorage.getItem('adminToken');
    await fetch(`/api/automation/change-requests/${id}/reject`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    loadGalaxy();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#060608] text-white font-sans">

      {/* Galaxy Header */}
      {view === 'galaxy' && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/60 bg-black/60 backdrop-blur-xl shrink-0">
          <div>
            <h1 className="text-base font-black text-white flex items-center gap-2">⚡ Sistema de Automatización</h1>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">Cerebro de Godzilla — {flows.length} Neuron{flows.length!==1?'as':'a'} activa{flows.length!==1?'s':''}</p>
          </div>
          <div className="flex items-center gap-3">
            {isJareg && pendingRequests.length > 0 && (
              <div className="relative">
                <button className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-3 py-2 rounded-xl text-xs font-bold hover:bg-yellow-500/20 transition">
                  📨 {pendingRequests.length} Solicitud{pendingRequests.length!==1?'es':''}
                </button>
              </div>
            )}
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-900/20 px-3 py-2 rounded-xl border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>SISTEMA ACTIVO
            </span>
          </div>
        </div>
      )}

      {/* Pending Change Requests (JareG only) */}
      {view === 'galaxy' && isJareg && pendingRequests.length > 0 && (
        <div className="shrink-0 border-b border-yellow-500/20 bg-yellow-950/10 px-6 py-3 flex flex-col gap-2 max-h-40 overflow-y-auto">
          <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest mb-1">🔒 Solicitudes Pendientes</p>
          {pendingRequests.map(req => (
            <div key={req.id} className="flex items-center gap-3 bg-black/40 rounded-xl px-3 py-2 border border-yellow-500/10">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white">{req.requested_by} · Flujo #{req.flow_id}</p>
                <p className="text-[10px] text-neutral-400 truncate"><span className="text-yellow-400">¿Por qué?</span> {req.reason}</p>
                <p className="text-[10px] text-neutral-400 truncate"><span className="text-purple-400">Idea:</span> {req.idea}</p>
              </div>
              <button onClick={()=>handleApprove(req.id)} className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg text-[10px] font-black transition">✓</button>
              <button onClick={()=>handleReject(req.id)} className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 rounded-lg text-[10px] font-black transition">✗</button>
            </div>
          ))}
        </div>
      )}

      {/* Views */}
      {view === 'galaxy' ? (
        isLoadingGalaxy
          ? <div className="flex-1 flex items-center justify-center text-neutral-600 text-sm">Cargando neuronas...</div>
          : <GalaxyView flows={flows} pm2Status={pm2Status} onEditFlow={handleEditFlow} onNewFlow={handleNewFlow} onDeleteFlow={handleDeleteFlow} username={username} />
      ) : (
        <EditorView flowId={activeFlowId} flowName={activeFlowName} username={username} pm2Status={pm2Status} onBack={()=>{ setView('galaxy'); loadGalaxy(); }} onSaved={handleSaved} />
      )}
    </div>
  );
}

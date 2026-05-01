import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Bot, MessageCircle, Webhook, Zap, Calendar, Server, Plus, Minus, Settings2, X, Trash2, Shield, Activity, Power, Smartphone, Video, Camera, Database, Mail, Wand2, CheckSquare, Image, Play, Clock, CheckCircle, XCircle, ArrowLeft, ArrowLeftRight, Layers, Cpu, Globe, Brain, Network, LayoutDashboard, GitBranch, Timer, Braces, Send, Sparkles, Cloud, CreditCard, TrendingUp, Search } from 'lucide-react';

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
      { id: 'ugc1', type: 'action', title: 'Planificador IA', subtitle: 'Origen Mensual', icon: 'Wand2', x: 1200, y: 500, color: '#a855f7', pm2_process: 'ai-core' },
      { id: 'ugc2', type: 'action', title: 'Generador Visual', subtitle: 'Imagen 3', icon: 'Image', x: 1500, y: 400, color: '#3b82f6', pm2_process: 'ai-core' },
      { id: 'ugc3', type: 'action', title: 'Generador Video', subtitle: 'Veo / Kling', icon: 'Video', x: 1500, y: 600, color: '#f59e0b', pm2_process: 'ai-core' },
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
    name: '🧠 RAG B2B LinkedIn',
    description: 'LinkedIn → Vector DB → Claude → CRM',
    nodes: [
      { id: 'l1', type: 'trigger', title: 'LinkedIn Bot', subtitle: 'Nuevo Lead', icon: 'Network', x: 100, y: 220, color: '#0a66c2', pm2_process: 'linkedin-bot' },
      { id: 'l2', type: 'action', title: 'Memoria a Largo Plazo', subtitle: 'Consultar RAG', icon: 'Network', x: 380, y: 100, color: '#0d9488', pm2_process: 'vector-db' },
      { id: 'l3', type: 'action', title: 'Anthropic Claude', subtitle: 'Generar Propuesta', icon: 'Brain', x: 380, y: 340, color: '#d97757', pm2_process: '' },
      { id: 'l4', type: 'action', title: 'Godzilla CM', subtitle: 'Guardar Lead', icon: 'LayoutDashboard', x: 660, y: 220, color: '#2563eb', pm2_process: '' },
    ],
    edges: [
      { id: 'e1', source: 'l1', target: 'l2', color: '#0a66c2' },
      { id: 'e2', source: 'l2', target: 'l3', color: '#0d9488' },
      { id: 'e3', source: 'l3', target: 'l4', color: '#d97757' },
    ],
  },
  {
    name: '🎙️ Podcast a Social Media',
    description: 'YouTube → IA → Twitter + LinkedIn + Newsletter',
    nodes: [
      { id: 'p1', type: 'trigger', title: 'YouTube Data API', subtitle: 'Nuevo Video', icon: 'Video', x: 100, y: 220, color: '#ff0000', pm2_process: '' },
      { id: 'p2', type: 'action', title: 'Gemini API', subtitle: 'Extraer Resumen', icon: 'Sparkles', x: 380, y: 220, color: '#4285f4', pm2_process: '' },
      { id: 'p3', type: 'action', title: 'Twitter / X Bot', subtitle: 'Hilo de Twitter', icon: 'MessageCircle', x: 660, y: 100, color: '#000000', pm2_process: 'twitter-bot' },
      { id: 'p4', type: 'action', title: 'LinkedIn Bot', subtitle: 'Post B2B', icon: 'Network', x: 660, y: 220, color: '#0a66c2', pm2_process: 'linkedin-bot' },
      { id: 'p5', type: 'action', title: 'Bot Newsletter', subtitle: 'Boletín Semanal', icon: 'Mail', x: 660, y: 340, color: '#f97316', pm2_process: 'newsletter-bot' },
    ],
    edges: [
      { id: 'e1', source: 'p1', target: 'p2', color: '#ff0000' },
      { id: 'e2', source: 'p2', target: 'p3', color: '#4285f4' },
      { id: 'e3', source: 'p2', target: 'p4', color: '#4285f4' },
      { id: 'e4', source: 'p2', target: 'p5', color: '#4285f4' },
    ],
  },
  {
    name: '🌱 Flujo Básico',
    description: 'Planificador IA → Tarea de Studio',
    nodes: [
      { id: 't1', type: 'trigger', title: 'Planificador IA', subtitle: 'Origen', icon: 'Wand2', x: 200, y: 220, color: '#a855f7', pm2_process: 'ai-core' },
      { id: 't2', type: 'action', title: 'Tarea de Studio', subtitle: 'CEO Estudio', icon: 'CheckSquare', x: 560, y: 220, color: '#10b981', pm2_process: '' },
        { id: 'paquete_social', title: 'Paquete de Contenido Social', subtitle: 'TikTok + IG + FB', icon: 'Package', color: '#f59e0b', type: 'action', config: {} },
    ],
    edges: [{ id: 'e1', source: 't1', target: 't2', color: '#a855f7' }],
  },
  {
    name: '🚀 Máquina UGC Completa',
    description: 'Planificador → Imagen → Video → Tarea → WA + Email',
    nodes: [
      { id: 'n1', type: 'trigger', title: 'Planificador IA', subtitle: 'Origen', icon: 'Wand2', x: 80, y: 250, color: '#a855f7', pm2_process: 'ai-core' },
      { id: 'n2', type: 'action', title: 'Generador Visual', subtitle: 'Imagen 3', icon: 'Image', x: 340, y: 120, color: '#3b82f6', pm2_process: 'ai-core' },
      { id: 'n3', type: 'action', title: 'Generador Video', subtitle: 'Veo / Kling', icon: 'Video', x: 340, y: 380, color: '#f59e0b', pm2_process: 'ai-core' },
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
    name: '🔥 Fábrica de Contenido Viral',
    description: 'Input Tema → Planificador IA → Assets → CEO Studio',
    nodes: [
      { id: 'v1', type: 'trigger', title: 'Webhook Entrada', subtitle: 'Recibe Tema', icon: 'Globe', x: 100, y: 220, color: '#06b6d4', pm2_process: '' },
      { id: 'v2', type: 'action', title: 'Planificador IA', subtitle: 'Generar Guión/Hooks', icon: 'Wand2', x: 380, y: 220, color: '#a855f7', pm2_process: 'ai-core' },
      { id: 'v3', type: 'action', title: 'Generador Visual', subtitle: 'Imagen 3 / UI', icon: 'Image', x: 660, y: 120, color: '#3b82f6', pm2_process: 'ai-core' },
      { id: 'v4', type: 'action', title: 'Generador Video', subtitle: 'Escenas Veo', icon: 'Video', x: 660, y: 320, color: '#f59e0b', pm2_process: 'ai-core' },
      { id: 'v5', type: 'action', title: 'Tarea de Studio', subtitle: 'Revisión Humana', icon: 'CheckSquare', x: 940, y: 220, color: '#10b981', pm2_process: '' },
    ],
    edges: [
      { id: 'e1', source: 'v1', target: 'v2', color: '#06b6d4' },
      { id: 'e2', source: 'v2', target: 'v3', color: '#a855f7' },
      { id: 'e3', source: 'v2', target: 'v4', color: '#a855f7' },
      { id: 'e4', source: 'v3', target: 'v5', color: '#3b82f6' },
      { id: 'e5', source: 'v4', target: 'v5', color: '#f59e0b' },
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
      { id: 'a1', type: 'trigger', title: 'Planificador IA', subtitle: 'Origen', icon: 'Wand2', x: 100, y: 220, color: '#a855f7', pm2_process: 'ai-core' },
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
      { id: 's1', type: 'trigger', title: 'Planificador IA', subtitle: 'Origen', icon: 'Wand2', x: 80, y: 220, color: '#a855f7', pm2_process: 'ai-core' },
      { id: 's2', type: 'action', title: 'Generador Visual', subtitle: 'Imagen 3', icon: 'Image', x: 340, y: 220, color: '#3b82f6', pm2_process: 'ai-core' },
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
      { id: 'tk2', type: 'action', title: 'Planificador IA', subtitle: 'Generar respuesta', icon: 'Wand2', x: 380, y: 220, color: '#a855f7', pm2_process: 'ai-core' },
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
const CurvedConnector = ({ startX, startY, endX, endY, color, animated = true, onDoubleClick }) => {
  const midX = (startX + endX) / 2;
  const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
  return (
    <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible" style={{ zIndex: 0 }}>
      <g 
        style={{ pointerEvents: onDoubleClick ? 'stroke' : 'none', cursor: onDoubleClick ? 'pointer' : 'default' }} 
        onDoubleClick={onDoubleClick}
        title="Doble clic para eliminar conexión"
      >
        <path d={path} fill="none" stroke="transparent" strokeWidth="20" />
        <path d={path} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" opacity="0.25" />
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </g>
      {animated && (
        <circle r="3.5" fill="#fff" opacity="0.9">
          <animateMotion dur="2.5s" repeatCount="indefinite" path={path} />
        </circle>
      )}
    </svg>
  );
};

// ─── Galaxy View ─────────────────────────────────────────────────────────────
function GalaxyView({ flows, pm2Status, onEditFlow, onNewFlow, onDeleteFlow, username, onCloneTemplate }) {
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
  
  const userFlowCount = flows.length + 1;
  const templatesRowOffset = Math.ceil(userFlowCount / COLS) + 1; // Leave 1 row gap
  const totalH = (Math.ceil(userFlowCount / COLS) + Math.ceil(FLOW_TEMPLATES.length / COLS) + 2) * (CARD_H + GAP);

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
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '50% 0%', width: totalW, height: totalH, position: 'absolute', top: '80px', left: '50%', marginLeft: -(totalW / 2) }}
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
                  {!isCore && (
                    <button
                      onClick={(e) => { e.stopPropagation(); if(window.confirm('¿Eliminar esta neurona de forma permanente?')) onDeleteFlow(flow.id); }}
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
                <p className="text-[10px] text-neutral-700 mt-0.5">Crear automatización desde cero</p>
              </div>
            </div>
          );
        })()}

        {/* Templates Section Label */}
        {(() => {
          const { x, y } = { x: 0, y: templatesRowOffset * (CARD_H + GAP) - GAP/2 };
          return (
            <div key="templates-label" style={{ position: 'absolute', left: x, top: y, width: totalW }} className="flex items-center gap-4">
              <div className="h-px bg-neutral-800 flex-1"></div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-black text-purple-400 uppercase tracking-widest">Catálogo de Plantillas</span>
              </div>
              <div className="h-px bg-neutral-800 flex-1"></div>
            </div>
          );
        })()}

        {/* Templates Catalog */}
        {FLOW_TEMPLATES.map((tpl, idx) => {
          // Skip first element if it's the core to avoid confusion in templates, but we can render all
          const posIdx = (templatesRowOffset * COLS) + idx;
          const { x, y } = getCardPos(posIdx);
          const nodeCount = tpl.nodes.length;
          const edgeCount = tpl.edges.length;

          return (
            <div
              key={`tpl-${idx}`}
              style={{ position: 'absolute', left: x, top: y, width: CARD_W, height: CARD_H }}
              className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/20 via-neutral-950 to-black hover:border-purple-500/50 shadow-[0_8px_32px_rgba(168,85,247,0.05)] hover:shadow-[0_8px_32px_rgba(168,85,247,0.15)] hover:scale-[1.03] cursor-pointer transition-all duration-300 select-none group"
              onClick={() => onCloneTemplate(tpl)}
            >
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                    <Wand2 className="w-3 h-3 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-purple-200 leading-none">{tpl.name}</p>
                    <p className="text-[10px] text-purple-400/60 mt-0.5">Plantilla preconfigurada</p>
                  </div>
                </div>
              </div>

              <div className="px-4 py-1">
                <p className="text-xs text-neutral-400 line-clamp-1">{tpl.description}</p>
              </div>

              <div className="flex items-center gap-3 px-4 py-1">
                <span className="text-[10px] text-neutral-500 flex items-center gap-1"><Layers className="w-3 h-3" /> {nodeCount} nodos</span>
                <span className="text-[10px] text-neutral-500 flex items-center gap-1"><Zap className="w-3 h-3" /> {edgeCount} conexiones</span>
              </div>

              <div className="absolute bottom-4 left-4 right-4">
                <button className="w-full py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-bold rounded-xl border border-purple-500/30 transition">
                  Usar esta plantilla →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Change Request Modal ─────────────────────────────────────────────────────
function AiSaveModal({ flowId, nodes, edges, onClose, onSaved }) {
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [expectedCaptcha, setExpectedCaptcha] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Generate a simple math captcha
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setExpectedCaptcha({ question: `¿Cuánto es ${a} + ${b}?`, answer: (a + b).toString() });
  }, []);

  const handleSubmit = async () => {
    if (!reason.trim() || !password.trim() || !captcha.trim()) {
      alert('Por favor completa todos los campos.');
      return;
    }
    if (captcha.trim() !== expectedCaptcha.answer) {
      alert('Captcha incorrecto.');
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/automation/analyze-and-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ flowId, reason, password, captcha, nodes, edges }),
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Flujo guardado. Recomendaciones de la IA:\n\n' + data.recommendations);
        onSaved();
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
            <h3 className="text-base font-black text-white flex items-center gap-2">🧠 Guardar & Analizar</h3>
            <p className="text-xs text-neutral-400 mt-0.5">El sistema central será evaluado por la IA antes de guardarse.</p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-yellow-400 mb-1.5 block">¿Por qué este cambio? (Objetivo)</label>
            <textarea
              rows={2} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Ej: Quiero agregar un nodo para enviar correos al cerrar tratos..."
              className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-yellow-500/60 transition resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-yellow-400 mb-1.5 block">Contraseña de Administrador</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Tu contraseña..."
              className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-yellow-500/60 transition"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-yellow-400 mb-1.5 block">Seguridad: {expectedCaptcha.question}</label>
            <input
              type="text" value={captcha} onChange={e => setCaptcha(e.target.value)}
              placeholder="Respuesta..."
              className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-yellow-500/60 transition"
            />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-neutral-800">
          <button onClick={onClose} className="flex-1 py-2.5 bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-white rounded-xl text-xs font-bold transition">Cancelar</button>
          <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl text-xs font-black transition disabled:opacity-50">
            {submitting ? 'Analizando...' : '✨ Validar y Guardar'}
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
  
  // 🚀 Nuevos estados de Navegación (Pan & Zoom)
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);

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
  const [nodeSearch, setNodeSearch] = useState('');
  const [manualTopic, setManualTopic] = useState('');

  const canvasRef = useRef(null);
  const isCore = flowId === 1;

  const nodeMap = useMemo(() => { const m = new Map(); nodes.forEach(n => m.set(n.id, n)); return m; }, [nodes]);
  const selectedNode = nodeMap.get(selectedNodeId);
  const NODE_PRESETS = [
    // ── NÚCLEO GODZILLA ──────────────────────────────────────────────────────
    { title:'Cerebro Central AI',   subtitle:'Motor RAG/Lógica',     icon:'Brain',          color:'#eab308', pm2_process: 'ai-core',       group:'🧠 Núcleo' },
    { title:'Planificador IA',      subtitle:'Generador de Contenido',icon:'Wand2',          color:'#a855f7', pm2_process: 'ai-core',              group:'🧠 Núcleo' },
    { title:'Memoria a Largo Plazo',subtitle:'Base Vectorial',        icon:'Network',        color:'#0d9488', pm2_process: 'vector-db',     group:'🧠 Núcleo' },
    { title:'Godzilla CM',          subtitle:'CRM & Leads',           icon:'LayoutDashboard',color:'#2563eb', pm2_process:'',              group:'🧠 Núcleo' },
    { title:'Generador Visual',     subtitle:'Imagen 3 / Gemini',     icon:'Image',          color:'#3b82f6', pm2_process: 'ai-core',              group:'🧠 Núcleo' },
    { title:'Generador Video',      subtitle:'Veo / Kling',           icon:'Video',          color:'#f59e0b', pm2_process: 'ai-core',              group:'🧠 Núcleo' },
    { title:'Tarea de Studio',      subtitle:'CEO Estudio',           icon:'CheckSquare',    color:'#10b981', pm2_process:'',              group:'🧠 Núcleo' },
    { title:'Calendario Global',    subtitle:'Citas / Eventos',       icon:'Calendar',       color:'8b5cf6', pm2_process:'',              group:'🧠 Núcleo' },
    // ── BOTS PROPIOS ─────────────────────────────────────────────────────────
    { title:'WhatsApp Bot',         subtitle:'Mensajería WA',         icon:'Smartphone',     color:'#25d366', pm2_process:'whatsapp-bot',  group:'🤖 Bots' },
    { title:'TikTok Bot',           subtitle:'Interacción TikTok',    icon:'Video',          color:'#ff0050', pm2_process:'tiktok-bot',    group:'🤖 Bots' },
    { title:'IG / Messenger Bot',   subtitle:'Meta DMs',              icon:'MessageCircle',  color:'#d946ef', pm2_process:'meta-bot',      group:'🤖 Bots' },
    { title:'Twitter / X Bot',      subtitle:'Posts / DMs',           icon:'MessageCircle',  color:'#0f1419', pm2_process:'twitter-bot',   group:'🤖 Bots' },
    { title:'LinkedIn Bot',         subtitle:'B2B Leads',             icon:'Network',        color:'#0a66c2', pm2_process:'linkedin-bot',  group:'🤖 Bots' },
    { title:'Zilla Bot',            subtitle:'Asistente / Atención',  icon:'Bot',            color:'#10b981', pm2_process:'zilla-bot',     group:'🤖 Bots' },
    { title:'Goyi Bot',             subtitle:'Asistente / Cierre',    icon:'Bot',            color:'#ec4899', pm2_process:'goyi-bot',      group:'🤖 Bots' },
    { title:'Bot Newsletter',       subtitle:'Redacción / Email',     icon:'Mail',           color:'#f97316', pm2_process:'newsletter-bot',group:'🤖 Bots' },
    { title:'Trends Bot',           subtitle:'Analizador de Redes',   icon:'TrendingUp',     color:'#8b5cf6', pm2_process:'trends-bot',    group:'🤖 Bots' },
    // ── MENSAJERÍA EXTERNA ───────────────────────────────────────────────────
    { title:'Telegram Bot',         subtitle:'Alertas / Gratis',      icon:'Send',           color:'#26a5e4', pm2_process:'',              group:'💬 Mensajería' },
    { title:'Discord Webhook',      subtitle:'Notif. al equipo',      icon:'MessageCircle',  color:'#5865f2', pm2_process:'',              group:'💬 Mensajería' },
    { title:'Slack Webhook',        subtitle:'Notif. al equipo',      icon:'Zap',            color:'#4a154b', pm2_process:'',              group:'💬 Mensajería' },
    { title:'Twilio SMS',           subtitle:'SMS Universal',         icon:'Smartphone',     color:'#f22f46', pm2_process:'',              group:'💬 Mensajería' },
    { title:'Email Worker',         subtitle:'SMTP Propio',           icon:'Mail',           color:'#f97316', pm2_process:'email-worker',  group:'💬 Mensajería' },
    { title:'Resend',               subtitle:'Email API (3K/mes free)',icon:'Mail',           color:'#000000', pm2_process:'',              group:'💬 Mensajería' },
    // ── IA / LLMs ────────────────────────────────────────────────────────────
    { title:'Gemini API',           subtitle:'Google LLM',            icon:'Sparkles',       color:'#4285f4', pm2_process:'',              group:'🤖 IA / LLMs' },
    { title:'OpenAI / ChatGPT',     subtitle:'GPT-4o / GPT-4 mini',   icon:'Brain',          color:'#10a37f', pm2_process:'',              group:'🤖 IA / LLMs' },
    { title:'Anthropic Claude',     subtitle:'Claude 3 Opus/Sonnet',  icon:'Brain',          color:'#d97757', pm2_process:'',              group:'🤖 IA / LLMs' },
    { title:'DeepSeek API',         subtitle:'DeepSeek Coder/Chat',   icon:'Brain',          color:'#4d6bfe', pm2_process:'',              group:'🤖 IA / LLMs' },
    { title:'ElevenLabs',           subtitle:'Generador de Voz/TTS',  icon:'Play',           color:'#000000', pm2_process:'',              group:'🤖 IA / LLMs' },
    // ── BASES DE DATOS ───────────────────────────────────────────────────────
    { title:'Base de Datos',        subtitle:'PostgreSQL nativo',     icon:'Database',       color:'#64748b', pm2_process:'',              group:'🗄 Datos' },
    { title:'Neon DB',              subtitle:'PostgreSQL Serverless',  icon:'Database',       color:'#00e599', pm2_process:'',              group:'🗄 Datos' },
    { title:'Airtable',             subtitle:'Base de datos visual',  icon:'Database',       color:'#fcb400', pm2_process:'',              group:'🗄 Datos' },
    { title:'Supabase',             subtitle:'DB + Auth gratis',      icon:'Database',       color:'#3ecf8e', pm2_process:'',              group:'🗄 Datos' },
    { title:'Google Sheets',        subtitle:'Leer / Escribir',       icon:'Database',       color:'#34a853', pm2_process:'',              group:'🗄 Datos' },
    // ── PRODUCTIVIDAD ────────────────────────────────────────────────────────
    { title:'Notion',               subtitle:'Docs / CRM Notion',     icon:'Braces',         color:'#ffffff', pm2_process:'',              group:'📋 Productividad' },
    { title:'Google Calendar API',  subtitle:'Eventos externos',      icon:'Calendar',       color:'#4285f4', pm2_process:'',              group:'📋 Productividad' },
    { title:'Cal.com',              subtitle:'Citas sin Calendly',    icon:'Calendar',       color:'#292929', pm2_process:'',              group:'📋 Productividad' },
    // ── REDES SOCIALES ───────────────────────────────────────────────────────
    { title:'YouTube Data API',     subtitle:'Upload / Gestión',      icon:'Video',          color:'#ff0000', pm2_process:'',              group:'📱 Social' },
    { title:'Pinterest API',        subtitle:'Pins / Tableros',       icon:'Image',          color:'#e60023', pm2_process:'',              group:'📱 Social' },
    { title:'Facebook Ads API',     subtitle:'Campañas / Anuncios',   icon:'TrendingUp',     color:'#1877f2', pm2_process:'',              group:'📱 Social' },
    // ── PAGOS / FINANZAS ─────────────────────────────────────────────────────
    { title:'Stripe',               subtitle:'Pasarela de Pagos',     icon:'CreditCard',     color:'#6366f1', pm2_process:'',              group:'💰 Pagos' },
    { title:'Stripe Webhook',       subtitle:'Eventos de pago',       icon:'CreditCard',     color:'#635bff', pm2_process:'',              group:'💰 Pagos' },
    // ── ANALÍTICA ────────────────────────────────────────────────────────────
    { title:'Google Analytics',     subtitle:'Tracking de eventos',   icon:'TrendingUp',     color:'#e37400', pm2_process:'',              group:'📊 Analytics' },
    { title:'RSS Feed',             subtitle:'Agregador de noticias', icon:'Globe',          color:'#ff6600', pm2_process:'',              group:'📊 Analytics' },
    { title:'Monitor Servidor',     subtitle:'Health Check',          icon:'Server',         color:'#ef4444', pm2_process:'godzilla-server',group:'📊 Analytics' },
    // ── INFRAESTRUCTURA ──────────────────────────────────────────────────────
    { title:'Webhook Entrada',      subtitle:'Recibir datos externos',icon:'Globe',          color:'#06b6d4', pm2_process:'',              group:'⚙️ Sistema' },
    { title:'HTTP Request',         subtitle:'Llamar a cualquier API',icon:'Send',           color:'#6366f1', pm2_process:'',              group:'⚙️ Sistema' },
    { title:'Reloj / Cron',         subtitle:'Programar en el tiempo',icon:'Timer',          color:'#14b8a6', pm2_process:'',              group:'⚙️ Sistema' },
    { title:'Cloudflare Workers',   subtitle:'Edge Gateway',          icon:'Cloud',          color:'#f38020', pm2_process:'',              group:'⚙️ Sistema' },
    { title:'Vercel',               subtitle:'Hosting / Deploy',      icon:'Server',         color:'#ffffff', pm2_process:'',              group:'⚙️ Sistema' },
    { title:'GoDaddy',              subtitle:'DNS / Dominios',        icon:'Globe',          color:'#1bbb11', pm2_process:'',              group:'⚙️ Sistema' },
    { title:'Make (Integromat)',    subtitle:'Webhook a Make',        icon:'Webhook',        color:'#9c27b0', pm2_process:'',              group:'⚙️ Sistema' },
    { title:'Zapier Webhook',       subtitle:'Webhook a Zapier',      icon:'Zap',            color:'#ff4a00', pm2_process:'',              group:'⚙️ Sistema' },
    // ── CONTROL DE FLUJO ─────────────────────────────────────────────────────
    { title:'Router / Switch',      subtitle:'Condición lógica',      icon:'GitBranch',      color:'#f43f5e', pm2_process:'',              group:'🔀 Flujo' },
    { title:'Transformador JSON',   subtitle:'Mapear / remodelar data',icon:'Braces',        color:'#f59e0b', pm2_process:'',              group:'🔀 Flujo' },
    { title:'Delay / Espera',       subtitle:'Pausa entre pasos',     icon:'Clock',          color:'#94a3b8', pm2_process:'',              group:'🔀 Flujo' },
    { title:'Loop / Iterador',      subtitle:'Procesar listas',       icon:'GitBranch',      color:'#0ea5e9', pm2_process:'',              group:'🔀 Flujo' },
    { title:'Merge / Combinar',     subtitle:'Unir resultados',       icon:'Network',        color:'#a78bfa', pm2_process:'',              group:'🔀 Flujo' },
    { title:'Set Variables',        subtitle:'Guardar datos temporales',icon:'Braces',       color:'#cbd5e1', pm2_process:'',              group:'🔀 Flujo' },
    // ── GENERACIÓN DE ARCHIVOS ────────────────────────────────────────────────
    { title:'PDF Generator',        subtitle:'Contratos / Reportes',  icon:'Image',          color:'#dc2626', pm2_process:'',              group:'📄 Archivos' },
    { title:'Brevo',                subtitle:'Email Marketing',       icon:'Mail',           color:'#0092ff', pm2_process:'',              group:'📄 Archivos' },
  ];

  // Agrupar por categoria para el menu
  const PRESET_GROUPS = NODE_PRESETS.reduce((acc, p) => {
    const g = p.group || '⚙️ Sistema';
    if (!acc[g]) acc[g] = [];
    acc[g].push(p);
    return acc;
  }, {});


  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    fetch(`/api/automation/flow?id=${flowId}`, { headers:{ Authorization:`Bearer ${token}` } })
      .then(r => r.json()).then(d => { 
        if(d.success){ 
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
          if(d.name) setEditName(d.name); 
        } 
      })
      .catch(()=>{}).finally(()=>setIsLoading(false));
    fetch('/api/automation/runs',{ headers:{ Authorization:`Bearer ${token}` } })
      .then(r=>r.json()).then(d=>{ if(d.success) setRunHistory(d.runs||[]); }).catch(()=>{});
  }, [flowId]);

  const handlePointerDown = (e, id) => {
    e.stopPropagation();
    if (e.target.dataset.port === 'out') { 
      setConnectingFrom(id); 
      const cr = canvasRef.current.getBoundingClientRect();
      setConnectingToPos({ x: (e.clientX - cr.left + canvasRef.current.scrollLeft) / zoom, y: (e.clientY - cr.top + canvasRef.current.scrollTop) / zoom }); 
      return; 
    }
    setSelectedNodeId(id);
    const el = document.getElementById(`node-${id}`);
    if(el && canvasRef.current){ 
      const r = el.getBoundingClientRect(); 
      setDragOffset({ x: (e.clientX - r.left) / zoom, y: (e.clientY - r.top) / zoom }); 
      setIsDraggingNode(id); 
    }
  };

  const handleCanvasPointerDown = (e) => {
    // Don't start panning when clicking on a node (stopPropagation is set, this is a safety net)
    if (e.target.closest('.node-container')) return;
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true);
      setSelectedNodeId(null);
      setShowNodeMenu(false);
      setShowTemplateMenu(false);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e) => {
    if(!canvasRef.current) return;
    
    if (isPanning) {
      canvasRef.current.scrollLeft -= e.movementX;
      canvasRef.current.scrollTop -= e.movementY;
      return;
    }

    const cr = canvasRef.current.getBoundingClientRect();
    const nx = (e.clientX - cr.left + canvasRef.current.scrollLeft) / zoom;
    const ny = (e.clientY - cr.top + canvasRef.current.scrollTop) / zoom;
    
    if(isDraggingNode) { setNodes(p=>p.map(n=>n.id===isDraggingNode ? {...n, x: nx - dragOffset.x, y: ny - dragOffset.y} : n)); }
  };

  const handlePointerUp = (e) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    if(connectingFrom){
      // Para encontrar el drop target ignorando el zoom visual, usamos clientX/Y que son absolutos de la pantalla
      const tgt = document.elementFromPoint(e.clientX, e.clientY)?.closest('.node-container');
      if(tgt){ 
        const tid=tgt.getAttribute('data-id'); 
        if(tid && tid!==connectingFrom){ 
          const src = nodeMap.get(connectingFrom); 
          setEdges(p=>[...p,{id:`e${connectingFrom}-${tid}-${Date.now()}`,source:connectingFrom,target:tid,color:src?.color||'#fff'}]); 
        } 
      }
    }
    setIsDraggingNode(null); setConnectingFrom(null); setConnectingToPos(null);
  };

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      setZoom(z => Math.min(Math.max(0.2, z - e.deltaY * 0.001), 2));
    }
  };

  const handleRestartProcess = async (processName) => {
    if (!processName) return;
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch('/api/automation/restart-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ processName })
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Proceso ${processName} reiniciado.`);
      } else {
        alert(`❌ Error al reiniciar: ${data.error}`);
      }
    } catch (err) {
      alert(`❌ Error al reiniciar: ${err.message}`);
    }
  };

  const addPreset = (p) => {
    const id=crypto.randomUUID(), vx=(canvasRef.current?.scrollLeft||0)+300, vy=(canvasRef.current?.scrollTop||0)+200;
    setNodes(n=>[...n,{id,type:p.title==='Planificador IA'?'trigger':'action',title:p.title,subtitle:p.subtitle,icon:p.icon,x:vx+50,y:vy+50,color:p.color,pm2_process:p.pm2_process}]);
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
    if(flowId === 1){ setShowChangeModal(true); return; }
    const token=localStorage.getItem('adminToken');
    try {
      const r=await fetch('/api/automation/flow',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({nodes,edges,flowId,name:editName})});
      const d=await r.json();
      if(d.success){ onSaved(); } else alert('Error: '+d.error);
    } catch(e){ alert('Error de conexión.'); }
  };

  const executeFlow = async () => {
    const src = nodes.find(n => n.type === 'trigger') || nodes[0];
    if(!src){ alert('Agrega al menos un nodo Origen (Trigger) para ejecutar la neurona.'); return; }
    
    if(!window.confirm(`¿Ejecutar esta neurona manualmente comenzando por "${src.title}"?`)) return;

    // Guardar para que el engine lo reconozca por base de datos
    await handleSave();

    const token = localStorage.getItem('adminToken');
    setIsExecuting(true); setExecutingNodes(new Set(nodes.map(n=>n.id)));
    
    let payload = { manualTrigger: true };
    if (manualTopic.trim() !== '') {
        payload.topic = manualTopic.trim();
    }
    
    try { 
      await fetch(`/api/automation/webhook/${src.id}`, {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body:JSON.stringify(payload)
      }); 
    } catch(e){}

    setTimeout(async () => {
      try { 
        const r = await fetch('/api/automation/runs',{headers:{Authorization:`Bearer ${token}`}}); 
        const d = await r.json(); 
        if(d.success) { setRunHistory(d.runs||[]); setShowHistory(true); } 
      } catch(e){}
      setIsExecuting(false); setExecutingNodes(new Set());
    }, 4000);
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
      // ⚙️ Sistema / Webhooks
      if (n.title === 'Webhook Entrada' && (!n.config?.method || !n.config?.url)) return true;
      if (['Make (Integromat)', 'Zapier Webhook'].includes(n.title) && !n.config?.webhookUrl) return true;
      if (n.title === 'Reloj / Cron' && !n.config?.cron) return true;
      
      // 🤖 IA
      if (['Cerebro Central AI', 'Anthropic Claude', 'OpenAI / ChatGPT', 'DeepSeek API', 'Gemini API'].includes(n.title) && !n.config?.prompt) return true;
      if (n.title === 'ElevenLabs' && (!n.config?.voiceId || !n.config?.text)) return true;
      
      // 📱 Social / Bots
      if (['WhatsApp Bot', 'TikTok Bot', 'IG / Messenger Bot'].includes(n.title) && !n.config?.fallback && !n.config?.message) return true;
      if (['Twitter / X Bot', 'LinkedIn Bot'].includes(n.title) && !n.config?.text) return true;
      if (n.title === 'Bot Newsletter' && !n.config?.body) return true;

      // 🗄 Bases de Datos / Productividad
      if (n.title === 'Calendario Global' && !n.config?.action) return true;
      if (n.title === 'Notion' && !n.config?.databaseId) return true;
      if (['Airtable', 'Supabase'].includes(n.title) && !n.config?.table) return true;

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

      {showChangeModal && <AiSaveModal flowId={flowId} nodes={nodes} edges={edges} onClose={()=>setShowChangeModal(false)} onSaved={()=>{setShowChangeModal(false); onSaved();}} />}

      {/* Toolbar */}
      <div className="relative z-50 flex items-center gap-3 px-5 py-3 border-b border-neutral-800 bg-black/60 backdrop-blur-xl shrink-0 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-1.5 text-neutral-400 hover:text-white text-xs font-bold transition">
          <ArrowLeft className="w-4 h-4"/>Galaxia
        </button>
        <div className="w-px h-5 bg-neutral-800"/>
        {isCore && <span className="text-sm">👑</span>}
        <input value={editName} onChange={e=>setEditName(e.target.value)} disabled={flowId === 1}
          className="bg-transparent text-sm font-black text-white outline-none border-b border-transparent focus:border-neutral-600 transition w-48 disabled:text-neutral-500" />
        <div className="flex-1"/>
        
        {/* Campo para ingresar TEMA antes de ejecutar si es un flujo de contenido */}
        {(editName.toLowerCase().includes('viral') || editName.toLowerCase().includes('contenido') || editName.toLowerCase().includes('fábrica')) && (
            <input 
                type="text" 
                placeholder="Tema a generar (ej. IA en ventas)..." 
                value={manualTopic} 
                onChange={e => setManualTopic(e.target.value)}
                className="bg-black/40 border border-emerald-500/30 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/60 w-48 transition-all shadow-inner"
            />
        )}
        
        <button onClick={()=>setShowHistory(!showHistory)} className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-neutral-400 px-3 py-1.5 rounded-xl text-xs font-bold transition">
          <Clock className="w-3.5 h-3.5"/>{runHistory.length>0&&<span className={`w-1.5 h-1.5 rounded-full ${runHistory[0]?.status==='success'?'bg-emerald-400':runHistory[0]?.status==='error'?'bg-rose-400':'bg-yellow-400'}`}/>}
        </button>
        <button onClick={executeFlow} disabled={isExecuting} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${isExecuting?'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 cursor-wait animate-pulse':'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]'}`}>
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
            <div className="absolute top-full mt-2 right-0 w-72 bg-neutral-950 border border-neutral-800 shadow-2xl rounded-xl overflow-hidden z-50">
              <div className="p-2 border-b border-neutral-800 flex items-center gap-2">
                <Search className="w-3 h-3 text-neutral-500 shrink-0"/>
                <input
                  autoFocus
                  placeholder="Buscar nodo..."
                  value={nodeSearch||''}
                  onChange={e=>setNodeSearch(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-white outline-none placeholder-neutral-600"
                />
                <span className="text-[9px] text-neutral-600 font-bold">{NODE_PRESETS.length} nodos</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {(() => {
                  const q = (nodeSearch||'').toLowerCase();
                  const filtered = q
                    ? NODE_PRESETS.filter(p => p.title.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q) || (p.group||'').toLowerCase().includes(q))
                    : null;
                  const source = filtered
                    ? { 'Resultados': filtered }
                    : PRESET_GROUPS;
                  return Object.entries(source).map(([group, items]) => (
                    <div key={group}>
                      {!filtered && <div className="px-3 pt-2 pb-0.5"><span className="text-[9px] text-neutral-600 font-black uppercase tracking-widest">{group}</span></div>}
                      {items.map((p,i) => (
                        <button key={i} onClick={()=>{addPreset(p);setNodeSearch('');}} className="w-full text-left px-3 py-2 hover:bg-neutral-800 flex items-center gap-2.5 transition group">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{backgroundColor:`${p.color}22`,color:p.color}}>
                            {React.createElement(getIcons()[p.icon]||Webhook,{className:'w-3.5 h-3.5'})}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white font-bold truncate">{p.title}</p>
                            <p className="text-[10px] text-neutral-500 truncate">{p.subtitle}</p>
                          </div>
                          {p.pm2_process && <span className="text-[8px] text-emerald-400/60 font-bold bg-emerald-900/20 px-1 rounded shrink-0">PM2</span>}
                        </button>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>

        <button onClick={handleSave} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black transition border ${flowId===1?'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20':'bg-white text-black border-white/20 hover:bg-neutral-200'}`}>
          {flowId===1?'🧠 Validar IA':'💾 Guardar'}
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
      <div ref={canvasRef} className={`flex-1 overflow-auto relative ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`} style={{background:'#060608'}}
        onPointerDown={handleCanvasPointerDown} onWheel={handleWheel}>
        <div className="canvas-bg w-[10000px] h-[10000px] min-w-[10000px] min-h-[10000px] relative origin-top-left transition-transform duration-75"
             style={{ 
               transform: `scale(${zoom})`,
               backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px,transparent 1px)',
               backgroundSize: `${28}px ${28}px` 
             }}>

          {/* Asistente de Lógica para Canvas Vacío */}
          {nodes.length === 0 && (
            <div className="absolute top-[300px] left-1/2 -translate-x-1/2 flex flex-col items-center select-none max-w-xl text-center pointer-events-none">
              <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-6 shadow-2xl">
                <Brain className="w-8 h-8 text-yellow-500/80" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Asistente de Lógica</h2>
              <p className="text-sm text-neutral-400 mb-8 max-w-md">Para que una neurona funcione necesita una secuencia lógica. Sigue estos 3 pasos básicos:</p>
              
              <div className="flex items-start gap-4 text-left w-full">
                <div className="flex-1 bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 text-[10px] font-black">1</div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Origen (Trigger)</span>
                  </div>
                  <p className="text-[10px] text-neutral-500">¿Qué inicia el flujo? Arrastra un nodo de entrada como <strong>Webhook</strong>, <strong>WhatsApp Bot</strong> o <strong>Reloj (Cron)</strong>.</p>
                </div>

                <div className="flex items-center justify-center h-20 text-neutral-700">
                  <ArrowLeft className="w-5 h-5 rotate-180" />
                </div>

                <div className="flex-1 bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 relative top-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-yellow-500/20 text-yellow-500 flex items-center justify-center border border-yellow-500/30 text-[10px] font-black">2</div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Proceso (IA)</span>
                  </div>
                  <p className="text-[10px] text-neutral-500">Opcional: Añade un cerebro. Conecta un <strong>LLM (Claude/Gemini)</strong> o <strong>Transformador</strong> para procesar la data entrante.</p>
                </div>

                <div className="flex items-center justify-center h-20 text-neutral-700">
                  <ArrowLeft className="w-5 h-5 rotate-180" />
                </div>

                <div className="flex-1 bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 text-[10px] font-black">3</div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Salida (Action)</span>
                  </div>
                  <p className="text-[10px] text-neutral-500">¿Cuál es el resultado? Termina conectando a un nodo de acción como <strong>Email Worker</strong>, <strong>CRM</strong> o <strong>Base de Datos</strong>.</p>
                </div>
              </div>

              <div className="mt-12 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold animate-pulse pointer-events-auto cursor-pointer" onClick={() => {setShowNodeMenu(true);}}>
                <Plus className="w-4 h-4" /> Clic en "Añadir" arriba para comenzar
              </div>
            </div>
          )}

          {/* Draw edges */}
          {edges.map(e=>{
            const s=nodePositions.get(e.source), t=nodePositions.get(e.target);
            if(!s||!t) return null;
            return <CurvedConnector 
              key={e.id} 
              startX={s.rx} startY={s.ry} endX={t.lx} endY={t.ly} 
              color={e.color} 
              animated={executingNodes.has(e.source) || isExecuting}
              onDoubleClick={(ev) => {
                ev.stopPropagation();
                if(window.confirm('¿Eliminar esta conexión?')) {
                  setEdges(prev => prev.filter(edge => edge.id !== e.id));
                }
              }}
            />;
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
                <div className={`w-full h-full rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-200 ${
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

      {/* Floating Zoom Controls */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-2 z-40">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col shadow-2xl overflow-hidden">
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 transition"><Plus className="w-4 h-4"/></button>
          <div className="h-px bg-neutral-800 w-full" />
          <div className="p-2 text-[10px] font-black text-center text-white cursor-default select-none">{Math.round(zoom * 100)}%</div>
          <div className="h-px bg-neutral-800 w-full" />
          <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 transition"><Minus className="w-4 h-4"/></button>
        </div>
        <button onClick={() => setZoom(1)} className="bg-neutral-900 border border-neutral-800 p-2 text-[9px] font-black rounded-xl text-neutral-400 hover:text-white transition shadow-2xl">
          100%
        </button>
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
              <div className="flex items-center justify-between mb-4">
                <label className="text-[10px] font-bold text-yellow-400 uppercase flex items-center gap-1.5"><Settings2 className="w-3 h-3"/> Ajustes Obligatorios</label>
                <span className="text-[8px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/30">Admite {"{{ $json.var }}"}</span>
              </div>

              {/* EXPERIMENTAL: Variable Mapping */}
              {selectedNode.type !== 'trigger' && (
                <div className="mb-4 p-3 bg-[#111] rounded-xl border border-neutral-800/80">
                  <h4 className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-2 flex items-center gap-1"><ArrowLeftRight className="w-3 h-3"/> Mapeo de Datos</h4>
                  <p className="text-[9px] text-neutral-500 leading-snug mb-3">Conecta variables de neuronas anteriores a esta.</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input placeholder="Campo destino (ej: email)" className="w-1/2 bg-black border border-neutral-800 rounded px-2 py-1.5 text-[10px] text-white outline-none" />
                      <span className="text-neutral-600 text-xs">=</span>
                      <select className="w-1/2 bg-black border border-neutral-800 rounded px-2 py-1.5 text-[10px] text-purple-400 outline-none appearance-none">
                        <option value="">Seleccionar Origen...</option>
                        {nodes.filter(n => n.id !== selectedNode.id).map(n => (
                          <option key={n.id} value={n.id}>{"{{ "}{n.title}{".salida }}"}</option>
                        ))}
                      </select>
                    </div>
                    <button className="text-[9px] font-bold text-blue-400 hover:text-blue-300 w-full text-left mt-1">+ Añadir variable</button>
                  </div>
                </div>
              )}
              {selectedNode.title === 'Planificador IA' && (
                <div className="space-y-3">
                  {/* Periodo */}
                  <div>
                    <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1.5 block">📆 Periodo del plan</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { value: 'day',   label: '1 Día',   icon: '☀️', desc: '1 post' },
                        { value: 'week',  label: '1 Semana', icon: '📅', desc: '7 posts' },
                        { value: 'month', label: '1 Mes',   icon: '🗓', desc: '30 posts' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => updateNode({ config: { ...selectedNode.config, period: opt.value } })}
                          className={`flex flex-col items-center py-2 px-1 rounded-xl border text-center transition ${
                            (selectedNode.config?.period || 'month') === opt.value
                              ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                              : 'border-neutral-800 bg-black text-neutral-500 hover:border-neutral-600'
                          }`}
                        >
                          <span className="text-base">{opt.icon}</span>
                          <span className="text-[10px] font-black mt-0.5">{opt.label}</span>
                          <span className="text-[8px] opacity-60">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nicho / Producto */}
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">🎯 Nicho / Producto</label>
                    <input
                      value={selectedNode.config?.niche || ''}
                      onChange={e => updateNode({ config: { ...selectedNode.config, niche: e.target.value } })}
                      placeholder='Ej: "Consultoría de negocios" o {{ $json.niche }}'
                      className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-purple-500 transition"
                    />
                  </div>

                  {/* Contexto adicional */}
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">📝 Contexto extra (opcional)</label>
                    <textarea
                      value={selectedNode.config?.extraContext || ''}
                      onChange={e => updateNode({ config: { ...selectedNode.config, extraContext: e.target.value } })}
                      placeholder="Enfócate en tendencias de Q2, usa humor, evita política..."
                      rows={2}
                      className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-purple-500 transition resize-none"
                    />
                  </div>

                  {/* Hint dinámico por periodo */}
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2.5">
                    {(selectedNode.config?.period || 'month') === 'day' && (
                      <p className="text-[9px] text-purple-400 leading-relaxed">
                        ⚡ <strong>Modo Día:</strong> Genera 1 post completo con narración, visual y video para hoy. Ideal para disparar con Reloj/Cron cada mañana.
                      </p>
                    )}
                    {selectedNode.config?.period === 'week' && (
                      <p className="text-[9px] text-purple-400 leading-relaxed">
                        📅 <strong>Modo Semana:</strong> Genera 7 días de contenido. Perfecto para planear el sprint de la semana los lunes.
                      </p>
                    )}
                    {(!selectedNode.config?.period || selectedNode.config?.period === 'month') && (
                      <p className="text-[9px] text-purple-400 leading-relaxed">
                        🗓 <strong>Modo Mes:</strong> Genera el calendario completo de 30 días. Se conecta directo con Tarea de Studio para producción automática.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedNode.title === 'Trends Bot' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">🎯 Nicho a Analizar</label>
                    <input
                      value={selectedNode.config?.niche || ''}
                      onChange={e => updateNode({ config: { ...selectedNode.config, niche: e.target.value } })}
                      placeholder='Ej: "Marketing Digital" o {{ $json.niche }}'
                      className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-purple-500 transition"
                    />
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2.5">
                     <p className="text-[9px] text-purple-400 leading-relaxed">
                        ⚡ <strong>Motor IA:</strong> El bot extraerá datos y cruzará tendencias virales de hoy para pasarlas al siguiente nodo.
                     </p>
                  </div>
                </div>
              )}

              {selectedNode.title === 'Paquete de Contenido Social' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">🧠 Tema (Opcional)</label>
                    <input
                      value={selectedNode.config?.topic || ''}
                      onChange={e => updateNode({ config: { ...selectedNode.config, topic: e.target.value } })}
                      placeholder='Por defecto usará la tendencia conectada'
                      className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-orange-500 transition"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">🛍️ Producto a vender (Opcional)</label>
                    <input
                      value={selectedNode.config?.product || ''}
                      onChange={e => updateNode({ config: { ...selectedNode.config, product: e.target.value } })}
                      placeholder='Ej: Curso de automatización'
                      className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-orange-500 transition"
                    />
                  </div>
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2.5">
                     <p className="text-[9px] text-orange-400 leading-relaxed">
                        ⚠️ <strong>Flujo:</strong> El paquete de 3 redes se enviará automáticamente al "CEO Estudio" para aprobación humana y publicación a un clic.
                     </p>
                  </div>
                </div>
              )}

              {selectedNode.title === 'Webhook Entrada' && (
                <div className="space-y-2">
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-2.5">
                    <p className="text-[10px] font-bold text-cyan-400 mb-1">Tu Webhook URL</p>
                    <code className="text-[9px] text-cyan-500/80 break-all select-all">https://godzillaconsulting.ai/api/automation/webhook/{selectedNode.id}</code>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">Acción a realizar</label>
                    <select value={selectedNode.config?.method||''} onChange={e=>updateNode({config:{...selectedNode.config, method:e.target.value}})} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition">
                      <option value="">Selecciona...</option>
                      <option value="POST">Recibir POST (Recomendado)</option>
                      <option value="GET">Recibir GET</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedNode.title === 'HTTP Request' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">Método HTTP</label>
                    <select value={selectedNode.config?.method||'POST'} onChange={e=>updateNode({config:{...selectedNode.config, method:e.target.value}})} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition">
                      <option value="POST">POST</option>
                      <option value="GET">GET</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">Endpoint URL</label>
                    <input value={selectedNode.config?.url||''} onChange={e=>updateNode({config:{...selectedNode.config, url:e.target.value}})} placeholder="https://api.externa.com/v1/..." className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition"/>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">Body (JSON)</label>
                    <textarea value={selectedNode.config?.body||''} onChange={e=>updateNode({config:{...selectedNode.config, body:e.target.value}})} placeholder='{ "id": "{{ $json.user_id }}" }' rows={3} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition resize-none font-mono text-xs"/>
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
                <div className="space-y-2">
                  <label className="text-[10px] text-neutral-400 mb-1 block">¿Cuándo se activa?</label>
                  <select
                    value={selectedNode.config?.cron || ''}
                    onChange={e => updateNode({ config: { ...selectedNode.config, cron: e.target.value } })}
                    className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-teal-500 transition"
                  >
                    <option value="">— Selecciona frecuencia —</option>
                    <option value="every_minute">⚡ Cada minuto (pruebas)</option>
                    <option value="every_hour">🕐 Cada hora en punto</option>
                    <option value="every_day_8">?? Cada d�a a las 8:00 AM</option><option value="every_day_9">🌅 Cada día a las 9:00 AM</option>
                    <option value="every_day_12">☀️ Cada día al mediodía</option>
                    <option value="every_day_18">🌆 Cada día a las 6:00 PM</option>
                    <option value="every_monday">📅 Cada lunes a las 9 AM</option>
                    <option value="every_friday">🎉 Cada viernes a las 9 AM</option>
                    <option value="custom">🕰 Hora específica...</option>
                  </select>
                  {selectedNode.config?.cron === 'custom' && (
                    <div>
                      <label className="text-[10px] text-neutral-400 mb-1 block">Hora exacta (HH:MM)</label>
                      <input
                        type="time"
                        value={selectedNode.config?.customTime || '09:00'}
                        onChange={e => updateNode({ config: { ...selectedNode.config, cron: e.target.value, customTime: e.target.value } })}
                        className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-teal-500 transition"
                      />
                    </div>
                  )}
                  {selectedNode.config?.cron && selectedNode.config.cron !== 'custom' && (
                    <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-2">
                      <p className="text-[9px] text-teal-400 font-bold">✅ El CronScheduler del servidor lo activará automáticamente</p>
                    </div>
                  )}
                </div>
              )}


              {['WhatsApp Bot', 'TikTok Bot', 'IG / Messenger Bot', 'Twitter / X Bot', 'LinkedIn Bot', 'Telegram Bot'].includes(selectedNode.title) && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-300 mb-1.5 block uppercase tracking-widest">⚡ Acción del Bot</label>
                    <select value={selectedNode.config?.action||'trigger_flow'} onChange={e=>updateNode({config:{...selectedNode.config, action:e.target.value}})} className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500 transition">
                      <option value="trigger_flow">🔗 Disparar Flujo (al recibir msg/evento)</option>
                      <option value="send_message">📤 Enviar Mensaje / Post</option>
                      <option value="schedule_message">⏰ Agendar Mensaje / Post</option>
                      {selectedNode.title === 'TikTok Bot' && <option value="post_content">🎬 Publicar Contenido TikTok</option>}
                      {selectedNode.title === 'TikTok Bot' && <option value="reply_comment">💬 Responder Comentario</option>}
                      {selectedNode.title === 'IG / Messenger Bot' && <option value="post_story">📸 Publicar Story IG</option>}
                      {selectedNode.title === 'IG / Messenger Bot' && <option value="post_feed">🖼️ Publicar en Feed IG</option>}
                      {selectedNode.title === 'Twitter / X Bot' && <option value="post_thread">🧵 Publicar Hilo (Thread)</option>}
                      {selectedNode.title === 'LinkedIn Bot' && <option value="post_article">📝 Publicar Artículo B2B</option>}
                      {selectedNode.title === 'Telegram Bot' && <option value="send_broadcast">📢 Enviar Difusión (Broadcast)</option>}
                    </select>
                  </div>
                  
                  {['Twitter / X Bot', 'LinkedIn Bot', 'Telegram Bot'].includes(selectedNode.title) && (
                    <div className="space-y-2 pt-2 border-t border-neutral-800/60">
                      <div><label className="text-[10px] text-neutral-400 mb-1 block flex items-center gap-1">🔑 API Key / Access Token</label>
                      <input type="password" value={selectedNode.config?.apiKey||''} onChange={e=>updateNode({config:{...selectedNode.config, apiKey:e.target.value}})} placeholder="Token de autenticación..." className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition focus:border-purple-500"/></div>
                    </div>
                  )}

                  {['send_message', 'post_thread', 'post_article', 'send_broadcast'].includes(selectedNode.config?.action) && (
                    <div className="space-y-2 pt-2 border-t border-neutral-800/60">
                      <div><label className="text-[10px] text-neutral-400 mb-1 block">Destinatario / Canal (Opcional)</label><input value={selectedNode.config?.to||''} onChange={e=>updateNode({config:{...selectedNode.config, to:e.target.value}})} placeholder="{{ $json.telefono }} o canal" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                      <div><label className="text-[10px] text-neutral-400 mb-1 block">Contenido / Mensaje</label><textarea value={selectedNode.config?.message||''} onChange={e=>updateNode({config:{...selectedNode.config, message:e.target.value}})} placeholder="Contenido del mensaje o post..." rows={3} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition"/></div>
                    </div>
                  )}
                  {(!selectedNode.config?.action || selectedNode.config?.action==='trigger_flow') && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5">
                      <p className="text-[9px] text-emerald-400 font-bold">🔗 Modo Trigger Activo</p>
                      <p className="text-[9px] text-emerald-500/70 mt-1 leading-relaxed">Cada mensaje o evento disparará este flujo. Variables: <code className="bg-black/30 px-1 rounded">{'{{ $json.message }}'}</code> y <code className="bg-black/30 px-1 rounded">{'{{ $json.from }}'}</code></p>
                    </div>
                  )}
                  {['post_content','post_story','post_feed'].includes(selectedNode.config?.action) && (
                    <div className="space-y-2 pt-2 border-t border-neutral-800/60">
                      <div><label className="text-[10px] text-neutral-400 mb-1 block">URL de Media</label><input value={selectedNode.config?.mediaUrl||''} onChange={e=>updateNode({config:{...selectedNode.config, mediaUrl:e.target.value}})} placeholder="{{ $json._contentPackage.imageUrl }}" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                      <div><label className="text-[10px] text-neutral-400 mb-1 block">Caption</label><textarea value={selectedNode.config?.caption||''} onChange={e=>updateNode({config:{...selectedNode.config, caption:e.target.value}})} placeholder="{{ $json._contentPackage.tiktok.descripcion }}" rows={2} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition"/></div>
                    </div>
                  )}
                  {selectedNode.config?.action==='schedule_message' && (
                    <div className="space-y-2 pt-2 border-t border-neutral-800/60">
                      <div><label className="text-[10px] text-neutral-400 mb-1 block">Destinatario / Canal</label><input value={selectedNode.config?.to||''} onChange={e=>updateNode({config:{...selectedNode.config, to:e.target.value}})} placeholder="{{ $json.telefono }}" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                      <div><label className="text-[10px] text-neutral-400 mb-1 block">Enviar a las (ISO)</label><input value={selectedNode.config?.sendAt||''} onChange={e=>updateNode({config:{...selectedNode.config, sendAt:e.target.value}})} placeholder="2025-05-01T09:00:00" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                      <div><label className="text-[10px] text-neutral-400 mb-1 block">Mensaje</label><textarea value={selectedNode.config?.message||''} onChange={e=>updateNode({config:{...selectedNode.config, message:e.target.value}})} rows={2} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition"/></div>
                    </div>
                  )}
                </div>
              )}

              {selectedNode.title === 'Email Worker' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">Para (Destinatario)</label>
                    <input value={selectedNode.config?.to||''} onChange={e=>updateNode({config:{...selectedNode.config, to:e.target.value}})} placeholder="Ej: {{ $json.email }}" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition"/>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">Asunto</label>
                    <input value={selectedNode.config?.subject||''} onChange={e=>updateNode({config:{...selectedNode.config, subject:e.target.value}})} placeholder="Confirmación de cita" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition"/>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">Cuerpo (HTML/Texto)</label>
                    <textarea value={selectedNode.config?.body||''} onChange={e=>updateNode({config:{...selectedNode.config, body:e.target.value}})} placeholder="<p>Hola {{ $json.nombre }}...</p>" rows={3} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition resize-none font-mono text-[10px]"/>
                  </div>
                </div>
              )}

              {['Base de Datos', 'Neon DB'].includes(selectedNode.title) && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Query SQL</label><textarea value={selectedNode.config?.query||''} onChange={e=>updateNode({config:{...selectedNode.config, query:e.target.value}})} placeholder="SELECT * FROM users WHERE email = $1" rows={3} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition font-mono text-[10px]"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Parámetros (JSON Array)</label><input value={selectedNode.config?.params||''} onChange={e=>updateNode({config:{...selectedNode.config, params:e.target.value}})} placeholder='["{{ $json.email }}"]' className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition font-mono text-[10px]"/></div>
                </div>
              )}

              {selectedNode.title === 'Monitor Servidor' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">URL a monitorear</label><input value={selectedNode.config?.url||''} onChange={e=>updateNode({config:{...selectedNode.config, url:e.target.value}})} placeholder="https://api.miproyecto.com/health" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                </div>
              )}

              {selectedNode.title === 'Transformador JSON' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Reglas de Mapeo (JSON)</label><textarea value={selectedNode.config?.mapping||''} onChange={e=>updateNode({config:{...selectedNode.config, mapping:e.target.value}})} placeholder='{ "nuevo_campo": "{{ $json.viejo_campo }}" }' rows={4} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition font-mono text-[10px]"/></div>
                </div>
              )}

              {selectedNode.title === 'Merge / Combinar' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Estrategia</label>
                    <select value={selectedNode.config?.strategy||'append'} onChange={e=>updateNode({config:{...selectedNode.config, strategy:e.target.value}})} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition">
                      <option value="append">Anexar (Array)</option>
                      <option value="merge">Fusionar (Objeto)</option>
                      <option value="wait">Esperar todas las ramas</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedNode.title === 'Bot Newsletter' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Tema de la Newsletter</label><input value={selectedNode.config?.topic||''} onChange={e=>updateNode({config:{...selectedNode.config, topic:e.target.value}})} placeholder="Noticias de IA y Tech" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Instrucciones extra</label><textarea value={selectedNode.config?.instructions||''} onChange={e=>updateNode({config:{...selectedNode.config, instructions:e.target.value}})} placeholder="Enfócate en lanzamientos recientes..." rows={2} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition"/></div>
                </div>
              )}

              {selectedNode.title === 'Trends Bot' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Nicho a analizar</label><input value={selectedNode.config?.niche||''} onChange={e=>updateNode({config:{...selectedNode.config, niche:e.target.value}})} placeholder="Marketing digital, SaaS, AI..." className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                </div>
              )}

              {selectedNode.title === 'RSS Feed' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">URL del Feed RSS</label><input value={selectedNode.config?.url||''} onChange={e=>updateNode({config:{...selectedNode.config, url:e.target.value}})} placeholder="https://news.ycombinator.com/rss" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                </div>
              )}

              {selectedNode.title === 'PDF Generator' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Template HTML</label><textarea value={selectedNode.config?.html||''} onChange={e=>updateNode({config:{...selectedNode.config, html:e.target.value}})} placeholder="<h1>Reporte para {{ $json.cliente }}</h1>" rows={4} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition font-mono text-[10px]"/></div>
                </div>
              )}

              {selectedNode.title === 'Brevo' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Destinatario</label><input value={selectedNode.config?.to||''} onChange={e=>updateNode({config:{...selectedNode.config, to:e.target.value}})} placeholder="correo@ejemplo.com" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Asunto</label><input value={selectedNode.config?.subject||''} onChange={e=>updateNode({config:{...selectedNode.config, subject:e.target.value}})} placeholder="Notificación" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Template ID / HTML</label><textarea value={selectedNode.config?.html||''} onChange={e=>updateNode({config:{...selectedNode.config, html:e.target.value}})} placeholder="ID numérico o <html>..." rows={2} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition"/></div>
                </div>
              )}

              {selectedNode.title === 'Paquete de Contenido Social' && (
                <div className="space-y-3">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">📦 Tema / Producto</label><input value={selectedNode.config?.topic||''} onChange={e=>updateNode({config:{...selectedNode.config, topic:e.target.value}})} placeholder="Ej: Tu producto / {{ $json.tema }}" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">🎯 Nicho</label><input value={selectedNode.config?.niche||''} onChange={e=>updateNode({config:{...selectedNode.config, niche:e.target.value}})} placeholder="Marketing Digital, Consultoría..." className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">🛍️ Producto/Servicio (opcional)</label><input value={selectedNode.config?.product||''} onChange={e=>updateNode({config:{...selectedNode.config, product:e.target.value}})} placeholder="Nombre específico del producto" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 transition"/></div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
                    <p className="text-[9px] text-amber-400 font-bold mb-1">🚀 Salida del nodo:</p>
                    <p className="text-[9px] text-amber-500/70 leading-relaxed">Genera: <strong>Infografía (imagen URL)</strong> + copy para <strong>TikTok</strong> (descripción, hashtags, música, hook) + <strong>IG Feed</strong> (caption, hashtags, Reels audio) + <strong>IG Story</strong> (overlay, sticker) + <strong>Facebook</strong> (post sin música) + <strong>estrategia viral</strong> con horarios recomendados.</p>
                  </div>
                </div>
              )}

              {['Generador Visual', 'Generador Video', 'Tarea de Studio'].includes(selectedNode.title) && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 mt-2">
                  <p className="text-[10px] font-bold text-purple-400 mb-1">🤖 Nodo Automático</p>
                  <p className="text-[9px] text-purple-500/70 leading-tight">Este nodo no requiere configuración manual. Lee el plan estratégico del contexto de la rama actual y ejecuta su tarea en segundo plano.</p>
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

              {selectedNode.title === 'Telegram Bot' && (
                <div className="space-y-2">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2"><p className="text-[9px] text-blue-400 font-bold">💡 Obtén tu token gratis en @BotFather en Telegram</p></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Bot Token</label><input type="password" value={selectedNode.config?.botToken||''} onChange={e=>updateNode({config:{...selectedNode.config, botToken:e.target.value}})} placeholder="O usa .env: TELEGRAM_BOT_TOKEN" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Chat ID</label><input value={selectedNode.config?.chatId||''} onChange={e=>updateNode({config:{...selectedNode.config, chatId:e.target.value}})} placeholder="Ej: -1001234567890 o tu ID personal" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Mensaje</label><textarea value={selectedNode.config?.message||''} onChange={e=>updateNode({config:{...selectedNode.config, message:e.target.value}})} placeholder="🤖 {{ $json.titulo }} generado exitosamente" rows={2} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition resize-none"/></div>
                </div>
              )}

              {['Discord Webhook','Slack Webhook'].includes(selectedNode.title) && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Webhook URL</label><input value={selectedNode.config?.webhookUrl||''} onChange={e=>updateNode({config:{...selectedNode.config, webhookUrl:e.target.value}})} placeholder="https://discord.com/api/webhooks/..." className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-indigo-500 transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Mensaje</label><textarea value={selectedNode.config?.message||''} onChange={e=>updateNode({config:{...selectedNode.config, message:e.target.value}})} placeholder="✅ {{ $json.title }} completado" rows={2} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition"/></div>
                </div>
              )}

              {selectedNode.title === 'Twilio SMS' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Teléfono Destino</label><input value={selectedNode.config?.to||''} onChange={e=>updateNode({config:{...selectedNode.config, to:e.target.value}})} placeholder="+521656XXXXXXX o {{ $json.phone }}" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Mensaje SMS</label><textarea value={selectedNode.config?.message||''} onChange={e=>updateNode({config:{...selectedNode.config, message:e.target.value}})} placeholder="Hola {{ $json.nombre }}, tu cita es el {{ $json.fecha }}" rows={2} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition"/></div>
                  <div className="bg-neutral-800/50 rounded-lg p-2"><p className="text-[9px] text-neutral-400">Credenciales en .env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM</p></div>
                </div>
              )}

              {selectedNode.title === 'Resend' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Para (email)</label><input value={selectedNode.config?.to||''} onChange={e=>updateNode({config:{...selectedNode.config, to:e.target.value}})} placeholder="{{ $json.email }}" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Asunto</label><input value={selectedNode.config?.subject||''} onChange={e=>updateNode({config:{...selectedNode.config, subject:e.target.value}})} placeholder="Tu plan está listo 🤖" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">HTML Body</label><textarea value={selectedNode.config?.html||''} onChange={e=>updateNode({config:{...selectedNode.config, html:e.target.value}})} placeholder="<p>Hola {{ $json.nombre }}...</p>" rows={2} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-xs font-mono outline-none resize-none transition"/></div>
                  <div className="bg-neutral-800/50 rounded-lg p-2"><p className="text-[9px] text-neutral-400">Credencial en .env: RESEND_API_KEY — 3,000 emails/mes gratis</p></div>
                </div>
              )}

              {selectedNode.title === 'OpenAI / ChatGPT' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Modelo</label>
                    <select value={selectedNode.config?.model||'gpt-4o-mini'} onChange={e=>updateNode({config:{...selectedNode.config, model:e.target.value}})} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition">
                      <option value="gpt-4o-mini">GPT-4o Mini (barato + rápido)</option>
                      <option value="gpt-4o">GPT-4o (más potente)</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo (económico)</option>
                    </select>
                  </div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Prompt</label><textarea value={selectedNode.config?.prompt||''} onChange={e=>updateNode({config:{...selectedNode.config, prompt:e.target.value}})} placeholder="Analiza este contenido: {{ $json.titulo }}" rows={3} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition"/></div>
                  <div className="bg-neutral-800/50 rounded-lg p-2"><p className="text-[9px] text-neutral-400">Credencial en .env: OPENAI_API_KEY</p></div>
                </div>
              )}

              {selectedNode.title === 'Anthropic Claude' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Modelo</label>
                    <select value={selectedNode.config?.model||'claude-3-haiku-20240307'} onChange={e=>updateNode({config:{...selectedNode.config, model:e.target.value}})} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition">
                      <option value="claude-3-haiku-20240307">Claude 3 Haiku (rápido)</option>
                      <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet (balanceado)</option>
                      <option value="claude-3-opus-20240229">Claude 3 Opus (avanzado)</option>
                    </select>
                  </div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Prompt</label><textarea value={selectedNode.config?.prompt||''} onChange={e=>updateNode({config:{...selectedNode.config, prompt:e.target.value}})} placeholder="Redacta un ensayo sobre {{ $json.tema }}" rows={3} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition"/></div>
                  <div className="bg-neutral-800/50 rounded-lg p-2"><p className="text-[9px] text-neutral-400">Credencial en .env: ANTHROPIC_API_KEY</p></div>
                </div>
              )}

              {selectedNode.title === 'DeepSeek API' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Modelo</label>
                    <select value={selectedNode.config?.model||'deepseek-chat'} onChange={e=>updateNode({config:{...selectedNode.config, model:e.target.value}})} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition">
                      <option value="deepseek-chat">DeepSeek Chat (general)</option>
                      <option value="deepseek-coder">DeepSeek Coder (código)</option>
                    </select>
                  </div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Prompt</label><textarea value={selectedNode.config?.prompt||''} onChange={e=>updateNode({config:{...selectedNode.config, prompt:e.target.value}})} placeholder="Escribe código en Python para {{ $json.tarea }}" rows={3} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition"/></div>
                  <div className="bg-neutral-800/50 rounded-lg p-2"><p className="text-[9px] text-neutral-400">Credencial en .env: DEEPSEEK_API_KEY</p></div>
                </div>
              )}

              {selectedNode.title === 'ElevenLabs' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Voice ID</label><input value={selectedNode.config?.voiceId||''} onChange={e=>updateNode({config:{...selectedNode.config, voiceId:e.target.value}})} placeholder="ID de la voz clonada o predefinida" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Texto a Voz</label><textarea value={selectedNode.config?.text||''} onChange={e=>updateNode({config:{...selectedNode.config, text:e.target.value}})} placeholder="Hola, esto es una prueba de audio generada por {{ $json.autor }}" rows={3} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition"/></div>
                  <div className="bg-neutral-800/50 rounded-lg p-2"><p className="text-[9px] text-neutral-400">Credencial en .env: ELEVENLABS_API_KEY</p></div>
                </div>
              )}

              {['Make (Integromat)', 'Zapier Webhook'].includes(selectedNode.title) && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Webhook URL</label><input value={selectedNode.config?.webhookUrl||''} onChange={e=>updateNode({config:{...selectedNode.config, webhookUrl:e.target.value}})} placeholder="https://hook.make.com/... o hooks.zapier.com/..." className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Payload (JSON)</label><textarea value={selectedNode.config?.payload||''} onChange={e=>updateNode({config:{...selectedNode.config, payload:e.target.value}})} placeholder='{ "dato": "{{ $json.variable }}" }' rows={3} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition font-mono text-xs"/></div>
                </div>
              )}

              {['Twitter / X Bot', 'LinkedIn Bot'].includes(selectedNode.title) && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Contenido del Post</label><textarea value={selectedNode.config?.text||''} onChange={e=>updateNode({config:{...selectedNode.config, text:e.target.value}})} placeholder="Publicando sobre {{ $json.tema }} #Tendencias" rows={3} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition"/></div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2"><p className="text-[9px] text-amber-400">Requiere configuración de API Keys en el backend (OAuth 2.0)</p></div>
                </div>
              )}

              {selectedNode.title === 'Airtable' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Acción</label>
                    <select value={selectedNode.config?.action||'write'} onChange={e=>updateNode({config:{...selectedNode.config, action:e.target.value}})} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition">
                      <option value="write">Escribir registro</option><option value="read">Leer registros</option>
                    </select>
                  </div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Base ID</label><input value={selectedNode.config?.baseId||''} onChange={e=>updateNode({config:{...selectedNode.config, baseId:e.target.value}})} placeholder="appXXXXXXXXXXXXXX" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Tabla</label><input value={selectedNode.config?.table||''} onChange={e=>updateNode({config:{...selectedNode.config, table:e.target.value}})} placeholder="Nombre de la tabla" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div className="bg-neutral-800/50 rounded-lg p-2"><p className="text-[9px] text-neutral-400">Credencial en .env: AIRTABLE_API_KEY</p></div>
                </div>
              )}

              {selectedNode.title === 'Supabase' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Acción</label>
                    <select value={selectedNode.config?.action||'insert'} onChange={e=>updateNode({config:{...selectedNode.config, action:e.target.value}})} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition">
                      <option value="insert">Insertar</option><option value="select">Leer</option>
                    </select>
                  </div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Tabla</label><input value={selectedNode.config?.table||''} onChange={e=>updateNode({config:{...selectedNode.config, table:e.target.value}})} placeholder="users, leads, orders..." className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div className="bg-neutral-800/50 rounded-lg p-2"><p className="text-[9px] text-neutral-400">Credenciales en .env: SUPABASE_URL, SUPABASE_ANON_KEY</p></div>
                </div>
              )}

              {selectedNode.title === 'Notion' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Database ID</label><input value={selectedNode.config?.databaseId||''} onChange={e=>updateNode({config:{...selectedNode.config, databaseId:e.target.value}})} placeholder="ID de la base de datos de Notion" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Título de la página</label><input value={selectedNode.config?.title||''} onChange={e=>updateNode({config:{...selectedNode.config, title:e.target.value}})} placeholder="{{ $json.tema }} - {{ $json.fecha }}" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div className="bg-neutral-800/50 rounded-lg p-2"><p className="text-[9px] text-neutral-400">Credencial en .env: NOTION_API_KEY</p></div>
                </div>
              )}

              {selectedNode.title === 'Google Sheets' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Acción</label>
                    <select value={selectedNode.config?.action||'append'} onChange={e=>updateNode({config:{...selectedNode.config, action:e.target.value}})} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition">
                      <option value="append">Agregar fila</option><option value="read">Leer datos</option><option value="update">Actualizar celda</option>
                    </select>
                  </div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">ID del Spreadsheet</label><input value={selectedNode.config?.spreadsheetId||''} onChange={e=>updateNode({config:{...selectedNode.config, spreadsheetId:e.target.value}})} placeholder="ID de la URL de Google Sheets" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Hoja (Sheet)</label><input value={selectedNode.config?.sheetName||''} onChange={e=>updateNode({config:{...selectedNode.config, sheetName:e.target.value}})} placeholder="Hoja1" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                </div>
              )}

              {selectedNode.title === 'Cal.com' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Endpoint</label>
                    <select value={selectedNode.config?.endpoint||'bookings'} onChange={e=>updateNode({config:{...selectedNode.config, endpoint:e.target.value}})} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition">
                      <option value="bookings">Leer citas</option><option value="slots">Ver disponibilidad</option>
                    </select>
                  </div>
                  <div className="bg-neutral-800/50 rounded-lg p-2"><p className="text-[9px] text-neutral-400">Credencial en .env: CALCOM_API_KEY — Alternativa gratis a Calendly</p></div>
                </div>
              )}

              {selectedNode.title === 'Pinterest API' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Board ID</label><input value={selectedNode.config?.boardId||''} onChange={e=>updateNode({config:{...selectedNode.config, boardId:e.target.value}})} placeholder="ID del tablero de Pinterest" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Título del Pin</label><input value={selectedNode.config?.title||''} onChange={e=>updateNode({config:{...selectedNode.config, title:e.target.value}})} placeholder="{{ $json.tema }}" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">URL de la imagen</label><input value={selectedNode.config?.imageUrl||''} onChange={e=>updateNode({config:{...selectedNode.config, imageUrl:e.target.value}})} placeholder="{{ $json._imageUrl }}" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div className="bg-neutral-800/50 rounded-lg p-2"><p className="text-[9px] text-neutral-400">Credencial en .env: PINTEREST_ACCESS_TOKEN</p></div>
                </div>
              )}

              {selectedNode.title === 'Delay / Espera' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Minutos</label><input type="number" min="0" max="5" value={selectedNode.config?.minutes||0} onChange={e=>updateNode({config:{...selectedNode.config, minutes:parseInt(e.target.value)||0}})} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Segundos adicionales</label><input type="number" min="0" max="59" value={selectedNode.config?.seconds||0} onChange={e=>updateNode({config:{...selectedNode.config, seconds:parseInt(e.target.value)||0}})} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2"><p className="text-[9px] text-amber-400">Máximo 5 minutos por paso para no bloquear el engine</p></div>
                </div>
              )}

              {selectedNode.title === 'Loop / Iterador' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Campo del array a iterar</label><input value={selectedNode.config?.arrayField||'plan'} onChange={e=>updateNode({config:{...selectedNode.config, arrayField:e.target.value}})} placeholder="plan, items, results..." className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div className="bg-neutral-800/50 rounded-lg p-2"><p className="text-[9px] text-neutral-400">El loop expone _loopItems y _loopCount al siguiente nodo</p></div>
                </div>
              )}

              {selectedNode.title === 'Set Variables' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Variables (JSON)</label><textarea value={selectedNode.config?.variablesRaw||''} onChange={e=>updateNode({config:{...selectedNode.config, variablesRaw:e.target.value, variables: (() => { try { return JSON.parse(e.target.value); } catch{ return {}; } })()}})} placeholder={'{ "clienteNombre": "{{ $json.nombre }}", "total": 0 }'} rows={4} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-xs font-mono outline-none resize-none transition"/></div>
                  <div className="bg-neutral-800/50 rounded-lg p-2"><p className="text-[9px] text-neutral-400">Estas variables estarán disponibles en todos los nodos siguientes vía {'{{ $json.varName }}'}</p></div>
                </div>
              )}

              {selectedNode.title === 'PDF Generator' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Nombre del archivo</label><input value={selectedNode.config?.filename||''} onChange={e=>updateNode({config:{...selectedNode.config, filename:e.target.value}})} placeholder="contrato-{{ $json.nombre }}.pdf" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">HTML del documento</label><textarea value={selectedNode.config?.htmlTemplate||''} onChange={e=>updateNode({config:{...selectedNode.config, htmlTemplate:e.target.value}})} placeholder="<h1>Contrato para {{ $json.nombre }}</h1>..." rows={4} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-xs font-mono outline-none resize-none transition"/></div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2"><p className="text-[9px] text-emerald-400">Usa Puppeteer (ya instalado) — genera PDF sin servicios externos</p></div>
                </div>
              )}

              {selectedNode.title === 'RSS Feed' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">URL del Feed RSS</label><input value={selectedNode.config?.url||''} onChange={e=>updateNode({config:{...selectedNode.config, url:e.target.value}})} placeholder="https://feeds.ejemplo.com/rss" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Máximo artículos</label><input type="number" min="1" max="20" value={selectedNode.config?.limit||5} onChange={e=>updateNode({config:{...selectedNode.config, limit:parseInt(e.target.value)||5}})} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div className="bg-neutral-800/50 rounded-lg p-2"><p className="text-[9px] text-neutral-400">Resultado disponible como {'{{ $json._rssFeedItems }}'} en el siguiente nodo</p></div>
                </div>
              )}

              {selectedNode.title === 'Google Analytics' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Nombre del Evento</label><input value={selectedNode.config?.eventName||'automation_triggered'} onChange={e=>updateNode({config:{...selectedNode.config, eventName:e.target.value}})} placeholder="lead_generated, sale_completed..." className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div className="bg-neutral-800/50 rounded-lg p-2"><p className="text-[9px] text-neutral-400">Credenciales en .env: GA_MEASUREMENT_ID, GA_API_SECRET</p></div>
                </div>
              )}

              {selectedNode.title === 'Stripe Webhook' && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Evento a escuchar</label>
                    <select value={selectedNode.config?.event||'payment_intent.succeeded'} onChange={e=>updateNode({config:{...selectedNode.config, event:e.target.value}})} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition">
                      <option value="payment_intent.succeeded">Pago exitoso</option>
                      <option value="customer.subscription.created">Nueva suscripción</option>
                      <option value="invoice.paid">Factura pagada</option>
                      <option value="any">Cualquier evento</option>
                    </select>
                  </div>
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-2"><p className="text-[9px] text-cyan-400">Configura el endpoint en dashboard.stripe.com/webhooks → tu URL de webhook</p></div>
                </div>
              )}

              {['YouTube Data API', 'Facebook Ads API', 'Google Calendar API'].includes(selectedNode.title) && (
                <div className="space-y-2">
                  <div><label className="text-[10px] text-neutral-400 mb-1 block">Acción</label><input value={selectedNode.config?.action||''} onChange={e=>updateNode({config:{...selectedNode.config, action:e.target.value}})} placeholder="create, read, update, delete..." className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2"><p className="text-[9px] text-amber-400">⚠️ Requiere OAuth — configura en Google Cloud Console / Meta Developers</p></div>
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
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold text-blue-400 flex items-center gap-1"><Power className="w-3 h-3"/>Motor</p>
                {selectedNode.pm2_process && pm2Status.find(x=>x.name===selectedNode.pm2_process) && (
                  <button onClick={(e) => { e.preventDefault(); handleRestartProcess(selectedNode.pm2_process); }} className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 text-[9px] font-bold transition flex items-center gap-1">
                    <Zap className="w-2 h-2"/> Reiniciar
                  </button>
                )}
              </div>
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
  const isJareg = username === 'jareg' || username === 'oscar' || adminProfile.role === 'admin';

  const loadGalaxy = useCallback(async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    setIsLoadingGalaxy(true);
    try {
      const [flowsRes, statusRes] = await Promise.all([
        fetch('/api/automation/flows', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/automation/status', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const fd = await flowsRes.json().catch(() => ({ success: false, flows: [] }));
      const sd = await statusRes.json().catch(() => ({ success: false, pm2: [] }));
      
      let mappedFlows = [];
      if (fd.success) {
        mappedFlows = fd.flows || [];
      }
      
      if (!mappedFlows.some(f => f.id === 1 || f.name === 'Sistema Central')) {
          mappedFlows.unshift({
              id: 1,
              name: 'Sistema Central',
              created_by: 'sistema',
              nodes: FLOW_TEMPLATES[0].nodes,
              edges: FLOW_TEMPLATES[0].edges,
              node_count: FLOW_TEMPLATES[0].nodes.length,
              edge_count: FLOW_TEMPLATES[0].edges.length,
          });
      }
      setFlows(mappedFlows);
      
      if (sd.success) setPm2Status(sd.pm2 || []);

      if (isJareg) {
        const pr = await fetch('/api/automation/change-requests', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
        if (pr) {
            const pd = await pr.json().catch(() => ({ success: false }));
            if (pd.success) setPendingRequests(pd.requests || []);
        }
      }
    } catch (e) { 
        console.error(e); 
        setFlows([{
            id: 1,
            name: 'Sistema Central',
            created_by: 'sistema',
            nodes: FLOW_TEMPLATES[0].nodes,
            edges: FLOW_TEMPLATES[0].edges,
            node_count: FLOW_TEMPLATES[0].nodes.length,
            edge_count: FLOW_TEMPLATES[0].edges.length,
        }]);
    }
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

  const handleCloneTemplate = async (template) => {
    const name = window.prompt('Nombre para tu nueva neurona basada en plantilla:', template.name);
    if (!name) return;
    const token = localStorage.getItem('adminToken');
    try {
      const r = await fetch('/api/automation/flow/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, nodes: template.nodes, edges: template.edges }),
      });
      const d = await r.json();
      if (d.success) { setActiveFlowId(d.flowId); setActiveFlowName(name); setView('editor'); }
    } catch (e) { alert('Error clonando plantilla.'); }
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
          : <GalaxyView flows={flows} pm2Status={pm2Status} onEditFlow={handleEditFlow} onNewFlow={handleNewFlow} onDeleteFlow={handleDeleteFlow} username={username} onCloneTemplate={handleCloneTemplate} />
      ) : (
        <EditorView flowId={activeFlowId} flowName={activeFlowName} username={username} pm2Status={pm2Status} onBack={()=>{ setView('galaxy'); loadGalaxy(); }} onSaved={handleSaved} />
      )}
    </div>
  );
}

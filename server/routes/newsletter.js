import express from 'express';
import {
    subscribe,
    unsubscribe,
    getSubscribers,
    sendNewsletter,
    getHistory,
    deleteNewsletter,
    deleteSubscriber,
} from '../controllers/newsletterController.js';

import { generateAndSendAutoNewsletter } from '../services/newsletterGenerator.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { executeAiWaterfall } from '../utils/aiWaterfall.js';
import pool from '../config/db.js';

const router = express.Router();

// Públicas
router.post('/subscribe',     subscribe);
router.get ('/unsubscribe',   unsubscribe);

// Privadas (protegidas por JWT en Backend)
router.get ('/subscribers',   requireAdmin, getSubscribers);
router.delete('/subscribers/:id', requireAdmin, deleteSubscriber);
router.post('/send',          requireAdmin, sendNewsletter);
router.get ('/history',       requireAdmin, getHistory);
router.delete('/delete/:id',  requireAdmin, deleteNewsletter);
router.post('/generate-draft', requireAdmin, async (req, res) => {
    try {
        const feedback = req.body.feedback || null;
        const result = await generateAndSendAutoNewsletter(feedback);
        res.json({ success: true, ...result });
    } catch (e) {
        console.error("Generator Error", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/generate-video-plan', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT subject, body_html FROM newsletters ORDER BY sent_at DESC NULLS FIRST, id DESC LIMIT 1`
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'No se encontró ningún boletín en el historial.' });
        }
        
        const latestNewsletter = result.rows[0];
        
        const systemPrompt = `Eres el Director Creativo de Godzilla Consulting. Tu misión es analizar el último Boletín del Día y crear un plan de videos virales para redes sociales (TikTok/Reels).
DEBES generar exactamente UN video por cada noticia o tema importante que encuentres en el boletín.

CONTENIDO DEL BOLETÍN:
Título: ${latestNewsletter.subject}
Cuerpo: ${latestNewsletter.body_html.substring(0, 5000)}

ESTRUCTURA PARA CADA VIDEO (Noticia):
- Título: Tema de la noticia.
- Escena 1 (GANCHO): Llama la atención rápido sobre la noticia.
- Escena 2 (RETENCIÓN): Plantea el contexto o el problema.
- Escena 3 (VALOR): Da los detalles clave de la noticia.
- Escena 4 (CLÍMAX): El impacto o conclusión más fuerte.
- Escena 5 (CTA): Llamado a la acción rápido (ej. "Síguenos para más noticias") sin usar URLs.

ESTÉTICA Y TEXTOS (CRÍTICO):
1. Todos los "visual_prompt" DEBEN especificar formato vertical 9:16 (ej. "Vertical 9:16 aspect ratio...").
2. Debes llenar el campo "text_on_screen" con subtítulos llamativos o palabras resaltadas (ej. "[TEXTO ROJO] ¡Cuidado!").

Responde ÚNICAMENTE con un JSON válido con este formato EXACTO (Array de objetos):
[
  {
    "Tema": "Tema de la noticia 1",
    "scenes": [
      {
        "narration": "Texto en español fluido para voz",
        "text_on_screen": "Subtítulos o textos clave",
        "visual_prompt": "Vertical 9:16 framing, hyper-detailed english prompt",
        "audio_sfx": "Efectos sonoros sugeridos",
        "video_prompt": "Instrucciones de cámara en inglés"
      }
    ]
  },
  {
    "Tema": "Tema de la noticia 2",
    "scenes": [ ... ]
  }
]`;

        const aiRes = await executeAiWaterfall([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Genera el JSON de videos del boletín ahora.' }
        ], { jsonMode: true, mode: 'premium' });

        let responseText = aiRes.content || '';
        if (responseText.startsWith('\`\`\`json')) responseText = responseText.replace(/\`\`\`json\n?/, '').replace(/\`\`\`$/, '');
        else if (responseText.startsWith('\`\`\`')) responseText = responseText.replace(/\`\`\`\n?/, '').replace(/\`\`\`$/, '');
        
        let parsed = JSON.parse(responseText.trim());
        
        // El array es directamente el "script" que consume el frontend
        if (!Array.isArray(parsed) && parsed.videos) parsed = parsed.videos.map(v => ({ Tema: v.topic || v.Tema || "Noticia", scenes: v.scenes }));
        if (!Array.isArray(parsed) && parsed.plan) parsed = parsed.plan;
        if (!Array.isArray(parsed)) parsed = [parsed];
        
        res.json({ success: true, script: parsed });
    } catch (e) {
        console.error("Newsletter to Video Error", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;

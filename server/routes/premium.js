import express from 'express';
import pool from '../config/db.js';
import { buildPremiumPDF } from '../services/pdfPremiumBuilder.js';

export const router = express.Router();

router.get('/download/:id', async (req, res) => {
    try {
        const newsletterId = req.params.id;
        const isPreview = req.query.preview === 'true'; // Backdoor para Admins probando borradores
        // Magia de Detección de Dispositivo Nativo (Safari, Chrome, iPhone, Mac)
        let reqLang = req.query.lang;
        if (!reqLang) { 
            const acceptHeader = req.headers['accept-language'];
            if (acceptHeader && acceptHeader !== '*') {
                // Toma cosas como 'en-US,en;q=0.9,ja;q=0.8' y extrae 'en' o 'ja' (2 letras Iso)
                reqLang = acceptHeader.split(',')[0].split('-')[0].toLowerCase();
            } else {
                reqLang = 'es';
            }
        }
        
        // Blindaje final: Si Vercel manda basura o ISOs raros, forzar a español para evitar alucinaciones IA
        const validLangs = ['es', 'en', 'fr', 'pt', 'de', 'ja', 'it', 'zh'];
        if (!reqLang || !validLangs.includes(reqLang)) {
            reqLang = 'es';
        }
        
        // EVASION DE VERCEL PROXY (PREVIENE PANTALLA NEGRA/CORRUPCION BINARIA)
        if (req.headers.host && req.headers.host.includes('godzillaconsulting.ai') && !req.headers.host.includes('bot.')) {
            // Si el request vino por Vercel, redirigir al Túnel Directo
            return res.redirect(`https://bot.godzillaconsulting.ai/api/premium/download/${newsletterId}?lang=${reqLang || ''}`);
        }

        // PAYWALL INTERCEPTOR (EN VIVO) 🔒
        // [DESACTIVADO TEMPORALMENTE A PETICIÓN]
        /* if (!isPreview) {
            const frontendUrl = process.env.FRONTEND_URL || 'https://godzillaconsulting.ai';
            return res.redirect(`${frontendUrl}/socios`);
            // NOTA FUTURA: Aquí meteríamos la validación del Token de Suscriptor Real (sub.tier === 'premium')
        } */

        
        
        const nlRes = await pool.query(`SELECT base_json, translations_json FROM newsletters WHERE id = $1`, [newsletterId]);
        if (nlRes.rows.length === 0 || !nlRes.rows[0].base_json) {
            return res.status(404).send("Reporte Premium no encontrado o Data no disponible.");
        }

        const translationsDict = nlRes.rows[0].translations_json;
        let dataForPDF;
        
        if (translationsDict && translationsDict[reqLang]) {
            dataForPDF = translationsDict[reqLang];
            console.log(`🌍 [Zero-Token PDF] Sirviendo PDF del diccionario para idioma: ${reqLang}`);
        } else {
            console.log(`🌍 [Zero-Token PDF] Idioma ${reqLang} no encontrado en diccionario. Fallback a base_json (es).`);
            dataForPDF = JSON.parse(nlRes.rows[0].base_json);
        }

        // Build doc
        const pdfBuffer = await buildPremiumPDF(dataForPDF, reqLang);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="Godzilla-Premium-Report-${reqLang}.pdf"`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error("[PDF Dynamic API] Error:", error);
        res.status(500).send("Error generando el Reporte Ejecutivo bajo demanda.");
    }
});

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
        
        // Si reqLang no es válido o tiene basura, forzar a 'es'
        if (!reqLang || reqLang.length !== 2) {
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

        let translationsDict = nlRes.rows[0].translations_json || {};
        let dataForPDF;
        
        if (translationsDict && translationsDict[reqLang]) {
            dataForPDF = translationsDict[reqLang];
            console.log(`🌍 [Zero-Token PDF] Sirviendo PDF del diccionario para idioma: ${reqLang}`);
        } else {
            console.log(`🌍 [On-Demand PDF] Idioma ${reqLang} no encontrado en diccionario. Iniciando traducción dinámica...`);
            try {
                const { executeAiWaterfall } = await import('../utils/aiWaterfall.js');
                const baseJsonText = nlRes.rows[0].base_json;
                const transPrompt = `Translate the following JSON precisely into ISO language code [${reqLang}]. Keep EXACT JSON keys and schema. Do not change structure. Return ONLY pure valid JSON:\n\n${baseJsonText}`;
                
                const transRes = await executeAiWaterfall([
                    { role: 'system', content: "You are a perfect JSON translator. Reply only with valid JSON." },
                    { role: 'user', content: transPrompt }
                ], { jsonMode: true });
                
                let jsonStr = transRes.content.replace(/```json/i, '').replace(/```/i, '').trim();
                if (!jsonStr.startsWith('{')) jsonStr = '{' + jsonStr.substring(jsonStr.indexOf('{'));
                if (!jsonStr.endsWith('}')) jsonStr = jsonStr.substring(0, jsonStr.lastIndexOf('}') + 1);
                
                dataForPDF = JSON.parse(jsonStr);

                // Guardar en la DB para enriquecer el Mega-Diccionario
                translationsDict[reqLang] = dataForPDF;
                await pool.query(`UPDATE newsletters SET translations_json = $1 WHERE id = $2`, [JSON.stringify(translationsDict), newsletterId]);
                console.log(`✅ Traducción dinámica a ${reqLang} exitosa y guardada permanentemente.`);
            } catch (aiErr) {
                console.error(`❌ Fallo traduciendo al vuelo a ${reqLang}. Fallback de emergencia a español (es).`, aiErr.message);
                dataForPDF = JSON.parse(nlRes.rows[0].base_json);
                reqLang = 'es';
            }
        }

        // Build doc
        const pdfBuffer = await buildPremiumPDF(dataForPDF, reqLang, nlRes.rows[0].cover_url);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="Godzilla-Premium-Report-${reqLang}.pdf"`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error("[PDF Dynamic API] Error:", error);
        res.status(500).send("Error generando el Reporte Ejecutivo bajo demanda.");
    }
});

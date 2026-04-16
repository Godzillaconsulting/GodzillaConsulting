import { GoogleGenerativeAI } from '@google/generative-ai';
import pool from '../config/db.js';
import { enqueueNewsletter } from './emailQueue.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { ARCHIVOS_PESADOS_DIR } from '../routes/media.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_DIR = ARCHIVOS_PESADOS_DIR;

const getClient = () => {
    return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

export async function generateAndSendAutoNewsletter() {
    console.log("🤖 Iniciando Auto-Generador de Godzilla Newsletter...");
    
    // 1. GENERACIÓN DE ESTRATEGIA (Gemini)
    const genAI = getClient();
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: "Eres Godzilla AI... Escrito experto B2B.",
        generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Crea la edición semanal de hoy del boletín para empresarios de tu base de datos.
El tema principal: "Despliegue de Motores Inteligentes y Agentes Autónomos."
El objetivo es enganchar por corro pero entregarles un reporte PDF estructurado mediante un link adjunto.

DEVUELVE ÚNICAMENTE UN JSON válido sin markdown, con la siguiente estructura:
{
    "subject": "Asunto de correo (incluye emoji ejecutivo)",
    "emailHTML": "<h2 style=\\"color:#CC0000;\\">Titular Correo...</h2><p>Texto gancho persuasivo del correo</p>",
    "pdfTitle": "TÍTULO FORMAL DEL REPORTE PARA EL PDF",
    "pdfBody": "Varios párrafos largos de 150 palabras analizando métricas, herramientas de IA (ej Gemini, Agentes) y estrategia que irán dentro del interior del reporte en PDF."
}`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/i, '').replace(/```/i, '').trim();
    const data = JSON.parse(text);

    console.log("✅ Contenido IA Generado. Construyendo PDF Corporativo...");

    // 2. CREACIÓN DEL REPORTE PDF (En memoria) y MANEJO DE ERRORES
    let pdfBuffer = null;
    let attachmentUrl = null;

    try {
        pdfBuffer = await new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 50 });
                const buffers = [];
                
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    resolve(Buffer.concat(buffers));
                });
                // doc.on('error', reject); // just in case

                // Diseño del PDF
                doc.rect(0, 0, doc.page.width, 120).fill('#111111');
                doc.fillColor('#CC0000').fontSize(24).font('Helvetica-Bold').text('GODZILLA CONSULTING', 50, 45);
                doc.fillColor('#ffffff').fontSize(10).font('Helvetica').text('REPORTE EJECUTIVO SEMANAL', 50, 75);

                doc.moveDown(4); // Espacio después del header negro

                doc.fillColor('#000000').fontSize(18).font('Helvetica-Bold').text(data.pdfTitle, { align: 'left' });
                doc.moveDown(1);
                
                doc.fillColor('#333333').fontSize(11).font('Helvetica').lineGap(6).text(data.pdfBody, { align: 'justify' });

                doc.moveDown(2);
                doc.fillColor('#CC0000').fontSize(12).font('Helvetica-Bold').text('A la vanguardia corporativa. Agenda hoy en godzillaconsulting.ai');

                doc.end();
            } catch (e) {
                reject(e);
            }
        });

        console.log("✅ PDF Compilado (" + (pdfBuffer.length / 1024).toFixed(1) + " KB). Inyectando a Base de Datos Local...");

        // SUBIDA A DISCO LOCAL (BYPASS DB Local LIMITS) Y GENERACIÓN DE ENLACE
        const filename = `Reporte-Ejecutivo-Godzilla-${Date.now()}.pdf`;
        const targetPath = path.join(ASSETS_DIR, filename);
        await fs.promises.writeFile(targetPath, pdfBuffer);

        // La URL oficial pública que usa media.js para el directorio estático:
        const botBase = process.env.BOT_MEDIA_URL || process.env.PUBLIC_MEDIA_URL || '';
        attachmentUrl = `${botBase}/api/media/assets/${filename}`;

        console.log("✅ PDF Guardado Físicamente. URL Estática:", attachmentUrl);
    } catch (pdfErr) {
        console.error("⚠️ [CRITICAL] Fallo en empaquetado PDF. Enviando notificación en lugar del archivo.", pdfErr.message);
        data.emailHTML += `
<br><hr><br>
<div style="background-color: #fff3f3; border-left: 4px solid #CC0000; padding: 15px; margin-top: 20px;">
    <p style="color:#CC0000; font-size:13px; font-weight:bold; margin-top:0;">⚠️ AVISO DEL SISTEMA AUTOMATIZADO</p>
    <p style="color:#555; text-align:justify; font-size:12px; margin-bottom:0;">
        Nuestro bot detectó un fallo al ensamblar en tiempo real el archivo PDF interactivo adjunto a este envío de hoy. 
        El equipo de inteligencia de Godzilla Consulting ya fue notificado y está empaquetando manualmente la información del archivo dañado para subirlo pronto a la plataforma. Disculpa los inconvenientes.
    </p>
</div>`;
    }

    // 4. CREACIÓN DEL BORRADOR & ENCOLAMIENTO
    console.log("🚀 Desplegando en Bandeja de Salida para TODOS los suscriptores...");
    // El usuario pidió "Haz una prueba, dejé mi correo." Lo vamos a insertar como 'sending' directamente
    const nlRes = await pool.query(
        `INSERT INTO newsletters (subject, body_html, attachment_url, status)
         VALUES ($1, $2, $3, 'draft') RETURNING id`, // Lo pondremos en status draft pero llamaremos a enqueue
        [data.subject, data.emailHTML, attachmentUrl]
    );
    const newsletterId = nlRes.rows[0].id;

    const total = await enqueueNewsletter(newsletterId);
    console.log(`🎉 ¡Éxito Masivo! Boletín [ID: ${newsletterId}] liberado para ${total} suscriptores.`);

    return { newsletterId, total, attachmentUrl };
}

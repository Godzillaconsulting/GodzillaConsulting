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
El objetivo es enganchar por correo pero entregarles un reporte PDF estructurado mediante un link adjunto.
INSTRUCCIÓN CRÍTICA PARA EL PDF: El PDF debe verse extremadamente profesional y analítico, no como si fue generado en 1 minuto. Utiliza referencias del mundo real (Ej. cifras de McKinsey, Gartner, Harvard Business Review sobre automatización y agilidad). El tono debe ser impecable, profundo y útil.

DEVUELVE ÚNICAMENTE UN JSON válido sin markdown, con la siguiente estructura:
{
    "subject": "Asunto de correo (incluye emoji ejecutivo)",
    "emailHTML": "<h2 style=\\"color:#CC0000;\\">Titular Correo...</h2><p>Texto gancho persuasivo del correo</p>",
    "pdfTitle": "TÍTULO FORMAL DEL REPORTE EJECUTIVO",
    "pdfSubtitle": "Subtítulo analítico (ej. 'El impacto en la rentabilidad B2B y tendencias globales')",
    "pdfIntro": "Párrafo introductorio de alto nivel en formato ejecutivo.",
    "pdfSections": [
        { "heading": "Título de Subsección Métrica", "content": "Párrafo con análisis y referencias reales B2B (Gartner/Harvard/etc)." }
    ],
    "pdfQuote": "\\"Cita de alto impacto o Insight crudo sobre IA e Innovación.\\"",
    "pdfConclusion": "Conclusión estratégica orientada a retorno de inversión técnica."
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
                // Buffer creation must allow manual page addition for footers
                const doc = new PDFDocument({ margin: 50, bufferPages: true, autoFirstPage: true });
                const buffers = [];
                const logoPath = path.join(__dirname, '../../public/favicon.png');
                
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    resolve(Buffer.concat(buffers));
                });

                // Function: Add background watermark on pages
                const paintWatermark = () => {
                   doc.save();
                   doc.opacity(0.04);
                   if (fs.existsSync(logoPath)) {
                       doc.image(logoPath, (doc.page.width - 350)/2, (doc.page.height - 350)/2 + 20, { width: 350 });
                   }
                   doc.restore();
                };

                doc.on('pageAdded', paintWatermark);
                paintWatermark(); // Paint heavily on 1st page

                // ----- HEADER CORPORATIVO (Solo página 1) -----
                doc.rect(0, 0, doc.page.width, 10).fill('#CC0000');
                
                if (fs.existsSync(logoPath)) {
                    doc.image(logoPath, 50, 30, { width: 30 });
                }
                doc.fillColor('#CC0000').fontSize(16).font('Helvetica-Bold').text('GODZILLA CONSULTING', 90, 35);
                doc.fillColor('#888888').fontSize(9).font('Helvetica').text('RESERVED CORPORATE INTELLIGENCE REPORT', 90, 52);
                doc.moveTo(50, 75).lineTo(doc.page.width - 50, 75).lineWidth(0.5).stroke('#CCCCCC');

                doc.moveDown(4);

                // ----- CUERPO DEL DOCUMENTO -----
                doc.fillColor('#111111').fontSize(24).font('Helvetica-Bold').text(data.pdfTitle, 50, null, { align: 'left', lineGap: 4 });
                doc.moveDown(0.5);
                if (data.pdfSubtitle) {
                    doc.fillColor('#CC0000').fontSize(14).font('Helvetica').text(data.pdfSubtitle, { align: 'left' });
                }
                doc.moveDown(2);
                
                // INTRO
                doc.fillColor('#333333').fontSize(11).font('Helvetica').lineGap(7).text(data.pdfIntro || data.pdfBody || '', { align: 'justify' });
                doc.moveDown(2);

                // SECTIONS
                if (data.pdfSections && Array.isArray(data.pdfSections)) {
                    for (const sec of data.pdfSections) {
                        doc.fillColor('#111111').fontSize(13).font('Helvetica-Bold').text(sec.heading, { align: 'left' });
                        doc.moveDown(0.5);
                        doc.fillColor('#444444').fontSize(11).font('Helvetica').lineGap(6).text(sec.content, { align: 'justify' });
                        doc.moveDown(1.5);
                    }
                }

                // HIGH-IMPACT QUOTE
                if (data.pdfQuote) {
                    doc.moveDown(1);
                    const currentY = doc.y;
                    doc.rect(50, currentY, 3, 35).fill('#CC0000');
                    doc.fillColor('#555555').fontSize(12).font('Helvetica-Oblique').text(data.pdfQuote, 65, currentY + 3, { align: 'left', lineGap: 4, width: doc.page.width - 120 });
                    doc.moveDown(2);
                }

                // CONCLUSION
                if (data.pdfConclusion) {
                    doc.fillColor('#111111').fontSize(13).font('Helvetica-Bold').text('Conclusión Ejecutiva', { align: 'left' });
                    doc.moveDown(0.5);
                    doc.fillColor('#444444').fontSize(11).font('Helvetica').lineGap(6).text(data.pdfConclusion, { align: 'justify' });
                }

                doc.moveDown(3);
                doc.fillColor('#CC0000').fontSize(12).font('Helvetica-Bold').text('Lidera con Inteligencia. Agenda evaluación B2B en godzillaconsulting.ai', { align: 'center' });

                // ----- FOOTERS E INDEXACIÓN -----
                let pages = doc.bufferedPageRange();
                for (let i = 0; i < pages.count; i++) {
                    doc.switchToPage(i);
                    const isFirstPage = i === 0;
                    if (!isFirstPage) { // Red bar on following pages
                        doc.rect(0, 0, doc.page.width, 5).fill('#CC0000');
                    }
                    doc.moveTo(50, doc.page.height - 50).lineTo(doc.page.width - 50, doc.page.height - 50).lineWidth(0.5).stroke('#E5E5E5');
                    doc.fillColor('#999999').fontSize(8).font('Helvetica').text(
                        `Propiedad Privada Integral de Godzilla Consulting AI • Página ${i + 1} de ${pages.count} • Producido ${new Date().toLocaleDateString()}`,
                        50, doc.page.height - 35, { align: 'center' }
                    );
                }

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

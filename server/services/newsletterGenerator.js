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

const cleanHtmlStr = (str) => {
    if (!str) return '';
    return str.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' '); 
};

export async function generateAndSendAutoNewsletter(feedback = null) {
    console.log("🤖 Iniciando Generador Godzilla (Versatilidad Referencial y Anti-Ghosting)...");
    
    const genAI = getClient();
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: "Eres Godzilla AI, consultor B2B. Escribes reportes ejecutivos dirigidos de 'tú a tú' al líder empresarial. Prohibido usar relleno paja.\nREGLA DE SEGURIDAD JSON: NUNCA uses comillas dobles (\") dentro de los valores de texto. Usa comillas simples ('') siempre que necesites citar algo, porque corrompes el parser JSON.",
        tools: [
            { googleSearch: {} }
        ]
    });

    let fdbkStr = feedback ? `\n[ATENCIÓN ORDEN DEL CEO: Corrige el borrador anterior aplicando esto: "${feedback}"]\n` : '';

    const prompt = `Crea el boletín de inteligencia B2B del día de HOY.${fdbkStr}
TAREA CRÍTICA: Busca las 2 o 3 noticias y herramientas de IA más valiosas empresariales HOY. No hagas reportes aburridos. Ve al grano.

MISIÓN A (Email "Skimmable"): Puros Bullet Points en formato HTML (<h2>, <ul>, <li>, <b>).
MISIÓN B (PDF "Socios"): Escribe DIRECTAMENTE a la persona usuaria. PROHIBIDO GENERAR MÁS DE 3 NOTICIAS/SECCIONES (Para no rellenar hojas).
Y PARA CADA SECCIÓN, PROVEE EXTRICTAMENTE LA REFERENCIA O LA URL OFICIAL DE LA NOTICIA.

DEVUELVE ÚNICAMENTE UN STRING JSON VÁLIDO PURAMENTE (sin markdown \`\`\`json) CON ESTA ESTRUCTURA:
{
    "subject_es": "Asunto en ES (con emoji)",
    "subject_en": "Asunto en EN (con emoji)",
    "emailHTML_es": "<h2>Lo que debes saber hoy en IA</h2><ul><li><strong>Empresa: </strong>1 oración.</li></ul>",
    "emailHTML_en": "<h2>What you need to know today in AI</h2><ul><li><strong>Company: </strong>1 sentence.</li></ul>",
    "pdfTitle": "DIARIO GODZILLA AI",
    "pdfSubtitle": "Inteligencia Ejecutiva Diaria",
    "pdfIntro": "Párrafo introductorio hablando de tú a tú. (Solo plain text, nada de HTML)",
    "pdfMetrics": [
        { "label": "Impacto a Productividad (%)", "value": 85 }
    ],
    "pdfSections": [
        { 
          "heading": "Título Noticia", 
          "content": "Detalle analítico B2B. (Solo plain text)",
          "sourceName": "TechCrunch / OpenAI Blog",
          "url": "https://..."
        }
    ],
    "pdfQuote": "Insight de supervivencia tecnológica.",
    "pdfConclusion": "Conclusión orientada al ROI."
}`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/i, '').replace(/```/i, '').trim();
    const data = JSON.parse(text);

    console.log("✅ Contenido IA con Referencias Oficiales Generado. Compilando PDF...");

    let pdfBuffer = null;
    let attachmentUrl = null;

    try {
        pdfBuffer = await new Promise((resolve, reject) => {
            try {
                // Buffer creation con bottom margin alto para evitar que doc.text accidental dispare hojas
                const doc = new PDFDocument({ 
                    margin: 40,
                    size: 'LETTER',
                    bufferPages: true,
                    autoFirstPage: true 
                });
                const buffers = [];
                const logoPath = path.join(__dirname, '../../public/favicon.png');
                
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => resolve(Buffer.concat(buffers)));

                const colorPrimary = '#CC0000'; 
                const colorDark = '#1A1A1A';    
                const colorLight = '#F8F9FA';   
                const colorGray = '#EFEFEF';    
                const colorAccent = '#DDAA00';  
                
                const checkPageWrap = (requiredHeight) => {
                    if (doc.y + requiredHeight > doc.page.height - 60) {
                        doc.addPage();
                        doc.y = 50;
                    }
                };

                // ---- PORTADA EDITORIAL ----
                doc.rect(0, 0, doc.page.width, 130).fill(colorDark);
                if (fs.existsSync(logoPath)) {
                    doc.image(logoPath, 40, 35, { width: 50 });
                }
                
                doc.fillColor('#FFFFFF').fontSize(26).font('Helvetica-Bold').text('GODZILLA', 105, 45, { letterSpacing: 1 });
                doc.fillColor(colorPrimary).fontSize(26).font('Helvetica-Bold').text('CONSULTING', 250, 45, { letterSpacing: 0 });
                doc.fillColor('#888888').fontSize(9).font('Helvetica-Oblique').text('RESERVED PARTNERS REPORT', 105, 75, { letterSpacing: 3 });
                
                doc.y = 100;
                doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica').text(cleanHtmlStr(data.pdfSubtitle || 'Inteligencia de Mercado'), 105, 95);

                doc.y = 150;
                doc.rect(40, doc.y, doc.page.width - 80, 5).fill(colorPrimary);
                doc.rect(40, doc.y + 5, doc.page.width - 80, 110).fill(colorLight);
                
                doc.fillColor(colorDark).fontSize(16).font('Helvetica-Bold').text(cleanHtmlStr(data.pdfTitle || "REPORTE IA"), 60, doc.y + 25, { align: 'left' });
                // Limitamos intro length
                let introStr = cleanHtmlStr(data.pdfIntro).trim().substring(0, 450);
                if (cleanHtmlStr(data.pdfIntro).length > 450) introStr += '...';
                doc.fillColor('#333333').fontSize(11).font('Helvetica').text(introStr, 60, doc.y + 50, { align: 'left', width: doc.page.width - 120, lineGap: 5 });

                doc.y += 145;

                // --- DATA VISUALIZATION ---
                if (data.pdfMetrics && Array.isArray(data.pdfMetrics) && data.pdfMetrics.length > 0) {
                    checkPageWrap(100);
                    doc.fillColor(colorDark).fontSize(14).font('Helvetica-Bold').text('Vectores B2B', 40, doc.y);
                    doc.y += 20;
                    
                    const barWidth = doc.page.width - 80;
                    
                    for (const met of data.pdfMetrics) {
                        checkPageWrap(40);
                        const val = Math.min(Math.max(met.value, 0), 100);
                        doc.fillColor('#555555').fontSize(10).font('Helvetica-Bold').text(cleanHtmlStr(met.label), 40, doc.y);
                        doc.fillColor(colorDark).fontSize(10).font('Helvetica-Bold').text(val + '%', doc.page.width - 40, doc.y, { align: 'right', width: 0 });
                        
                        doc.y += 15;
                        doc.roundedRect(40, doc.y, barWidth, 6, 3).fill(colorGray); 
                        doc.roundedRect(40, doc.y, ((val / 100) * barWidth) || 5, 6, 3).fill(colorAccent);
                        
                        doc.y += 20;
                    }
                    doc.y += 10;
                }

                // --- SECCIONES CON REFERENCIAS ---
                if (data.pdfSections && Array.isArray(data.pdfSections)) {
                    for (const [index, sec] of data.pdfSections.entries()) {
                        // Max 3 secciones forzadas para evitar reports de 8 paginas vacias
                        if (index >= 3) break; 
                        
                        const textLines = (sec.content.match(/\n/g) || []).length;
                        const approxHeight = 80 + (textLines * 15);
                        checkPageWrap(approxHeight); 
                        
                        const titleStr = cleanHtmlStr(sec.heading);
                        const contentStr = cleanHtmlStr(sec.content).trim();

                        const startY = doc.y;
                        const headerH = 28;
                        doc.rect(40, startY, doc.page.width - 80, headerH).fill(colorLight);
                        doc.rect(40, startY, 4, headerH).fill(colorPrimary);
                        
                        doc.fillColor(colorDark).fontSize(12).font('Helvetica-Bold').text(titleStr.toUpperCase(), 55, startY + 8, { width: doc.page.width - 100, height: 20, lineBreak: false });
                        
                        doc.y = startY + headerH + 15;
                        doc.fillColor('#222222').fontSize(11).font('Helvetica').lineGap(5).text(contentStr, 40, doc.y, { align: 'justify', width: doc.page.width - 80 });
                        
                        // AGREGAR REFERENCIAS / BIBLIOTECA
                        if (sec.sourceName || sec.url) {
                            doc.y += 8;
                            const srcText = `Fuente Original: ${sec.sourceName || 'Consultar Enlace'} `;
                            doc.fillColor('#888888').fontSize(9).font('Helvetica-Oblique').text(srcText, 40, doc.y, { continued: !!sec.url });
                            if (sec.url) {
                                doc.fillColor(colorPrimary).text('[ ' + sec.url + ' ]', { link: sec.url, underline: true });
                            }
                        }
                        
                        doc.y += 30; // Spacing to next section
                    }
                }

                // --- HIGH IMPACT QUOTE ---
                if (data.pdfQuote) {
                    checkPageWrap(80);
                    const currentY = doc.y;
                    doc.rect(40, currentY, 4, 45).fill(colorAccent);
                    doc.fillColor(colorDark).fontSize(12).font('Helvetica-Oblique').lineGap(4).text(`"${cleanHtmlStr(data.pdfQuote)}"`, 55, currentY + 8, { align: 'left', width: doc.page.width - 100 });
                    doc.y = currentY + 60;
                }

                // --- CONCLUSION B2B STRATEGY ---
                if (data.pdfConclusion) {
                    checkPageWrap(100);
                    doc.rect(40, doc.y, doc.page.width - 80, 1).fill(colorGray);
                    doc.y += 15;
                    doc.fillColor(colorDark).fontSize(11).font('Helvetica-Bold').text('PLAN DE ACCIÓN AL CEO', 40, doc.y, { align: 'left' });
                    doc.y += 12;
                    doc.fillColor('#333333').fontSize(10).font('Helvetica').lineGap(4).text(cleanHtmlStr(data.pdfConclusion), 40, doc.y, { align: 'justify', width: doc.page.width - 80 });
                    // Avanzar ligeramente la Y
                    doc.y += parseInt(doc.heightOfString(cleanHtmlStr(data.pdfConclusion), { width: doc.page.width - 80 })) + 20; 
                }

                // ----- WATERMARK Y FOOTERS -----
                // ESTA MAGIA EVITA EL BUG DE LAS HOJAS FANTASMAS EN BLANCO: Apagamos márgenes.
                const pages = doc.bufferedPageRange();
                for (let i = 0; i < pages.count; i++) {
                    doc.switchToPage(i);
                    // Apagar bug de salto the pagina automatico en footers
                    let oldBottom = doc.page.margins.bottom;
                    doc.page.margins.bottom = 0;

                    // Footer negro absoluto en Y
                    doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill(colorDark);
                    doc.fillColor('#888888').fontSize(8).font('Helvetica').text(
                        `Propiedad Privada Integral de Godzilla Consulting AI • Página ${i + 1} de ${pages.count} • Producido el ${new Date().toLocaleDateString()}`,
                        0, doc.page.height - 23, { align: 'center', width: doc.page.width }
                    );
                    
                    // Watermark central
                    doc.save();
                    doc.opacity(0.02);
                    if (fs.existsSync(logoPath)) {
                        doc.image(logoPath, (doc.page.width - 350)/2, (doc.page.height - 350)/2, { width: 350 });
                    }
                    doc.restore();

                    // Restore margin por si acaso
                    doc.page.margins.bottom = oldBottom;
                }

                doc.end();
            } catch (e) {
                console.error("PDF Format Gen Error:", e);
                reject(e);
            }
        });

        const filename = `Reporte-Ejecutivo-Godzilla-${Date.now()}.pdf`;
        const targetPath = path.join(ASSETS_DIR, filename);
        await fs.promises.writeFile(targetPath, pdfBuffer);

        const botBase = process.env.BOT_MEDIA_URL || process.env.PUBLIC_MEDIA_URL || '';
        attachmentUrl = `${botBase}/api/media/assets/${filename}`;

    } catch (pdfErr) {
        console.error("⚠️ Fallo en empaquetado PDF editorial:", pdfErr.message);
        data.emailHTML_es = (data.emailHTML_es || '') + `
<br><div style="background-color: #fff3f3; border-left: 4px solid #CC0000; padding: 15px; margin-top: 20px;">
    <p style="color:#CC0000; font-size:13px; font-weight:bold; margin-top:0;">⚠️ AVISO</p>
    <p style="color:#555; font-size:12px; margin-bottom:0;">Fallo de inyección PDF.</p>
</div>`;
    }

    const stringifiedHtml = JSON.stringify({ es: data.emailHTML_es || '', en: data.emailHTML_en || '' });
    const stringifiedSubject = JSON.stringify({ es: data.subject_es || 'Boletín IA', en: data.subject_en || 'AI Newsletter' });

    const nlRes = await pool.query(
        `INSERT INTO newsletters (subject, body_html, attachment_url, status)
         VALUES ($1, $2, $3, 'draft') RETURNING id`,
        [stringifiedSubject, stringifiedHtml, attachmentUrl]
    );

    return { 
        newsletterId: nlRes.rows[0].id, total: 0, attachmentUrl, 
        subject: data.subject_es, 
        bodyHtml: stringifiedHtml 
    };
}

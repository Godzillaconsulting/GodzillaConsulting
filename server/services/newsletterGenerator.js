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

export async function generateAndSendAutoNewsletter(feedback = null) {
    console.log("🤖 Iniciando Auto-Generador Bi-Fásico de Godzilla (Diseño Editorial + Gráficas)...");
    
    const genAI = getClient();
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: "Eres Godzilla AI, investigador corporativo premium. Para reportes formales (PDFs), te enfocas en dar cifras de métricas clave (0 a 100) y separar la información analíticamente.",
        tools: [
            { googleSearch: {} }
        ]
    });

    let fdbkStr = feedback ? `\n[ATENCIÓN ORDEN DEL CEO: Corrige el borrador anterior aplicando esto: "${feedback}"]\n` : '';

    const prompt = `Crea el boletín de inteligencia global de IA del día de HOY.${fdbkStr}
TAREA CRÍTICA: Debes navegar a Internet AHORA MISMO y buscar noticias del día.

MISIÓN A (Email "Skimmable"): Puros Bullet Points cortos y rápidos. NO DEBES incluir el enlace de descarga dentro del HTML. Crea dos campos: "emailHTML_es" (Español) y "emailHTML_en" (Inglés).
MISIÓN B (PDF "Socios"): La investigación formal. Dame 2 métricas numéricas B2B de 0 a 100 con su respectivo 'label' que destaquen el asunto hoy (ej. crecimiento, adopción, riesgo).

DEVUELVE ÚNICAMENTE UN STRING JSON VÁLIDO PURAMENTE (sin markdown \`\`\`json) CON ESTA ESTRUCTURA:
{
    "subject_es": "Asunto en ES (con emoji)",
    "subject_en": "Asunto en EN (con emoji)",
    "emailHTML_es": "<h2>Lo que debes saber hoy en IA</h2><ul><li><strong>Empresa: </strong>1 oración.</li></ul>",
    "emailHTML_en": "<h2>What you need to know today in AI</h2><ul><li><strong>Company: </strong>1 sentence.</li></ul>",
    "pdfTitle": "GACETA GODZILLA AI",
    "pdfSubtitle": "Inteligencia Ejecutiva Diaria",
    "pdfIntro": "Párrafo introductorio de alto nivel.",
    "pdfMetrics": [
        { "label": "Nivel de Adopción de Mercado (%)", "value": 85 },
        { "label": "Impacto a Costos B2B (%)", "value": 40 }
    ],
    "pdfSections": [
        { "heading": "Subtítulo Noticia", "content": "Detalles." }
    ],
    "pdfQuote": "Insight de supervivencia tecnológica.",
    "pdfConclusion": "Conclusión orientada al ROI."
}`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/i, '').replace(/```/i, '').trim();
    const data = JSON.parse(text);

    console.log("✅ Contenido IA Generado. Construyendo PDF Premium Vectorial...");

    let pdfBuffer = null;
    let attachmentUrl = null;

    try {
        pdfBuffer = await new Promise((resolve, reject) => {
            try {
                // Buffer creation con márgenes muy controlados para evitar pages vacías
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

                const colorPrimary = '#CC0000'; // Rojo Godzilla
                const colorDark = '#1A1A1A';    // Fondo oscuro paneles
                const colorLight = '#F8F9FA';   // Fondo cards
                const colorGray = '#E9ECEF';    // Lineas graficas
                const colorAccent = '#F5A623';  // Complementario (Naranja/Dorado para metrics)
                
                // Función auxiliar para dibujar Rectángulo con bordes curvos aproximados
                const drawPanel = (x, y, w, h, bgStr, borderColor = null) => {
                    doc.save();
                    doc.roundedRect(x, y, w, h, 6).fill(bgStr);
                    if(borderColor) {
                         doc.roundedRect(x, y, w, h, 6).lineWidth(1).stroke(borderColor);
                    }
                    doc.restore();
                };

                // ---- PORTADA EDITORIAL PREMIUM ----
                // Background top decorativo
                doc.rect(0, 0, doc.page.width, 140).fill(colorDark);
                
                if (fs.existsSync(logoPath)) {
                    doc.image(logoPath, 40, 40, { width: 50 });
                }
                
                // Textos sobre el Header oscuro
                doc.fillColor('#FFFFFF').fontSize(28).font('Helvetica-Bold').text('GODZILLA', 105, 45, { letterSpacing: 1 });
                doc.fillColor(colorPrimary).fontSize(28).font('Helvetica-Bold').text('CONSULTING', 260, 45, { letterSpacing: 0 });
                doc.fillColor('#AAAAAA').fontSize(10).font('Helvetica-Bold').text('CORPORATE INTELLIGENCE REPORT', 105, 75, { letterSpacing: 2 });
                
                // Título y Fecha
                doc.y = 100;
                doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Oblique').text(data.pdfSubtitle || 'Inteligencia Ejecutiva Diaria', 105, 100);

                // --- CAJA DE INTRODUCCIÓN ---
                doc.y = 170;
                drawPanel(40, doc.y, doc.page.width - 80, 80, colorLight, colorGray);
                doc.fillColor(colorDark).fontSize(16).font('Helvetica-Bold').text(data.pdfTitle || "REPORTE IA", 60, doc.y + 15, { align: 'left' });
                doc.fillColor('#444444').fontSize(11).font('Helvetica').text(data.pdfIntro || '', 60, doc.y + 35, { align: 'left', width: doc.page.width - 120, lineGap: 3 });

                doc.y += 100;

                // --- GRÁFICAS DE MÉTRICAS VISUALES ---
                if (data.pdfMetrics && Array.isArray(data.pdfMetrics) && data.pdfMetrics.length > 0) {
                    doc.fillColor(colorDark).fontSize(14).font('Helvetica-Bold').text('Métricas Clave del Día', 40, doc.y);
                    doc.y += 15;
                    
                    const barWidth = doc.page.width - 200;
                    
                    for (const met of data.pdfMetrics) {
                        const val = Math.min(Math.max(met.value, 0), 100); // 0-100 segurizado
                        doc.fillColor('#555555').fontSize(10).font('Helvetica-Bold').text(met.label, 40, doc.y);
                        doc.fillColor(colorDark).fontSize(10).font('Helvetica-Bold').text(val + '%', doc.page.width - 145, doc.y, { align: 'right', width: 100 });
                        
                        doc.y += 15;
                        doc.roundedRect(40, doc.y, barWidth, 8, 4).fill(colorGray); // barra base
                        doc.roundedRect(40, doc.y, (val / 100) * barWidth, 8, 4).fill(colorAccent); // progreso
                        
                        doc.y += 25;
                    }
                    doc.y += 10;
                }

                // --- SECCIONES PRINCIPALES (CARDS EDITORIALES) ---
                if (data.pdfSections && Array.isArray(data.pdfSections)) {
                    for (const sec of data.pdfSections) {
                        // Verificamos si cabe en la página, sino saltamos nosotros manually controlando flujos.
                        if (doc.y > doc.page.height - 180) { doc.addPage(); doc.y = 40; }
                        
                        doc.x = 40;
                        doc.fillColor(colorPrimary).fontSize(13).font('Helvetica-Bold').text(sec.heading.toUpperCase(), { align: 'left' });
                        doc.y += 5;
                        
                        // Linea sutil
                        doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).lineWidth(1).stroke(colorGray);
                        doc.y += 10;
                        
                        doc.fillColor('#333333').fontSize(11).font('Helvetica').lineGap(4).text(sec.content, { align: 'justify', width: doc.page.width - 80 });
                        doc.y += 25;
                    }
                }

                // --- HIGH IMPACT QUOTE ---
                if (data.pdfQuote) {
                    if (doc.y > doc.page.height - 150) { doc.addPage(); doc.y = 40; }
                    const currentY = doc.y;
                    const quoteHeight = 60;
                    drawPanel(40, currentY, doc.page.width - 80, quoteHeight, colorDark);
                    doc.rect(40, currentY, 6, quoteHeight).fill(colorPrimary);
                    
                    doc.fillColor('#FFFFFF').fontSize(13).font('Helvetica-Oblique').text(data.pdfQuote, 65, currentY + 15, { align: 'left', lineGap: 4, width: doc.page.width - 130 });
                    doc.y = currentY + quoteHeight + 30;
                }

                // --- CONCLUSION B2B ---
                if (data.pdfConclusion) {
                    if (doc.y > doc.page.height - 100) { doc.addPage(); doc.y = 40; }
                    drawPanel(40, doc.y, doc.page.width - 80, 70, colorLight);
                    doc.fillColor(colorDark).fontSize(12).font('Helvetica-Bold').text('DIRECTIVA ESTRATÉGICA AL CEO', 60, doc.y + 15, { align: 'left' });
                    doc.fillColor('#444444').fontSize(10).font('Helvetica').lineGap(2).text(data.pdfConclusion, 60, doc.y + 30, { align: 'left', width: doc.page.width - 120 });
                }

                // ----- WATERMARK EN TODAS LAS PAGINAS AL FINAL PARA NO AFECTAR Y -----
                const pages = doc.bufferedPageRange();
                for (let i = 0; i < pages.count; i++) {
                    doc.switchToPage(i);
                    // Footer
                    doc.rect(0, doc.page.height - 35, doc.page.width, 35).fill(colorDark);
                    doc.fillColor('#AAAAAA').fontSize(8).font('Helvetica').text(
                        \`Propiedad Privada Integral de Godzilla Consulting AI • Página \${i + 1} de \${pages.count} • \${new Date().toLocaleDateString()}\`,
                        0, doc.page.height - 23, { align: 'center', width: doc.page.width }
                    );
                    
                    // Watermark central
                    doc.save();
                    doc.opacity(0.03);
                    if (fs.existsSync(logoPath)) {
                        doc.image(logoPath, (doc.page.width - 400)/2, (doc.page.height - 400)/2, { width: 400 });
                    }
                    doc.restore();
                }

                // Finalizar el stream limpio, sin moveDowns adicionales y vacíos.
                doc.end();
            } catch (e) {
                console.error("PDF Format Gen Error:", e);
                reject(e);
            }
        });

        console.log("✅ PDF Finalizado y blindado editorialmente. Subiendo...");

        const filename = \`Reporte-Ejecutivo-Godzilla-\${Date.now()}.pdf\`;
        const targetPath = path.join(ASSETS_DIR, filename);
        await fs.promises.writeFile(targetPath, pdfBuffer);

        const botBase = process.env.BOT_MEDIA_URL || process.env.PUBLIC_MEDIA_URL || '';
        attachmentUrl = \`\${botBase}/api/media/assets/\${filename}\`;

    } catch (pdfErr) {
        console.error("⚠️ Fallo en empaquetado PDF editorial:", pdfErr.message);
        data.emailHTML_es = (data.emailHTML_es || '') + \`
<br><div style="background-color: #fff3f3; border-left: 4px solid #CC0000; padding: 15px; margin-top: 20px;">
    <p style="color:#CC0000; font-size:13px; font-weight:bold; margin-top:0;">⚠️ AVISO</p>
    <p style="color:#555; font-size:12px; margin-bottom:0;">Fallo de inyección PDF. Contacta al equipo.</p>
</div>\`;
    }

    // 4. CREACIÓN DEL BORRADOR EN DB
    const stringifiedHtml = JSON.stringify({ es: data.emailHTML_es || '', en: data.emailHTML_en || '' });
    const stringifiedSubject = JSON.stringify({ es: data.subject_es || 'Boletín IA', en: data.subject_en || 'AI Newsletter' });

    const nlRes = await pool.query(
        \`INSERT INTO newsletters (subject, body_html, attachment_url, status)
         VALUES ($1, $2, $3, 'draft') RETURNING id\`,
        [stringifiedSubject, stringifiedHtml, attachmentUrl]
    );
    const newsletterId = nlRes.rows[0].id;

    console.log(\`🎉 Borrador Bilingüe/Editorial [ID: \${newsletterId}] ensamblado.\`);

    return { 
        newsletterId, total: 0, attachmentUrl, 
        subject: data.subject_es, 
        bodyHtml: stringifiedHtml 
    };
}

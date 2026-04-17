import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cleanHtmlStr = (str) => {
    if (!str) return '';
    return str.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' '); 
};

export async function buildPremiumPDF(data, lang = 'es') {
    // SCraping pre-render. Buscamos de la noticia 1 (Principal) la imagen OG
    let coverImgBuf = null;
    if (data.pdfSections && data.pdfSections[0] && data.pdfSections[0].url) {
        try {
            const { scrapeOgImage } = await import('./ogScraper.js');
            coverImgBuf = await scrapeOgImage(data.pdfSections[0].url);
        } catch(e) {}
    }

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ 
                margins: { top: 40, bottom: 85, left: 40, right: 40 },
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
                if (doc.y + requiredHeight > doc.page.height - 85) {
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
            doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica').text(cleanHtmlStr(data.pdfSubtitle || 'Inteligencia Ejecutiva'), 105, 95);

            doc.y = 150;
            
            // TITULAR PRINCIPAL
            doc.rect(40, doc.y, doc.page.width - 80, 5).fill(colorPrimary);
            
            // FOTOGRAFIA OG SCRAPER HD
            if (coverImgBuf) {
                doc.y += 5;
                const imgWidth = doc.page.width - 80;
                const imgHeight = 150; // Crop forzado elegante
                doc.save();
                doc.rect(40, doc.y, imgWidth, imgHeight).clip();
                try {
                    doc.image(coverImgBuf, 40, doc.y, { fit: [imgWidth, imgHeight + 100], align: 'center', valign: 'center' });
                } catch(e) { doc.rect(40, doc.y, imgWidth, imgHeight).fill('#222'); }
                doc.restore();
                doc.y += imgHeight;
            } else {
                doc.rect(40, doc.y + 5, doc.page.width - 80, 30).fill(colorLight);
                doc.y += 35;
            }

            doc.y += 15;
            doc.fillColor(colorDark).fontSize(16).font('Helvetica-Bold').text(cleanHtmlStr(data.pdfTitle || "REPORTE IA"), 40, doc.y, { align: 'left' });
            
            doc.y += 10;
            let introStr = cleanHtmlStr(data.pdfIntro || '').trim().substring(0, 450);
            if (cleanHtmlStr(data.pdfIntro || '').length > 450) introStr += '...';
            doc.fillColor('#333333').fontSize(11).font('Helvetica').text(introStr, 40, doc.y, { align: 'left', width: doc.page.width - 80, lineGap: 5 });

            doc.y += 25;

            // --- DATA VISUALIZATION (GEOMETRÍA PIE) ---
            if (data.pdfChart && data.pdfChart.data) {
                checkPageWrap(160);
                doc.fillColor(colorDark).fontSize(14).font('Helvetica-Bold').text(cleanHtmlStr(data.pdfChart.title || 'Market Topology'), 40, doc.y);
                doc.y += 20;

                const cx = 110;
                const cy = doc.y + 50;
                const radius = 45;
                
                const pieData = data.pdfChart.data;
                const total = pieData.reduce((acc, curr) => acc + (curr.value || 0), 0) || 100;
                
                const palette = [colorPrimary, colorDark, colorAccent, '#555555'];
                let currentAngle = -90 * (Math.PI / 180); // Empezar arriba (12 O clock)

                pieData.forEach((slice, idx) => {
                    const sliceAngle = ((slice.value || 0) / total) * 2 * Math.PI;
                    const endAngle = currentAngle + sliceAngle;
                    
                    doc.save()
                       .moveTo(cx, cy)
                       .lineTo(cx + radius * Math.cos(currentAngle), cy + radius * Math.sin(currentAngle))
                       .arc(cx, cy, radius, currentAngle, endAngle)
                       .lineTo(cx, cy)
                       .fill(palette[idx % palette.length])
                       .restore();
                    
                    // Legenda
                    const legY = doc.y + (idx * 20);
                    doc.rect(180, legY, 12, 12).fill(palette[idx % palette.length]);
                    doc.fillColor('#333').fontSize(10).font('Helvetica-Bold').text(`${slice.value}%`, 200, legY + 1);
                    doc.fillColor('#666').fontSize(9).font('Helvetica').text(cleanHtmlStr(slice.label), 235, legY + 2);

                    currentAngle = endAngle;
                });
                
                doc.y += 120; // Espaciado despues del pie
            }

            // --- DATA VISUALIZATION BARS ---
            if (data.pdfMetrics && Array.isArray(data.pdfMetrics) && data.pdfMetrics.length > 0) {
                checkPageWrap(100);
                doc.fillColor(colorDark).fontSize(14).font('Helvetica-Bold').text(lang === 'es' ? 'Vectores B2B' : 'B2B Vectors', 40, doc.y);
                doc.y += 20;
                
                const barWidth = doc.page.width - 80;
                
                for (const met of data.pdfMetrics) {
                    checkPageWrap(40);
                    const val = Math.min(Math.max(met.value || 0, 0), 100);
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
                    
                    if (sec.sourceName || sec.url) {
                        doc.y += 8;
                        const refLab = lang === 'es' ? 'Fuente Original: ' : 'Original Source: ';
                        const srcText = `${refLab}${sec.sourceName || ''} `;
                        doc.fillColor('#888888').fontSize(9).font('Helvetica-Oblique').text(srcText, 40, doc.y, { continued: !!sec.url });
                        if (sec.url) {
                            doc.fillColor(colorPrimary).text('[ ' + sec.url + ' ]', { link: sec.url, underline: true });
                        }
                    }
                    
                    doc.y += 30;
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
                doc.fillColor(colorDark).fontSize(11).font('Helvetica-Bold').text(lang === 'es' ? 'PLAN DE ACCIÓN AL CEO' : 'EXECUTIVE ACTION PLAN', 40, doc.y, { align: 'left' });
                doc.y += 12;
                doc.fillColor('#333333').fontSize(10).font('Helvetica').lineGap(4).text(cleanHtmlStr(data.pdfConclusion), 40, doc.y, { align: 'justify', width: doc.page.width - 80 });
            }

            // ----- WATERMARK Y FOOTERS -----
            const pages = doc.bufferedPageRange();
            for (let i = 0; i < pages.count; i++) {
                doc.switchToPage(i);
                let oldBottom = doc.page.margins.bottom;
                doc.page.margins.bottom = 0;

                doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill(colorDark);
                
                const ftrPag = lang === 'es' ? 'Página' : 'Page';
                const ftrProd = lang === 'es' ? 'Producido el' : 'Produced on';
                
                doc.fillColor('#888888').fontSize(8).font('Helvetica').text(
                    `Propiedad Privada Integral de Godzilla Consulting AI • ${ftrPag} ${i + 1} / ${pages.count} • ${ftrProd} ${new Date().toLocaleDateString()}`,
                    0, doc.page.height - 23, { align: 'center', width: doc.page.width }
                );
                
                doc.save();
                doc.opacity(0.02);
                if (fs.existsSync(logoPath)) {
                    doc.image(logoPath, (doc.page.width - 350)/2, (doc.page.height - 350)/2, { width: 350 });
                }
                doc.restore();
                doc.page.margins.bottom = oldBottom;
            }

            doc.end();
        } catch (e) {
            console.error("PDF Format Gen Error:", e);
            reject(e);
        }
    });
}

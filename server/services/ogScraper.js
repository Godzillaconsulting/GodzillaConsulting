import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

/**
 * Escanea la URl periodística en tiempo real en busca de su Fotografía de Portada Oficial
 * para incrustación vectorial en el Reporte PDF, mitigando costos de generación IA AI.
 * Resiliente a timeouts y bloqueos.
 */
export async function scrapeOgImage(url) {
    if (!url) return null;
    try {
        console.log(`[OG-Scraper] Hackeando Metadata visual de: ${url}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500); // Max 3.5s wait

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html'
            }
        });
        
        if (!response.ok) return null;
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        let ogImageUrl = $('meta[property="og:image"]').attr('content');
        if (!ogImageUrl) ogImageUrl = $('meta[name="twitter:image"]').attr('content');
        
        if (ogImageUrl) {
            // Descargar como Buffer para PDFKit puro (CON TIMEOUT PARA EVITAR HANG INFINITO)
            const imgRes = await fetch(ogImageUrl, { signal: controller.signal });
            if(imgRes.ok) {
               const arrayBuffer = await imgRes.arrayBuffer();
               clearTimeout(timeoutId);
               return Buffer.from(arrayBuffer);
            }
        }
        clearTimeout(timeoutId);
        return null;

    } catch (e) {
        console.error(`[OG-Scraper] Fallo interceptando URL: ${e.message}`);
        return null;
    }
}

export async function extractOgImageUrl(url) {
    if (!url) return null;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' } });
        
        if (!response.ok) return null;
        
        const html = await response.text();
        const $ = cheerio.load(html);
        let ogImageUrl = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');
        clearTimeout(timeoutId);
        return ogImageUrl || null;
    } catch (e) { return null; }
}

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function testHybridScraper() {
    console.log('🚀 Probando Scraper Híbrido (Google RSS + DuckDuckGo Web Search)...');
    
    const feeds = [
        { url: 'https://news.google.com/rss/search?q=(OpenAI+OR+Anthropic+OR+Nvidia+OR+Gemini)+when:2d&hl=en-US&gl=US&ceid=US:en', cat: 'HARDWARE & MODELOS' },
        { url: 'https://news.google.com/rss/search?q=(cybersecurity+OR+hack+OR+malware)+AI+when:2d&hl=en-US&gl=US&ceid=US:en', cat: 'CIBERSEGURIDAD' }
    ];

    let fullDigest = '';
    let total = 0;

    for (const f of feeds) {
        try {
            const res = await fetch(f.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) });
            if (res.ok) {
                const xml = await res.text();
                const matches = [...xml.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<description>(.*?)<\/description>/g)];
                let items = [];
                for (const m of matches) {
                    let t = m[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '').trim();
                    if (t.length > 10) items.push(t);
                    if (items.length >= 2) break;
                }
                fullDigest += `\n--- RSS ${f.cat} ---\n• ` + items.join('\n• ');
                total += items.length;
            }
        } catch(e) {}
    }

    try {
        const searchUrl = 'https://html.duckduckgo.com/html/?q=OpenAI+Anthropic+Nvidia+AI+news';
        const res = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) });
        if (res.ok) {
            const html = await res.text();
            const $ = cheerio.load(html);
            const snippets = [];
            $('.result__snippet').each((i, elem) => {
                const txt = $(elem).text().trim();
                if (txt && snippets.length < 3) snippets.push(txt);
            });
            fullDigest += '\n--- DUCKDUCKGO WEB SEARCH ---\n• ' + snippets.join('\n• ');
            total += snippets.length;
        }
    } catch(e) {}

    console.log('✅ TOTAL HECHOS RECOLECTADOS:', total);
    console.log('--- PREVIEW DE CONTEXTO ---');
    console.log(fullDigest.substring(0, 600));
    process.exit(0);
}
testHybridScraper();

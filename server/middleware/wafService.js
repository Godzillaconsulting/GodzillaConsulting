import express from 'express';

// Memoria de ataques (Ring Buffer para no saturar memoria RAM, max 200)
const MAX_LOGS = 200;
let wafLogs = [];
let totalAttacksBlocked = 0;
let blockedIPs = new Map(); // IP -> { expiration, count }

const MAX_IP_BLOCK_TIME = 15 * 60 * 1000; // 15 minutos en ms

const sqlInjectionPatterns = [
    /(UNION\s+SELECT|UNION\s+ALL\s+SELECT)/i,
    /(DROP\s+TABLE|DROP\s+DATABASE)/i,
    /(\bOR\b\s+1\s*=\s*1|\bOR\b\s+'1'\s*=\s*'1')/i,
    /(INSERT\s+INTO\s+.*\s+VALUES)/i,
    /(UPDATE\s+.*\s+SET)/i,
    /(--|\/\*|\*\/)/, // Comentarios SQL
];
const xssPatterns = [
    /(<script\b|javascript:|onerror\s*=|onload\s*=)/i,
    /(<iframe\b|<object\b|<embed\b)/i
];

const rceLfiPatterns = [
    /(\.\.\/|\.\.\\)/, // Path Traversal (LFI/RFI)
    /(etc\/passwd|windows\\system32|boot\.ini)/i,
    /(;\s*ls\b|;\s*cat\b|;\s*wget\b|;\s*curl\b|\|\s*bash)/i,
    /(\$cfg\[|\$GLOBALS\[|\$_GET\[|\$_POST\[)/i
];

const noSqlPatterns = [
    /(\$where|\$ne|\$gt|\$lt|\$gte|\$lte|\$regex|\$exists)/i,
    /(__proto__|constructor\.prototype)/i
];

// Bot comunes de IA y Web Scrapers rudimentarios
const aiBotPatterns = [
    /curl\/|wget\//i,
    /python-requests|aiohttp/i,
    /openai|chatgpt|anthropic|claude/i,
    /puppeteer|playwright|selenium|headlesschrome/i,
    /scrapy|spider|crawler|anthropic|claude|openai|chatgpt/i
];

// Prevención de Memory Leak: Limpiamos las IPs expiradas cada 10 minutos
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of blockedIPs.entries()) {
        if (now > data.expiration) {
            blockedIPs.delete(ip);
        }
    }
}, 10 * 60 * 1000);

export const wafMiddleware = (req, res, next) => {
    const now = Date.now();
    
    // Obtener IP real detrás de Cloudflare/Vercel
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || 'Unknown IP';
    
    // 1. Whitelist local / loopback / private IPs
    const isLocal = ip === '127.0.0.1' || 
                    ip === '::1' || 
                    ip === '::ffff:127.0.0.1' || 
                    ip === 'localhost' || 
                    ip.startsWith('10.') || 
                    ip.startsWith('192.168.') || 
                    ip.startsWith('172.16.') || 
                    ip.startsWith('172.17.') ||
                    ip.startsWith('172.18.') ||
                    ip.startsWith('172.19.') ||
                    ip.startsWith('172.2') ||
                    ip.startsWith('172.3') ||
                    ip.startsWith('::ffff:192.168.') ||
                    ip.startsWith('::ffff:10.') ||
                    ip.startsWith('::ffff:172.');
                    
    if (isLocal) {
        return next();
    }

    // 2. Whitelist Vercel Proxy with correct secret
    const PROXY_SECRET = process.env.PROXY_SECRET || 'Zilla-5uper-S3cr3t-2026';
    if (req.headers['x-vercel-proxy'] === '1' && req.headers['x-vercel-proxy-secret'] === PROXY_SECRET) {
        return next();
    }

    // 3. Whitelist requests for outputs and static media
    if (req.path.includes('/outputs/') || req.path.includes('/media/')) {
        return next();
    }

    // Si la IP está en la cárcel, bloquear directamente
    if (blockedIPs.has(ip)) {
        const banData = blockedIPs.get(ip);
        if (now < banData.expiration) {
            return res.status(403).json({ error: '🚨 IP Bloqueada temporalmente por Godzilla WAF.' });
        } else {
            blockedIPs.delete(ip);
        }
    }

    // Declarar variables ANTES de usarlas
    let riskLevel = null;
    let categoryName = null;
    let decodedUrl = '';

    try {
        decodedUrl = decodeURIComponent(req.originalUrl || '');
    } catch (e) {
        // Si arroja URIError (payload "%C0%AF" malformado), es automáticamente un ataque.
        decodedUrl = req.originalUrl;
        riskLevel = 'Crítico';
        categoryName = 'URL Malformada (Evasión)';
    }

    const safeUserAgent = req.headers['user-agent'] || '';

    const inputString = [
        decodedUrl,
        JSON.stringify(req.body || {}),
        safeUserAgent
    ].join(' | ');

    // A. Detección de Bots de IA y Scrapers
    if (!riskLevel && aiBotPatterns.some(regex => regex.test(safeUserAgent))) {
        // Excluir scrapers legítimos y nuestro propio proxy de Vercel
        if (!/facebookexternalhit|twitterbot|linkedinbot|googlebot/i.test(safeUserAgent) && req.headers['x-vercel-proxy'] !== '1') {
            riskLevel = 'Alto';
            categoryName = 'AI/Scraping Bot';
        }
    }

    // B. Detección de XSS
    if (!riskLevel && xssPatterns.some(regex => regex.test(inputString))) {
        riskLevel = 'Crítico';
        categoryName = 'XSS (Cross-Site Scripting)';
    }

    // C. Detección de SQL Injection y NoSQLi
    if (!riskLevel && (sqlInjectionPatterns.some(regex => regex.test(inputString)) || noSqlPatterns.some(regex => regex.test(inputString)))) {
        riskLevel = 'Crítico';
        categoryName = 'Inj. SQL / NoSQL / Prototype Pollution';
    }

    // D. Detección de RCE / Path Traversal
    if (!riskLevel && rceLfiPatterns.some(regex => regex.test(inputString))) {
        riskLevel = 'Crítico';
        categoryName = 'RCE / Path Traversal (Intento de Hackeo Profundo)';
    }

    // Si detectamos riesgo, registrar y bloquear la petición
    if (riskLevel) {
        blockedIPs.set(ip, { expiration: now + MAX_IP_BLOCK_TIME, count: (blockedIPs.get(ip)?.count || 0) + 1 });
        totalAttacksBlocked++;

        const payloadPreview = inputString.length > 50 ? inputString.substring(0, 50) + '...' : inputString;

        wafLogs.unshift({
            id: now,
            ip: ip,
            query: `[${categoryName}] ${payloadPreview}`,
            risk: riskLevel
        });

        if (wafLogs.length > MAX_LOGS) {
            wafLogs.pop();
        }

        console.warn(`[WAF] Ataque interceptado desde ${ip}. Razón: ${categoryName}`);
        
        return res.status(403).json({ error: `🚨 Acceso Denegado por Godzilla WAF. Detección: ${categoryName}` });
    }

    next();
};

export const getWafStats = () => {
    const recentBlocks = wafLogs.filter(log => (Date.now() - log.id) < 60000).length;
    const firewallLoad = Math.min(100, Math.floor((recentBlocks / 50) * 100) + 5);

    return {
        logs: wafLogs.slice(0, 50),
        stats: {
            total24h: totalAttacksBlocked,
            ipsBlocked: blockedIPs.size,
            firewallLoad: firewallLoad
        }
    };
};

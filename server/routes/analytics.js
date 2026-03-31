import express from 'express';
import pool from '../config/db.js';
import { requireAdmin } from '../middlewares/adminAuth.js';

const router = express.Router();

/**
 * POST /api/analytics/track
 * Registra o actualiza una visita de página.
 */
router.post('/track', async (req, res) => {
    const { session_id, url, utm_source, utm_medium, utm_campaign, duration_seconds } = req.body;
    if (!session_id || !url) return res.status(400).json({ error: 'Missing params' });

    try {
        // Upsert by session_id + url to just update duration if it exists? 
        // For simplicity, let's just insert every time they send a track event if it's new, 
        // or we just rely on standard insert.
        await pool.query(
            `INSERT INTO page_views (session_id, url, utm_source, utm_medium, utm_campaign, duration_seconds) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [session_id, url, utm_source, utm_medium, utm_campaign, duration_seconds || 0]
        );
        res.json({ success: true });
    } catch (e) {
        console.error('Error tracking page view', e.message);
        res.status(500).json({ error: 'DB_ERROR' });
    }
});

/**
 * POST /api/analytics/video
 * Mide la retención de los videos.
 */
router.post('/video', async (req, res) => {
    const { session_id, video_id, percentage, drop_off_second } = req.body;
    if (!session_id || !video_id) return res.status(400).json({ error: 'Missing params' });

    try {
        const existing = await pool.query(
            `SELECT id, max_percentage_watched FROM video_retention WHERE session_id = $1 AND video_id = $2`,
            [session_id, video_id]
        );

        if (existing.rows.length > 0) {
            const record = existing.rows[0];
            // Solo actualizamos si llegaron más lejos en el video
            if (percentage > record.max_percentage_watched) {
                await pool.query(
                    `UPDATE video_retention SET max_percentage_watched = $1, drop_off_second = $2, updated_at = NOW() WHERE id = $3`,
                    [percentage, drop_off_second, record.id]
                );
            }
        } else {
            await pool.query(
                `INSERT INTO video_retention (session_id, video_id, max_percentage_watched, drop_off_second) VALUES ($1, $2, $3, $4)`,
                [session_id, video_id, percentage, drop_off_second]
            );
        }
        res.json({ success: true });
    } catch (e) {
        console.error('Error tracking video', e.message);
        res.status(500).json({ error: 'DB_ERROR' });
    }
});

/**
 * POST /api/analytics/event
 * Registra eventos dinámicos web (Pixel custom events)
 */
router.post('/event', async (req, res) => {
    const { session_id, event_name, event_data } = req.body;
    if (!event_name) return res.status(400).json({ error: 'Missing event_name' });

    try {
        await pool.query(
            `INSERT INTO pixel_events (session_id, event_name, event_data) VALUES ($1, $2, $3)`,
            [session_id || 'anonymous', event_name, event_data ? JSON.stringify(event_data) : null]
        );
        res.json({ success: true });
    } catch (e) {
        console.error('Error tracking event', e.message);
        res.status(500).json({ error: 'DB_ERROR' });
    }
});

/**
 * GET /api/analytics/dashboard
 * Retorna los datos agregados para el dashboard maestro.
 */
router.get('/dashboard', requireAdmin, async (req, res) => {
    try {
        // 1. Visitantes reales desde page_views agrupados por utm_source
        const pageViewsResult = await pool.query(`
            SELECT 
                COALESCE(utm_source, 'organic') as source, 
                COUNT(DISTINCT session_id) as visitors 
            FROM page_views 
            GROUP BY COALESCE(utm_source, 'organic')
        `);
        
        const visitorsMap = {};
        let totalVisitors = 0;
        pageViewsResult.rows.forEach(r => {
            const val = parseInt(r.visitors, 10);
            visitorsMap[r.source.toLowerCase()] = val;
            totalVisitors += val;
        });

        // 2. Leads globales
        const leadsResult = await pool.query(`SELECT COUNT(*) as total FROM users`);
        const totalLeads = parseInt(leadsResult.rows[0].total, 10);

        // 3. Citas globales
        const callsResult = await pool.query(`SELECT COUNT(*) as total FROM citas`);
        const totalCalls = parseInt(callsResult.rows[0].total, 10);

        // 4. Custom Events del Pixel
        let pixelEventCounts = {
            totalInteractions: 0,
            events: []
        };
        try {
            const eventsRes = await pool.query(`
                SELECT event_name, COUNT(*) as cc 
                FROM pixel_events 
                GROUP BY event_name 
                ORDER BY cc DESC
            `);
            let total = 0;
            const eventDataList = eventsRes.rows.map(r => {
                const count = parseInt(r.cc, 10);
                total += count;
                return { name: r.event_name, count: count };
            });
            pixelEventCounts = { totalInteractions: total, events: eventDataList };
        } catch(e) { console.error('No se pudo leer pixel_events (tabla nueva o error)', e.message); }

        // 5. Historial Diario Web (Evolución)
        let webGraphData = [];
        try {
            const historyRes = await pool.query(`
                SELECT DATE(created_at) as date_val, COUNT(DISTINCT session_id) as views
                FROM page_views
                GROUP BY DATE(created_at)
                ORDER BY date_val ASC
            `);
            
            const eventsHistoryRes = await pool.query(`
                SELECT DATE(created_at) as date_val, COUNT(*) as interactions
                FROM pixel_events
                GROUP BY DATE(created_at)
            `);
            
            const historyMap = {};
            historyRes.rows.forEach(r => {
                const d = new Date(r.date_val).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', timeZone: 'UTC' });
                historyMap[d] = { date: d, views: parseInt(r.views), interactions: 0 };
            });
            
            eventsHistoryRes.rows.forEach(r => {
                const d = new Date(r.date_val).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', timeZone: 'UTC' });
                if (!historyMap[d]) historyMap[d] = { date: d, views: 0, interactions: 0 };
                historyMap[d].interactions += parseInt(r.interactions);
            });
            
            webGraphData = Object.values(historyMap);
        } catch(e) { console.warn('Error fetching web graph data', e.message); }

        // --- Traffic Sources (Datos Duros) ---
        // Como aún no tenemos UTMs anidados en la tabla users/citas, 
        // mostraremos las visitas reales por utm y 0 leads/llamadas atribuidas (hasta implementar UTM en captura)
        const trafficSources = [
          { id: 'ig', name: 'Instagram', emoji: '📸', visitors: visitorsMap['ig'] || visitorsMap['ig_reels'] || visitorsMap['instagram'] || '-', leads: '-', calls: '-', cac: '-', roi: '-' },
          { id: 'fb', name: 'Facebook', emoji: '📘', visitors: visitorsMap['fb'] || visitorsMap['fb_feed'] || visitorsMap['facebook'] || '-', leads: '-', calls: '-', cac: '-', roi: '-' },
          { id: 'messenger', name: 'Messenger', emoji: '💬', visitors: visitorsMap['messenger'] || '-', leads: '-', calls: '-', cac: '-', roi: '-' },
          { id: 'tiktok', name: 'TikTok', emoji: '🎵', visitors: visitorsMap['tiktok'] || visitorsMap['tiktok_org'] || '-', leads: '-', calls: '-', cac: '-', roi: '-' },
          { id: 'web', name: 'Sitio Web (Pixel)', emoji: '💻', visitors: totalVisitors > 0 ? totalVisitors : '-', leads: totalLeads > 0 ? totalLeads : '-', calls: pixelEventCounts.totalInteractions > 0 ? pixelEventCounts.totalInteractions : '-', cac: '-', roi: '-' }
        ];

        // --- Gráfica Web de Vistas y Clics Diarios ---
        // Agrupamos page_views por fecha y pixel_events por fecha para la gráfica de 7 días
        try {
            const webGraphResult = await pool.query(`
                SELECT 
                    TO_CHAR(DATE(created_at), 'DD-Mon') as date,
                    COUNT(id) as views 
                FROM page_views 
                WHERE created_at >= NOW() - INTERVAL '7 days'
                GROUP BY DATE(created_at)
                ORDER BY DATE(created_at) ASC
            `);
            
            const interactionsResult = await pool.query(`
                SELECT 
                    TO_CHAR(DATE(created_at), 'DD-Mon') as date,
                    COUNT(id) as interactions 
                FROM pixel_events 
                WHERE created_at >= NOW() - INTERVAL '7 days'
                GROUP BY DATE(created_at)
            `);

            // Fusionamos ambas fuentes en un solo array
            let webGraphMap = {};
            webGraphResult.rows.forEach(r => webGraphMap[r.date] = { date: r.date, views: parseInt(r.views, 10), interactions: 0 });
            interactionsResult.rows.forEach(r => {
                if (!webGraphMap[r.date]) webGraphMap[r.date] = { date: r.date, views: 0, interactions: 0 };
                webGraphMap[r.date].interactions = parseInt(r.interactions, 10);
            });

            webGraphData = Object.values(webGraphMap).sort((a,b) => new Date(a.date) - new Date(b.date));
        } catch(e) { console.warn('Error fetching web graph metrics:', e.message); }

        // --- Sankey Data Dinámico ---
        const metaTraffic = (visitorsMap['ig_reels'] || 0) + (visitorsMap['fb_feed'] || 0) + (visitorsMap['ig'] || 0) + (visitorsMap['fb'] || 0);
        const googleTraffic = visitorsMap['google_ads'] || visitorsMap['google'] || 0;
        const orgTraffic = (visitorsMap['tiktok_org'] || 0) + (visitorsMap['organic'] || 0) + (visitorsMap['tiktok'] || 0);
        
        // Calcular "Bounced" dinámicamente: Si hay X visitantes pero solo Y leads, los demás rebotaron
        const landingVisitors = totalVisitors > 0 ? totalVisitors : 1; // evitar /0
        const bountedCount = Math.max(0, totalVisitors - totalLeads);

        let sankeyData = [
          ["From", "To", "Weight"],
        ];
        // Solo agregar nodos si hay tráfico real (de lo contrario la UI falla)
        if (totalVisitors > 0) {
            if (metaTraffic > 0) sankeyData.push(["Meta Ads", "Landing Page", metaTraffic]);
            if (googleTraffic > 0) sankeyData.push(["Google Ads", "Landing Page", googleTraffic]);
            if (orgTraffic > 0) sankeyData.push(["Organic", "Landing Page", orgTraffic]);
            
            if (totalLeads > 0) sankeyData.push(["Landing Page", "Lead Form", totalLeads]);
            if (bountedCount > 0) sankeyData.push(["Landing Page", "Bounced", bountedCount]);
            
            if (totalCalls > 0) sankeyData.push(["Lead Form", "Booked Call", totalCalls]);
            if (totalLeads > totalCalls) sankeyData.push(["Lead Form", "No Action", totalLeads - totalCalls]);
        } else {
            // Estado inicial vacío elegante
            sankeyData.push(["A la espera de tráfico", "Landing Page", 1]);
        }

        // --- ROI Dinámico ---
        // Al no tener API de facturación, pasamos vacío / base cero para que empiece de cero.
        const roiData = [
            { name: 'Hoy', spend: 0, revenue: 0, cac: 0 },
        ];

        res.json({
            success: true,
            trafficSources,
            sankeyData,
            roiData,
            webGraphData,
            pixelEvents: pixelEventCounts.events, // Export this to front so dashboard accesses it
            webGraphData,
            kpis: {
                totalSpend: '-',
                totalRevenue: '-',
                globalROI: '-',
                avgCac: '-'
            }
        });
    } catch (e) {
        console.error('Error fetching dashboard', e);
        res.status(500).json({ error: 'DB_ERROR' });
    }
});

export default router;

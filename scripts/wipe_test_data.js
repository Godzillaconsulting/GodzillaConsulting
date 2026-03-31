import pool from '../server/config/db.js';

async function wipe() {
    console.log('🧹 [INIT] Formateando Datos Duros de Prueba en NEON DB...');
    try {
        console.log(' - Vaciando Citas (citas)...');
        await pool.query('TRUNCATE TABLE citas RESTART IDENTITY CASCADE');
        
        console.log(' - Vaciando Leads/Suscripciones (users)...');
        await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
        
        console.log(' - Vaciando Histórico de Tráfico (page_views)...');
        await pool.query('TRUNCATE TABLE page_views RESTART IDENTITY CASCADE');
        
        console.log(' - Vaciando Eventos de Conversión (pixel_events)...');
        await pool.query('TRUNCATE TABLE pixel_events RESTART IDENTITY CASCADE');
        
        console.log(' - Vaciando Reportes de Video (video_retention)...');
        await pool.query('TRUNCATE TABLE video_retention RESTART IDENTITY CASCADE');
        
        
        console.log(' - Vaciando Logs de Servidor (admin_logs)...');
        await pool.query('TRUNCATE TABLE admin_logs RESTART IDENTITY CASCADE');

        console.log('\n🚀 ¡ÉXITO! Base de Datos purgada y lista 100% para PRODUCCIÓN.');
        console.log('⚠️ AVISO: Las configuraciones de página, las cuentas SuperAdmin y TODA la Bóveda de Media siguen intactas.');

    } catch (e) {
        console.error('❌ ERROR CRÍTICO durante el formateo:', e);
    } finally {
        process.exit(0);
    }
}

wipe();

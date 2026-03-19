import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

// Importar el servicio real que usa el bot
import { agendarEnGoogleCalendar } from './services/calendarService.js';
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

console.log('🦖 Llamando agendarEnGoogleCalendar() exactamente igual que el bot...\n');

const datos = {
    nombre: 'Test Directo Bot',
    correo: 'test@godzillaconsulting.ai',
    telefono: '6561234567',
    servicio: 'Automatización de Bots',
    fecha: '2026-03-26',
    hora: '10:00',
    notas: 'Prueba directa del calendarService.js'
};

try {
    const googleResult = await agendarEnGoogleCalendar(datos);
    console.log('✅ Google Calendar: Cita creada!');
    console.log('   Link:', googleResult.htmlLink);
    console.log('   ID evento:', googleResult.id);
    
    // Ahora guardar en BD igual que el bot
    const r = await pool.query(
        `INSERT INTO citas (nombre_completo, email, telefono, tipo_sesion, fecha, hora, notas_adicionales, status) 
         VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmada') RETURNING id`,
        [datos.nombre, datos.correo, datos.telefono, datos.servicio, datos.fecha, datos.hora, datos.notas]
    );
    console.log('\n✅ PostgreSQL: Cita guardada en BD!');
    console.log('   ID en BD:', r.rows[0].id);
    
    console.log('\n🎉 FLUJO COMPLETO FUNCIONA: Google Calendar + Base de Datos OK');
} catch (err) {
    console.error('\n❌ ERROR:', err.message);
    if (err.response?.data) {
        console.error('   Detalle Google:', JSON.stringify(err.response.data?.error, null, 2));
    }
} finally {
    await pool.end();
}

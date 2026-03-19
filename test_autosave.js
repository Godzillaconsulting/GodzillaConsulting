import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, 'server/.env') });

// Importar servicios directamente para probar sin Vercel
const { agendarEnGoogleCalendar } = await import('./server/services/calendarService.js');
const pool = (await import('./server/config/db.js')).default;

console.log('🧪 Prueba directa de AutoSave (mismo código que Vercel)\n');

const nombre = 'Carlos Mendoza Test';
const correo = 'carlos@barbershop.mx';
const telefono = '6561234567';
const servicio = 'Automatizacion de Bots';
const fecha = '2026-04-02';
const hora = '10:00';
const notas = 'barberia con 5 estilistas';

console.log('1️⃣  Probando agendarEnGoogleCalendar...');
try {
    const googleRes = await agendarEnGoogleCalendar({ nombre, correo, telefono, servicio, fecha, hora, notas });
    console.log('   Google Response ID:', googleRes?.id);
    console.log('   Google Response Link:', googleRes?.htmlLink);
    
    if (googleRes && googleRes.id) {
        console.log('\n2️⃣  Guardando en BD...');
        const saved = await pool.query(
            "INSERT INTO citas (nombre_completo, email, telefono, tipo_sesion, fecha, hora, notas_adicionales, status) VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmada') RETURNING id",
            [nombre, correo, telefono, servicio, fecha, hora, notas]
        );
        console.log('   ✅ Cita guardada en BD con ID:', saved.rows[0].id);
        console.log('   ✅ Link Calendar:', googleRes.htmlLink);
    } else {
        console.log('   ❌ Google Calendar no devolvió un ID válido');
        console.log('   Respuesta completa:', JSON.stringify(googleRes, null, 2));
    }
} catch (err) {
    console.error('   ❌ Error:', err.message);
    console.error('   Stack:', err.stack?.split('\n')[1]);
}

await pool.end();

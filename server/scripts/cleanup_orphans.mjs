/**
 * 🧹 SCRIPT DE LIMPIEZA DE NODOS HUÉRFANOS
 * Compara eventos en Google Calendar vs registros en Local.
 * Marca como 'cancelada' cualquier cita en Local que NO tenga
 * un evento real en Google Calendar.
 */
import dotenv from 'dotenv';
dotenv.config();
import { google } from 'googleapis';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Auth Google Calendar ──────────────────────────────────────────────────────
const getCalendarClient = () => {
    let privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const auth = new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL, null, privateKey,
        ['https://www.googleapis.com/auth/calendar']
    );
    return google.calendar({ version: 'v3', auth });
};

async function auditAndClean(dryRun = true) {
    const calendar = getCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    console.log('🔍 Auditando sincronización Local ↔ Google Calendar...\n');

    // 1. Obtener todas las citas confirmadas de Local
    const { rows: citas } = await pool.query(`
        SELECT id, nombre_completo, email, fecha, hora, google_calendar_event_id, created_at
        FROM citas
        WHERE status = 'confirmada'
        ORDER BY created_at DESC
    `);

    console.log(`📋 Citas confirmadas en Local: ${citas.length}`);
    console.table(citas.map(c => ({
        id: c.id,
        nombre: c.nombre_completo,
        fecha: c.fecha?.toISOString?.()?.split('T')[0] || c.fecha,
        hora: c.hora,
        calendar_id: c.google_calendar_event_id || '⚠️  SIN ID'
    })));

    // 2. Clasificar citas
    const sinCalendarId = citas.filter(c => !c.google_calendar_event_id);
    const conCalendarId = citas.filter(c => c.google_calendar_event_id);

    console.log(`\n⚠️  Sin google_calendar_event_id (huérfanas): ${sinCalendarId.length}`);
    console.log(`✅ Con google_calendar_event_id: ${conCalendarId.length}`);

    // 3. Verificar en Google Calendar las que SÍ tienen ID
    let confirmadosEnCalendar = 0;
    let noEncontradosEnCalendar = [];

    for (const cita of conCalendarId) {
        try {
            const event = await calendar.events.get({
                calendarId,
                eventId: cita.google_calendar_event_id
            });
            if (event.data.status !== 'cancelled') {
                confirmadosEnCalendar++;
            } else {
                noEncontradosEnCalendar.push(cita);
            }
        } catch (err) {
            console.log(`  ❌ Evento ${cita.google_calendar_event_id} no existe en Calendar: ${err.message}`);
            noEncontradosEnCalendar.push(cita);
        }
    }

    console.log(`\n📊 RESUMEN:`);
    console.log(`  ✅ Eventos verificados en Calendar: ${confirmadosEnCalendar}`);
    console.log(`  ❌ Nodos huérfanos con ID inválido: ${noEncontradosEnCalendar.length}`);
    console.log(`  ⚠️  Nodos huérfanos sin ID: ${sinCalendarId.length}`);

    if (dryRun) {
        console.log('\n🏃 MODO DRY-RUN: No se eliminará nada. Pasa dryRun=false para limpiar.');
        return;
    }

    // 4. Limpiar nodos huérfanos (marcamos como 'cancelada', no borramos físicamente)
    const orphanIds = [
        ...noEncontradosEnCalendar.map(c => c.id),
        ...sinCalendarId.map(c => c.id)
    ];

    if (orphanIds.length > 0) {
        await pool.query(
            `UPDATE citas SET status = 'cancelada', notas_adicionales = COALESCE(notas_adicionales,'') || ' [HUÉRFANO: sin evento en Calendar]'
             WHERE id = ANY($1::int[])`,
            [orphanIds]
        );
        console.log(`\n🗑️  ${orphanIds.length} nodo(s) huérfano(s) marcados como 'cancelada': IDs [${orphanIds.join(', ')}]`);
    } else {
        console.log('\n✨ Sin nodos huérfanos que limpiar. Local y Calendar están sincronizados.');
    }
}

const dryRun = process.argv[2] !== '--clean';
await auditAndClean(dryRun);
await pool.end();

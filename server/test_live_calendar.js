import dotenv from 'dotenv';
dotenv.config(); // Lee desde ./server/.env (se ejecuta desde /server)

import { google } from 'googleapis';

async function testLiveCalendar() {
    console.log('🔑 Probando autenticación con Google Calendar en VIVO...');

    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
        console.error('❌ CREDENCIALES FALTANTES en .env');
        process.exit(1);
    }

    // Normalizar saltos de línea por seguridad
    privateKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT(
        clientEmail,
        null,
        privateKey,
        ['https://www.googleapis.com/auth/calendar']
    );

    const calendar = google.calendar({ version: 'v3', auth });
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    console.log('📅 CalendarID usada:', calendarId);
    console.log('📧 Service Account:', clientEmail);

    // Fecha de prueba: mañana 19 marzo 2026 a las 11:00am Ciudad Juárez
    const startDateTime = new Date('2026-03-20T11:00:00-06:00');
    const endDateTime   = new Date('2026-03-20T12:00:00-06:00');

    const event = {
        summary: '✅ PRUEBA LIVE - Zilla Bot Diagnóstico',
        description: 'Cita de prueba generada automáticamente por el bot de Godzilla Consulting para validar la integración del calendario.',
        start: { dateTime: startDateTime.toISOString(), timeZone: 'America/Ciudad_Juarez' },
        end:   { dateTime: endDateTime.toISOString(),   timeZone: 'America/Ciudad_Juarez' },
        attendees: [{ email: 'oscar@godzillaconsulting.ai' }],
    };

    try {
        const res = await calendar.events.insert({
            calendarId,
            resource: event,
            sendUpdates: 'none', // No spam de correos en prueba
        });

        if (res.status === 200 || res.status === 201) {
            console.log('\n🎉 ¡ÉXITO TOTAL! Google Calendar respondió con Status', res.status);
            console.log('📌 Evento creado:', res.data.htmlLink);
            console.log('🆔 Event ID:', res.data.id);
        } else {
            console.error('⚠️ Status inesperado:', res.status);
        }
    } catch (err) {
        console.error('\n❌ ERROR al insertar evento:');
        console.error('  Mensaje:', err.message);
        if (err.response?.data) {
            console.error('  Detalle Google:', JSON.stringify(err.response.data, null, 2));
        }
    }
}

testLiveCalendar();

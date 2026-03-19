import dotenv from 'dotenv';
dotenv.config();

import { google } from 'googleapis';

async function testJWTAuth() {
    console.log('🔐 Probando JWT Auth puro con Google...\n');

    let privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;

    console.log('Email:', clientEmail);
    console.log('Key length:', privateKey?.length);
    console.log('Key starts:', privateKey?.substring(0, 27));
    
    // Normalizar \n
    privateKey = privateKey.replace(/\\n/g, '\n');
    console.log('Post-replace starts:', privateKey.substring(0, 27));
    console.log('Has real newlines:', privateKey.includes('\n'));

    const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    console.log('\n⏳ Intentando obtener access token de Google...');
    try {
        const tokenInfo = await auth.authorize();
        console.log('\n✅ ¡JWT AUTH EXITOSO!');
        console.log('Access Token (primeros 20 chars):', tokenInfo.access_token?.substring(0, 20) + '...');
        console.log('Expiry:', tokenInfo.expiry_date);

        // Si pasó la auth, insertar evento
        const calendar = google.calendar({ version: 'v3', auth });
        const calendarId = process.env.GOOGLE_CALENDAR_ID;

        const start = new Date('2026-03-20T11:00:00-06:00');
        const end   = new Date('2026-03-20T12:00:00-06:00');

        const res = await calendar.events.insert({
            calendarId,
            resource: {
                summary: '✅ PRUEBA LIVE - Zilla Bot OK',
                description: 'Cita de diagnóstico exitosa. Sistema operativo.',
                start: { dateTime: start.toISOString(), timeZone: 'America/Ciudad_Juarez' },
                end:   { dateTime: end.toISOString(),   timeZone: 'America/Ciudad_Juarez' },
            },
            sendUpdates: 'none',
        });

        console.log('\n🎉 CITA CREADA EN GOOGLE CALENDAR - Status:', res.status);
        console.log('📌 Link:', res.data.htmlLink);

    } catch (err) {
        console.error('\n❌ ERROR EN JWT AUTH:');
        console.error('  Tipo:', err.constructor.name);
        console.error('  Mensaje:', err.message);
        if (err.response?.data) {
            console.error('  Respuesta Google:', JSON.stringify(err.response.data, null, 2));
        }
    }
}

testJWTAuth();

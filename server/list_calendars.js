import dotenv from 'dotenv';
dotenv.config();

import { google } from 'googleapis';

async function listCalendars() {
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    privateKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT(
        clientEmail, null, privateKey,
        ['https://www.googleapis.com/auth/calendar']
    );

    const calendar = google.calendar({ version: 'v3', auth });

    console.log('🔍 Intentando listar calendarios accesibles por la Service Account...');
    try {
        const res = await calendar.calendarList.list();
        const items = res.data.items;
        if (!items || items.length === 0) {
            console.log('\n⚠️  La Service Account NO tiene ningún calendario compartido aún.');
            console.log('👉 Debes ir a Google Calendar.com y compartir el calendario con:');
            console.log('   ', clientEmail);
            console.log('   Permiso: "Realizar cambios en eventos"');
        } else {
            console.log('\n✅ Calendarios accesibles por la Service Account:');
            items.forEach(c => {
                console.log('  📅', c.summary, '→ ID:', c.id);
            });
        }
    } catch (err) {
        console.error('❌ Error listando calendarios:', err.message);
        if (err.errors) console.error(err.errors);
    }
}

listCalendars();

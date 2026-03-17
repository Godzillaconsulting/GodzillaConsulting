import dotenv from 'dotenv';
dotenv.config();

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testCalendar() {
    console.log("🔍 Iniciando diagnóstico de Google Calendar...");
    console.log("   GOOGLE_CALENDAR_ID:", process.env.GOOGLE_CALENDAR_ID ? '✅ Presente' : '❌ AUSENTE');
    console.log("   GOOGLE_CREDENTIALS (env var):", process.env.GOOGLE_CREDENTIALS ? '✅ Presente' : '⚠️ Ausente (usará archivo json)');

    const credsPath = join(__dirname, '..', 'google-credentials.json');
    
    try {
        const { createReadStream } = await import('fs');
        const fs = await import('fs');
        if (fs.existsSync(credsPath)) {
            console.log("   google-credentials.json:", '✅ Archivo encontrado en', credsPath);
            const content = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
            console.log("   Service Account Email:", content.client_email || '❌ No encontrado en JSON');
        } else {
            console.log("   google-credentials.json:", '❌ NO ENCONTRADO en', credsPath);
        }
    } catch (e) {
        console.error("❌ Error leyendo credentials:", e.message);
    }

    const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
    if (!CALENDAR_ID) {
        console.error("❌ GOOGLE_CALENDAR_ID no está configurado. Abortando prueba.");
        process.exit(1);
    }

    try {
        const { calendar: getCalendar } = await import('@googleapis/calendar');
        let authConfig;
        if (process.env.GOOGLE_CREDENTIALS) {
            let credsRaw = process.env.GOOGLE_CREDENTIALS;
            const credentials = JSON.parse(credsRaw);
            authConfig = { credentials, scopes: ['https://www.googleapis.com/auth/calendar.events'] };
        } else {
            authConfig = { keyFile: credsPath, scopes: ['https://www.googleapis.com/auth/calendar.events'] };
        }

        const { GoogleAuth } = await import('google-auth-library');
        const auth = new GoogleAuth(authConfig);
        const authClient = await auth.getClient();
        console.log("✅ Autenticación con Google API: OK");

        const calendar = getCalendar({ version: 'v3', auth: authClient });

        // Prueba 1: Listar eventos
        const testDate = new Date();
        const r = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: testDate.toISOString(),
            maxResults: 1,
            singleEvents: true,
        });
        console.log("✅ Conexión con Calendar ID exitosa!");
        console.log("   Próximos eventos:", r.data.items?.length ?? 0, "encontrados.");

        // Prueba 2: Crear un evento de prueba y borrarlo
        const startDT = new Date(Date.now() + 60 * 60 * 1000); // 1h desde ahora
        const endDT = new Date(startDT.getTime() + 60 * 60 * 1000);
        const evento = {
            summary: '[TEST DIAGNOSTICO - BORRAR]',
            start: { dateTime: startDT.toISOString(), timeZone: 'America/Chihuahua' },
            end: { dateTime: endDT.toISOString(), timeZone: 'America/Chihuahua' },
        };
        const created = await calendar.events.insert({ calendarId: CALENDAR_ID, resource: evento });
        console.log("✅ Evento de prueba CREADO:", created.data.id);
        await calendar.events.delete({ calendarId: CALENDAR_ID, eventId: created.data.id });
        console.log("✅ Evento de prueba BORRADO.");
        console.log("\n🎉 ¡TODO FUNCIONA! Google Calendar está listo.");
    } catch (e) {
        console.error("\n❌ FALLO EN DIAGNOSTICO:");
        console.error("   Mensaje:", e.message);
        if (e.response?.status) console.error("   HTTP Status:", e.response.status);
        if (e.response?.data) console.error("   Google Error:", JSON.stringify(e.response.data, null, 2));
    }
    process.exit(0);
}

testCalendar();

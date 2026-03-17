/* global process, Buffer */
export const agendarEnGoogleCalendar = async (datosCita) => {
    console.log("\n=================================");
    console.log("📅 [Google Calendar] Iniciando agendamiento...");
    const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
    
    try {
        // Dynamic import para evitar que Vercel falle al cargar el módulo pesado al iniciar
        const { calendar: getCalendar } = await import('@googleapis/calendar');

        let authConfig;
        if (process.env.GOOGLE_CREDENTIALS_BASE64) {
            let credsRaw = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('ascii');
            const credentials = JSON.parse(credsRaw);
            authConfig = { credentials, scopes: ['https://www.googleapis.com/auth/calendar.events'] };
        } else if (process.env.GOOGLE_CREDENTIALS) {
            let credsRaw = process.env.GOOGLE_CREDENTIALS;
            const credentials = JSON.parse(credsRaw);
            authConfig = { credentials, scopes: ['https://www.googleapis.com/auth/calendar.events'] };
        } else {
            const { fileURLToPath } = await import('url');
            const { dirname, join } = await import('path');
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);
            const credsPath = join(__dirname, '..', 'google-credentials.json');
            authConfig = { keyFile: credsPath, scopes: ['https://www.googleapis.com/auth/calendar.events'] };
        }

        // Necesario para importar la clase GoogleAuth nativa de google-auth-library
        const { GoogleAuth } = await import('google-auth-library');
        const auth = new GoogleAuth(authConfig);
        const authClient = await auth.getClient();
        
        const calendar = getCalendar({ version: 'v3', auth: authClient });
        
        // Usamos formato flotante y delegamos el TimeZone exacto a Google
        const startDateTime = `${datosCita.fecha}T${datosCita.hora}:00`; 
        
        const [h, m] = datosCita.hora.split(':');
        const endHour = (parseInt(h, 10) + 1).toString().padStart(2, '0');
        const endDateTime = `${datosCita.fecha}T${endHour}:${m}:00`;

        const desc = `Cliente: ${datosCita.nombre}\nServicio: ${datosCita.servicio}\nTel: ${datosCita.telefono}\nCorreo: ${datosCita.correo}\nNotas: ${datosCita.notas || 'Ninguna'}`;

        const event = {
            summary: `Cita Zilla: ${datosCita.nombre} - ${datosCita.servicio || 'General'}`,
            description: desc,
            start: { dateTime: startDateTime, timeZone: 'America/Chihuahua' },
            end: { dateTime: endDateTime, timeZone: 'America/Chihuahua' },
            colorId: '4',
        };

        const response = await calendar.events.insert({
            calendarId: CALENDAR_ID, 
            resource: event,
        });

        console.log("✅ Evento creado en GCalendar! URL: ", response.data.htmlLink);
        console.log("=================================\n");
        // Devolver el ID generado por Google para guardarlo en BD
        return response.data.id;
    } catch (e) {
        console.error("❌ Error en agendarEnGoogleCalendar:", e.message);
        
        let errorMsg = e.message;
        // Log detallado de la API de Google (Status Code y JSON de respuesta)
        if (e.response && e.response.status) {
            console.error("   ➡️ Status Code:", e.response.status);
            errorMsg += ` (HTTP ${e.response.status})`;
        }
        if (e.response && e.response.data) {
            console.error("   ➡️ Error Detallado de Google:", JSON.stringify(e.response.data, null, 2));
            errorMsg += ` - Detalle: ${JSON.stringify(e.response.data)}`;
        }

        console.log("=================================\n");
        throw new Error(`Fallo en Google Calendar: ${errorMsg}`);
    }
};

export const cancelarEnGoogleCalendar = async (eventId) => {
    console.log(`\n=================================\n🗑️  [Google Calendar] Cancelando evento: ${eventId}...`);
    const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
    try {
        const { calendar: getCalendar } = await import('@googleapis/calendar');
        let authConfig;
        if (process.env.GOOGLE_CREDENTIALS_BASE64) {
            const credsRaw = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('ascii');
            authConfig = { credentials: JSON.parse(credsRaw), scopes: ['https://www.googleapis.com/auth/calendar.events'] };
        } else if (process.env.GOOGLE_CREDENTIALS) {
            authConfig = { credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS), scopes: ['https://www.googleapis.com/auth/calendar.events'] };
        } else {
            const { fileURLToPath } = await import('url');
            const { dirname, join } = await import('path');
            const credsPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'google-credentials.json');
            authConfig = { keyFile: credsPath, scopes: ['https://www.googleapis.com/auth/calendar.events'] };
        }

        const { GoogleAuth } = await import('google-auth-library');
        const authClient = await new GoogleAuth(authConfig).getClient();
        await getCalendar({ version: 'v3', auth: authClient }).events.delete({ calendarId: CALENDAR_ID, eventId: eventId });
        console.log("✅ Evento cancelado en GCalendar.");
        console.log("=================================\n");
        return true;
    } catch (e) {
        console.error("❌ Error al cancelar en Calendar:", e.message);
        throw new Error(`No se pudo cancelar en Calendar: ${e.message}`);
    }
};

export const actualizarEnGoogleCalendar = async (eventId, nuevaFecha, nuevaHora) => {
    console.log(`\n=================================\n🔄 [Google Calendar] Reagendando evento: ${eventId}...`);
    const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
    try {
        const { calendar: getCalendar } = await import('@googleapis/calendar');
        let authConfig;
        if (process.env.GOOGLE_CREDENTIALS_BASE64) {
            const credsRaw = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('ascii');
            authConfig = { credentials: JSON.parse(credsRaw), scopes: ['https://www.googleapis.com/auth/calendar.events'] };
        } else if (process.env.GOOGLE_CREDENTIALS) {
            authConfig = { credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS), scopes: ['https://www.googleapis.com/auth/calendar.events'] };
        } else {
            const { fileURLToPath } = await import('url');
            const { dirname, join } = await import('path');
            const credsPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'google-credentials.json');
            authConfig = { keyFile: credsPath, scopes: ['https://www.googleapis.com/auth/calendar.events'] };
        }

        const { GoogleAuth } = await import('google-auth-library');
        const authClient = await new GoogleAuth(authConfig).getClient();
        const calendar = getCalendar({ version: 'v3', auth: authClient });
        
        // Obtener el evento original para preservar su título/descripción
        const eventoActual = await calendar.events.get({ calendarId: CALENDAR_ID, eventId: eventId });
        
        // Usar formato flotante y dejar que 'America/Chihuahua' aplique el offset correcto
        const startDateTime = `${nuevaFecha}T${nuevaHora}:00`; 
        const [h, m] = nuevaHora.split(':');
        const endHour = (parseInt(h, 10) + 1).toString().padStart(2, '0');
        const endDateTime = `${nuevaFecha}T${endHour}:${m}:00`;

        eventoActual.data.start = { dateTime: startDateTime, timeZone: 'America/Chihuahua' };
        eventoActual.data.end = { dateTime: endDateTime, timeZone: 'America/Chihuahua' };

        await calendar.events.update({ calendarId: CALENDAR_ID, eventId: eventId, resource: eventoActual.data });
        console.log("✅ Evento reagendado en GCalendar.");
        console.log("=================================\n");
        return true;
    } catch (e) {
        console.error("❌ Error al reagendar en Calendar:", e.message);
        throw new Error(`No se pudo reagendar en Calendar: ${e.message}`);
    }
};

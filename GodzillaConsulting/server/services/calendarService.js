export const agendarEnGoogleCalendar = async (datosCita) => {
    console.log("\n=================================");
    console.log("📅 [Google Calendar] Iniciando agendamiento...");
    const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
    
    try {
        // Dynamic import para evitar que Vercel falle al cargar el módulo pesado al iniciar
        const { google } = await import('googleapis');

        let authConfig;
        if (process.env.GOOGLE_CREDENTIALS) {
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

        const auth = new google.auth.GoogleAuth(authConfig);
        const authClient = await auth.getClient();
        const calendar = google.calendar({ version: 'v3', auth: authClient });
        
        // Ajuste GMT-7 / Chihuahua
        const startDateTime = `${datosCita.fecha}T${datosCita.hora}:00-07:00`; 
        const dateObj = new Date(startDateTime);
        dateObj.setHours(dateObj.getHours() + 1);
        const endDateTime = dateObj.toISOString();

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
        const { google } = await import('googleapis');
        let authConfig;
        if (process.env.GOOGLE_CREDENTIALS) {
            authConfig = { credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS), scopes: ['https://www.googleapis.com/auth/calendar.events'] };
        } else {
            const { fileURLToPath } = await import('url');
            const { dirname, join } = await import('path');
            const credsPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'google-credentials.json');
            authConfig = { keyFile: credsPath, scopes: ['https://www.googleapis.com/auth/calendar.events'] };
        }

        const authClient = await new google.auth.GoogleAuth(authConfig).getClient();
        await google.calendar({ version: 'v3', auth: authClient }).events.delete({ calendarId: CALENDAR_ID, eventId: eventId });
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
        const { google } = await import('googleapis');
        let authConfig;
        if (process.env.GOOGLE_CREDENTIALS) {
            authConfig = { credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS), scopes: ['https://www.googleapis.com/auth/calendar.events'] };
        } else {
            const { fileURLToPath } = await import('url');
            const { dirname, join } = await import('path');
            const credsPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'google-credentials.json');
            authConfig = { keyFile: credsPath, scopes: ['https://www.googleapis.com/auth/calendar.events'] };
        }

        const authClient = await new google.auth.GoogleAuth(authConfig).getClient();
        const calendar = google.calendar({ version: 'v3', auth: authClient });
        
        // Obtener el evento original para preservar su título/descripción
        const eventoActual = await calendar.events.get({ calendarId: CALENDAR_ID, eventId: eventId });
        
        const startDateTime = `${nuevaFecha}T${nuevaHora}:00-07:00`; 
        const dateObj = new Date(startDateTime);
        dateObj.setHours(dateObj.getHours() + 1);
        const endDateTime = dateObj.toISOString();

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

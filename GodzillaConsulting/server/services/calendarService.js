const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'godzilla.oscar21@gmail.com';

export const agendarEnGoogleCalendar = async (datosCita) => {
    console.log("\n=================================");
    console.log("📅 [Google Calendar] Iniciando agendamiento...");
    
    try {
        // Dynamic import para evitar que Vercel falle al cargar el módulo pesado al iniciar
        const { google } = await import('googleapis');

        let authConfig;
        if (process.env.GOOGLE_CREDENTIALS) {
            let credsRaw = process.env.GOOGLE_CREDENTIALS;
            const credentials = JSON.parse(credsRaw);
            authConfig = { credentials, scopes: ['https://www.googleapis.com/auth/calendar.events'] };
        } else {
            authConfig = { keyFile: './google-credentials.json', scopes: ['https://www.googleapis.com/auth/calendar.events'] };
        }

        const auth = new google.auth.GoogleAuth(authConfig);
        const authClient = await auth.getClient();
        const calendar = google.calendar({ version: 'v3', auth: authClient });
        
        // Ajuste GMT-7 / Chihuahua / Juárez / Ojinaga
        const startDateTime = `${datosCita.fecha}T${datosCita.hora}:00-07:00`; 
        const dateObj = new Date(startDateTime);
        dateObj.setHours(dateObj.getHours() + 1);
        const endDateTime = dateObj.toISOString();

        const desc = `Cliente: ${datosCita.nombre}\nServicio: ${datosCita.servicio}\nTel: ${datosCita.telefono}\nCorreo: ${datosCita.correo}\nNotas: ${datosCita.notas || 'Ninguna'}`;

        const event = {
            summary: `Cita Zilla: ${datosCita.nombre} - ${datosCita.servicio || 'General'}`,
            description: desc,
            start: { dateTime: startDateTime, timeZone: 'America/Ojinaga' }, // Husos horarios actualizados para la frontera
            end: { dateTime: endDateTime, timeZone: 'America/Ojinaga' },
            colorId: '4',
        };

        const response = await calendar.events.insert({
            calendarId: CALENDAR_ID, 
            resource: event,
        });

        console.log("✅ Evento creado en GCalendar! URL: ", response.data.htmlLink);
        console.log("=================================\n");
        return true;
    } catch (e) {
        console.error("❌ Error en agendarEnGoogleCalendar:", e.message);
        
        // Log detallado de la API de Google (Status Code y JSON de respuesta)
        if (e.response && e.response.status) {
            console.error("   ➡️ Status Code:", e.response.status);
        }
        if (e.response && e.response.data) {
            console.error("   ➡️ Error Detallado de Google:", JSON.stringify(e.response.data, null, 2));
        }

        console.log("=================================\n");
        return false; // Fallar silenciosamente, no crashear el bot ni el formulario
    }
};

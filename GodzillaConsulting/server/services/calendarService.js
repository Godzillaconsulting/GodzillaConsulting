const CALENDAR_ID = 'godzilla.oscar21@gmail.com';

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
        
        const startDateTime = `${datosCita.fecha}T${datosCita.hora}:00-06:00`; 
        const dateObj = new Date(startDateTime);
        dateObj.setHours(dateObj.getHours() + 1);
        const endDateTime = dateObj.toISOString();

        const desc = `Cliente: ${datosCita.nombre}\nServicio: ${datosCita.servicio}\nTel: ${datosCita.telefono}\nCorreo: ${datosCita.correo}\nNotas: ${datosCita.notas}`;

        const event = {
            summary: `Cita Zilla: ${datosCita.nombre} - ${datosCita.servicio}`,
            description: desc,
            start: { dateTime: startDateTime, timeZone: 'America/Regina' },
            end: { dateTime: endDateTime, timeZone: 'America/Regina' },
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
        console.log("=================================\n");
        return false; // Fallar silenciosamente, no crashear el bot
    }
};

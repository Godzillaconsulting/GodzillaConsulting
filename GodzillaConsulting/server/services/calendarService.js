import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

export const agendarEnGoogleCalendar = async (datosCita) => {
    console.log("\n=================================");
    console.log("📅 [Google Calendar] Iniciando agendamiento...");
    
    try {
        let auth;
        try {
            if (process.env.GOOGLE_CREDENTIALS) {
                // Parseamos de forma segura. Si el formato está mal, tirará error aquí y no en el arranque.
                let credsRaw = process.env.GOOGLE_CREDENTIALS;
                
                // Minitratamiento por si vienen saltos de línea mal formateados desde Vercel
                if (typeof credsRaw === 'string' && credsRaw.startsWith('{')) {
                    // Reemplazar saltos de línea literales \n que suelen arruinarse
                    credsRaw = credsRaw.replace(/\\n/g, '\n'); 
                }
                
                const credentials = JSON.parse(credsRaw);
                auth = new google.auth.GoogleAuth({
                    credentials,
                    scopes: SCOPES,
                });
            } else {
                auth = new google.auth.GoogleAuth({
                    keyFile: './google-credentials.json',
                    scopes: SCOPES,
                });
            }
        } catch (authErr) {
            console.error("❌ Error de Autenticación de Google Credentials:", authErr.message);
            return false; // Salir de la función sin crashear el proceso
        }

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
            calendarId: '538f3ed0539ed99bbf49c29312bea01d82665308bfbe7f57a9f861e7fe693c16@group.calendar.google.com', 
            resource: event,
        });

        console.log("✅ Evento creado en GCalendar! URL: ", response.data.htmlLink);
        console.log("=================================\n");
        return true;
    } catch (e) {
        console.error("❌ Error conectando a Google Calendar API:", e.message);
        console.log("=================================\n");
        return false;
    }
};

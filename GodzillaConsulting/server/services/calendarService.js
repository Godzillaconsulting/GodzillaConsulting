import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

let auth;
if (process.env.GOOGLE_CREDENTIALS) {
    // En Vercel leemos el JSON desde las variables de entorno para mayor seguridad
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    auth = new google.auth.GoogleAuth({
        credentials,
        scopes: SCOPES,
    });
} else {
    // En local usamos el archivo
    auth = new google.auth.GoogleAuth({
        keyFile: './google-credentials.json',
        scopes: SCOPES,
    });
}

export const agendarEnGoogleCalendar = async (datosCita) => {
    console.log("\n=================================");
    console.log("📅 [Google Calendar] Escribiendo evento...");
    
    try {
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
            start: {
                dateTime: startDateTime,
                timeZone: 'America/Regina',
            },
            end: {
                dateTime: endDateTime,
                timeZone: 'America/Regina',
            },
            colorId: '4',
        };

        const response = await calendar.events.insert({
            calendarId: '538f3ed0539ed99bbf49c29312bea01d82665308bfbe7f57a9f861e7fe693c16@group.calendar.google.com', 
            resource: event,
        });

        console.log("✅ Evento creado en GCalendar! URL: ", response.data.htmlLink);
    } catch (e) {
        console.error("❌ Error conectando a Google Calendar:", e.message);
    }
    console.log("=================================\n");
    return true;
};

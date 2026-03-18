import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const getCalendarClient = () => {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
        throw new Error('Variables de entorno de Google Calendar (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY) no configuradas.');
    }

    // Asegurarse de que los saltos de línea se formen correctamente
    privateKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT(
        clientEmail,
        null,
        privateKey,
        SCOPES
    );

    return google.calendar({ version: 'v3', auth });
};

/**
 * Inserta una cita en Google Calendar y devuelve el ID del evento (status 201) o null si falla.
 */
export const agendarEnGoogleCalendar = async (datos) => {
    try {
        const calendar = getCalendarClient();
        const calendarId = process.env.GOOGLE_CALENDAR_ID;

        if (!calendarId) {
            throw new Error('GOOGLE_CALENDAR_ID no está configurado en .env');
        }

        const { nombre, correo, telefono, servicio, fecha, hora, notas } = datos;
        
        // Crear start date & end date. Supongamos que duran 1 hora
        const startDateTime = new Date(`${fecha}T${hora}:00-06:00`); // Asegurando UTC-6 (Cd. Juárez)
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

        const event = {
            summary: `Cita: ${servicio} - ${nombre}`,
            description: `Teléfono: ${telefono}\nEmail: ${correo}\nNotas: ${notas || 'N/A'}\n\nAgendado por: Godzilla Consulting Bot`,
            start: {
                dateTime: startDateTime.toISOString(),
                timeZone: 'America/Ciudad_Juarez',
            },
            end: {
                dateTime: endDateTime.toISOString(),
                timeZone: 'America/Ciudad_Juarez',
            },
            attendees: [
                { email: correo }
            ],
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 },
                    { method: 'popup', minutes: 10 },
                ],
            },
        };

        const response = await calendar.events.insert({
            calendarId: calendarId,
            resource: event,
            sendUpdates: 'all',
        });

        if (response.status === 200 || response.status === 201) {
            console.log(`[Google Calendar] ✅ Cita agendada con éxito: ${response.data.htmlLink}`);
            return response.data;
        } else {
            throw new Error(`Google Calendar devolvió status: ${response.status}`);
        }
    } catch (error) {
        console.error('[Google Calendar Error] ❌ Fallo al agendar:', error.message);
        throw error;
    }
};

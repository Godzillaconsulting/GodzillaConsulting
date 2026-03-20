import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const getCalendarClient = () => {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.trim();
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
        throw new Error('Variables de entorno de Google Calendar (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY) no configuradas.');
    }

    // Normalizar la llave: maneja tanto \n literales como newlines reales
    // y elimina posibles \r (CRLF de Windows)
    privateKey = privateKey
        .replace(/\\n/g, '\n')  // convierte \n literal → newline real
        .replace(/\r/g, '')      // elimina \r (Windows CRLF)
        .trim();


    // Usar objeto de configuración JWT (más robusto que parámetros posicionales)
    const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: SCOPES,
    });

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
            description: `📞 Teléfono: ${telefono}\n📧 Email: ${correo}\n📝 Notas: ${notas || 'N/A'}\n\n✅ Agendado por: Godzilla Consulting Bot`,
            start: {
                dateTime: startDateTime.toISOString(),
                timeZone: 'America/Ciudad_Juarez',
            },
            end: {
                dateTime: endDateTime.toISOString(),
                timeZone: 'America/Ciudad_Juarez',
            },
            // attendees removido: las Service Accounts no pueden invitar sin Domain-Wide Delegation
            // El correo del cliente queda en la descripción para seguimiento manual
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

/**
 * Cancela (elimina) un evento de Google Calendar por su ID.
 */
export const cancelarEnGoogleCalendar = async (eventId) => {
    try {
        const calendar = getCalendarClient();
        const calendarId = process.env.GOOGLE_CALENDAR_ID;
        await calendar.events.delete({ calendarId, eventId });
        console.log(`[Google Calendar] ✅ Evento ${eventId} eliminado.`);
    } catch (error) {
        console.error('[Google Calendar] ❌ Error al cancelar evento:', error.message);
        throw error;
    }
};

/**
 * Actualiza la fecha y hora de un evento en Google Calendar.
 */
export const actualizarEnGoogleCalendar = async (eventId, nuevaFecha, nuevaHora) => {
    try {
        const calendar = getCalendarClient();
        const calendarId = process.env.GOOGLE_CALENDAR_ID;

        const startDateTime = new Date(`${nuevaFecha}T${nuevaHora}:00-06:00`);
        const endDateTime   = new Date(startDateTime.getTime() + 60 * 60 * 1000);

        await calendar.events.patch({
            calendarId,
            eventId,
            resource: {
                start: { dateTime: startDateTime.toISOString(), timeZone: 'America/Ciudad_Juarez' },
                end:   { dateTime: endDateTime.toISOString(),   timeZone: 'America/Ciudad_Juarez' },
            },
        });
        console.log(`[Google Calendar] ✅ Evento ${eventId} actualizado a ${nuevaFecha} ${nuevaHora}.`);
    } catch (error) {
        console.error('[Google Calendar] ❌ Error al actualizar evento:', error.message);
        throw error;
    }
};


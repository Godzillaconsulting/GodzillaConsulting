import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const getCalendarClient = () => {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.trim();

    // Estrategia dual para la llave:
    // • GOOGLE_PRIVATE_KEY_B64 → Base64 del PEM completo (Vercel: sin problemas de newlines)
    // • GOOGLE_PRIVATE_KEY     → PEM directo con normalización (servidor local / PM2)
    let privateKey;
    if (process.env.GOOGLE_PRIVATE_KEY_B64) {
        privateKey = Buffer.from(process.env.GOOGLE_PRIVATE_KEY_B64, 'base64').toString('utf8');
        console.log('[Cal] B64 key decodificada. Longitud:', privateKey.length);
    } else if (process.env.GOOGLE_PRIVATE_KEY) {
        privateKey = process.env.GOOGLE_PRIVATE_KEY
            .replace(/\\n/g, '\n')
            .replace(/\r/g, '')
            .trim();
        console.log('[Cal] Raw key. Longitud:', privateKey.length);
    } else {
        throw new Error('Falta GOOGLE_PRIVATE_KEY o GOOGLE_PRIVATE_KEY_B64 en variables de entorno.');
    }

    if (!clientEmail) throw new Error('Falta GOOGLE_CLIENT_EMAIL en variables de entorno.');


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

        if (!nombre || !correo || !fecha || !hora || !servicio) {
            throw new Error('Faltan datos obligatorios para agendar (nombre, correo, fecha, hora, servicio).');
        }
        
        // Calcular fin usando manipulación básica de strings (duración 1 hora)
        const [, h, m] = hora.match(/^(\d{1,2}):(\d{2})$/) || [null, '12', '00'];
        const horaFin = `${String(Number(h) + 1).padStart(2, '0')}:${m}`;

        const event = {
            summary: `Cita: ${servicio} - ${nombre}`,
            description: `📞 Teléfono: ${telefono}\n📧 Email: ${correo}\n📝 Notas: ${notas || 'N/A'}\n\n✅ Agendado por: Godzilla Consulting Bot`,
            start: {
                dateTime: `${fecha}T${hora}:00`,
                timeZone: 'America/Ciudad_Juarez',
            },
            end: {
                dateTime: `${fecha}T${horaFin}:00`,
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
            // Link a NUESTRO calendario (interno, para auditoría)
            const internalLink = response.data.htmlLink;

            // Link para que el USUARIO guarde en SU calendario personal (Google Calendar TEMPLATE)
            const fmt = (f, hStr) => `${f.replace(/-/g, '')}T${hStr.replace(':', '')}00`;
            const personalCalendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
                `&text=${encodeURIComponent(`Consultoría Godzilla Consulting - ${servicio}`)}` +
                `&dates=${fmt(fecha, hora)}/${fmt(fecha, horaFin)}` +
                `&details=${encodeURIComponent(`📋 Servicio: ${servicio}\n📞 Contacto Godzilla: +52 656 581 8912\n🌐 Web: https://godzillaconsulting.ai\n\n✅ Cita confirmada por Oscar Villanueva`)}` +
                `&ctz=America%2FCiudad_Juarez` +
                `&sf=true&output=xml`;

            console.log(`[Google Calendar] ✅ Cita agendada: ${internalLink}`);
            return {
                ...response.data,
                htmlLink: internalLink,
                personalCalendarLink,
            };
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

        const [, h, m] = nuevaHora.match(/^(\d{1,2}):(\d{2})$/) || [null, '12', '00'];
        const horaFin = `${String(Number(h) + 1).padStart(2, '0')}:${m}`;

        await calendar.events.patch({
            calendarId,
            eventId,
            resource: {
                start: { dateTime: `${nuevaFecha}T${nuevaHora}:00`, timeZone: 'America/Ciudad_Juarez' },
                end:   { dateTime: `${nuevaFecha}T${horaFin}:00`,   timeZone: 'America/Ciudad_Juarez' },
            },
        });
        console.log(`[Google Calendar] ✅ Evento ${eventId} actualizado a ${nuevaFecha} ${nuevaHora}.`);
    } catch (error) {
        console.error('[Google Calendar] ❌ Error al actualizar evento:', error.message);
        throw error;
    }
};


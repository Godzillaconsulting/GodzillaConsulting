import crypto from 'crypto';

export const sendServerEvent = async (eventName, userData) => {
    try {
        const PIXEL_ID = process.env.META_PIXEL_ID;
        const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

        if (!PIXEL_ID || !ACCESS_TOKEN) {
            console.warn(`[CAPI] META_PIXEL_ID o META_ACCESS_TOKEN no están configurados. Omitiendo evento ${eventName}.`);
            return;
        }

        const hashData = (data) => {
            if (!data) return null;
            return crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex');
        };

        const currentTimestamp = Math.floor(Date.now() / 1000);

        const eventData = [
            {
                "event_name": eventName,
                "event_time": currentTimestamp,
                "action_source": "website",
                "user_data": {
                    "em": [hashData(userData.email)],
                    "ph": [hashData(userData.phone)],
                    "client_ip_address": userData.client_ip,
                    "client_user_agent": userData.client_user_agent
                }
            }
        ];

        const response = await fetch(`https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                data: eventData
            })
        });

        const jsonRes = await response.json();
        
        if (!response.ok) {
            console.error(`❌ [CAPI] Error enviando evento ${eventName}:`, jsonRes);
        } else {
            console.log(`✅ [CAPI] Evento ${eventName} enviado exitosamente a Meta. Events Received:`, jsonRes.events_received);
        }

    } catch (error) {
        console.error(`❌ [CAPI] Excepción al enviar evento ${eventName}:`, error.message);
    }
};

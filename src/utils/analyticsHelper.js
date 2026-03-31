/**
 * Archivo de utilidad para disparar eventos dinámicos sincronizados 
 * tanto a Meta Pixel como al servidor de Godzilla Analytics.
 */

export const trackGodzillaEvent = async (eventName, eventData = {}) => {
  try {
    // 1. Enviar a Meta Pixel si está disponible
    if (window.fbq) {
      // Usamos trackCustom para que no choque con los eventos estándar si se desea, 
      // pero si el nombre es Lead o Schedule lo pasa como track estándar.
      const standardEvents = ['AddPaymentInfo', 'AddToCart', 'AddToWishlist', 'CompleteRegistration', 'Contact', 'CustomizeProduct', 'Donate', 'FindLocation', 'InitiateCheckout', 'Lead', 'Purchase', 'Schedule', 'Search', 'StartTrial', 'SubmitApplication', 'Subscribe', 'ViewContent'];
      
      if (standardEvents.includes(eventName)) {
        window.fbq('track', eventName, eventData);
      } else {
        window.fbq('trackCustom', eventName, eventData);
      }
    } else {
      console.warn(`[Pixel] No se encontró window.fbq. Evento '${eventName}' omitido en Meta.`);
    }

    // 2. Enviar al Backend propio para el Dashboard de Analytics
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    let sessionId = sessionStorage.getItem('gz_session_id');
    
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('gz_session_id', sessionId);
    }

    fetch(`${backendUrl}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        event_name: eventName,
        event_data: eventData
      })
    }).catch(err => console.debug('Tracker Backend err', err.message));

  } catch (error) {
    console.error('Error in trackGodzillaEvent:', error);
  }
};

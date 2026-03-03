/**
 * Middleware para captar peticiones maliciosas o malformadas ANTES
 * de que gastemos recursos llamando a la BD o a la API de emails..
 */
export const validateEmailRequest = (req, res, next) => {
    // 1. Evitar Honeypot Bot Trap (Frontend mandará un campo 'website' oculto por CSS)
    // Si un bot autocompleta todos los campos ciegamente, llenará esto.
    if (req.body.website) {
        // Responder éxito silencioso a bots, para que crean que lo lograron
        return res.status(200).json({ success: true, message: 'email_sent' });
    }

    const { email, lead_magnet_slug } = req.body;

    // 1. Verificamos que vengan los datos obligatorios
    if (!email || !lead_magnet_slug) {
        return res.status(400).json({
            success: false,
            message: 'Faltan campos obligatorios en la solicitud.'
        });
    }

    // 2. Validación Regex sencilla pero segura de Emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: 'Por favor ingresa un correo electrónico válido.'
        });
    }

    // 3. Validación de Slugs Permitidos (whitelisting previene ataques SQL Injections 
    // lógicos o llamadas a recursos inexistentes)
    const validSlugs = ['prompts-ia-marketing', 'leads-whatsapp'];
    if (!validSlugs.includes(lead_magnet_slug)) {
        return res.status(400).json({
            success: false,
            message: 'El recurso solicitado no es válido o está inactivo.'
        });
    }

    // Si todo está bien, lo pasamos al Lead Controller
    next();
};

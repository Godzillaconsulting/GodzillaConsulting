import express from 'express';
import { processContactForm } from '../controllers/contactController.js';

const router = express.Router();

const validateContact = (req, res, next) => {
    const { nombre, email, telefono, preferencia_sesion, fecha, hora } = req.body;
    const errors = [];

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) errors.push({ msg: 'Nombre requerido' });
    if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) errors.push({ msg: 'Email inválido' });
    if (!telefono || typeof telefono !== 'string' || !telefono.trim()) errors.push({ msg: 'Teléfono requerido' });
    if (!preferencia_sesion || typeof preferencia_sesion !== 'string' || !preferencia_sesion.trim()) errors.push({ msg: 'Preferencia requerida' });
    if (!fecha || typeof fecha !== 'string' || !fecha.trim()) errors.push({ msg: 'Fecha requerida' });
    if (!hora || typeof hora !== 'string' || !hora.trim()) errors.push({ msg: 'Hora requerida' });

    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    // Limpiar campos basicos antes de delegarlo al controlador
    req.body.nombre = nombre.trim();
    req.body.email = email.trim().toLowerCase();
    req.body.telefono = telefono.trim();
    req.body.preferencia_sesion = preferencia_sesion.trim();
    req.body.fecha = fecha.trim();
    req.body.hora = hora.trim();
    
    next();
};

router.post('/', validateContact, processContactForm);

export default router;

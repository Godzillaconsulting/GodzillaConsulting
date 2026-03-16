import express from 'express';
import { body, validationResult } from 'express-validator';
import { processContactForm } from '../controllers/contactController.js';

const router = express.Router();

const validateContact = [
    body('nombre').trim().escape().notEmpty().withMessage('Nombre requerido'),
    body('email').trim().normalizeEmail().isEmail().withMessage('Email inválido'),
    body('telefono').trim().escape().notEmpty(),
    body('preferencia_sesion').trim().escape(),
    body('fecha').trim().escape(),
    body('hora').trim().escape(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
    }
];

router.post('/', validateContact, processContactForm);

export default router;

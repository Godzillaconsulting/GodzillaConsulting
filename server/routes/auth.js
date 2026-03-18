import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const router = express.Router();

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos.' });
        }

        const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
        }

        const admin = result.rows[0];
        const isMatch = await bcrypt.compare(password, admin.password_hash);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
        }

        const token = jwt.sign(
            { id: admin.id, username: admin.username },
            process.env.JWT_SECRET || 'godzilla_temp_secret_key_2026',
            { expiresIn: '24h' }
        );

        res.json({ success: true, token, username: admin.username });
    } catch (error) {
        console.error('Error en /api/auth/login:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor.' });
    }
});

export default router;

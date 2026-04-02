import express from 'express';
import pool from '../config/db.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// GET all lead magnets
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM lead_magnets ORDER BY created_at DESC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('❌ Error fetching lead magnets:', error);
        res.status(500).json({ error: 'Failed to fetch lead magnets' });
    }
});

// POST new lead magnet - RESTRINGIDO A ADMINS
router.post('/', requireAdmin, async (req, res) => {
    const { slug, name, email_subject, email_body, file_url } = req.body;
    
    if (!slug || !name || !email_subject || !email_body || !file_url) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO lead_magnets (slug, name, email_subject, email_body, file_url)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [slug, name, email_subject, email_body, file_url]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // UNIQUE constraint violation
            return res.status(409).json({ error: 'A lead magnet with this slug already exists' });
        }
        console.error('❌ Error creating lead magnet:', error);
        res.status(500).json({ error: 'Failed to create lead magnet' });
    }
});

// PUT update lead magnet - RESTRINGIDO A ADMINS
router.put('/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { email_subject, email_body, file_url } = req.body;

    if (!email_subject || !email_body || !file_url) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const result = await pool.query(
            `UPDATE lead_magnets 
             SET email_subject = $1, email_body = $2, file_url = $3
             WHERE id = $4
             RETURNING *`,
            [email_subject, email_body, file_url, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Lead magnet not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error updating lead magnet:', error);
        res.status(500).json({ error: 'Failed to update lead magnet' });
    }
});

export default router;

import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/db.js';
import { requireAdmin, requireSuperAdmin } from '../middlewares/adminAuth.js';

const router = express.Router();

// ── Helper de Log de Auditoría ──
const logAction = async (adminId, action, details) => {
    try {
        await pool.query(
            'INSERT INTO admin_logs (admin_id, action, details) VALUES ($1, $2, $3)',
            [adminId, action, JSON.stringify(details)]
        );
    } catch (e) {
        console.error('Error insertando log de auditoría', e);
    }
};

// ==========================================
// RUTAS PERFIL PERSONAL (Cualquier Admin)
// ==========================================

// Obtener perfil actual
router.get('/profile', requireAdmin, (req, res) => {
    res.json({ success: true, profile: req.admin });
});

// Actualizar perfil (contraseña, foto, username)
router.put('/profile', requireAdmin, async (req, res) => {
    const { username, password, photo_url } = req.body;
    try {
        // Obtener usuario actual
        const currentRes = await pool.query('SELECT username, password_hash FROM admins WHERE id = $1', [req.admin.id]);
        if (currentRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Admin no encontrado' });
        
        const currentAdmin = currentRes.rows[0];
        let newPasswordHash = currentAdmin.password_hash;
        
        if (password && password.trim().length > 0) {
            const salt = await bcrypt.genSalt(10);
            newPasswordHash = await bcrypt.hash(password, salt);
        }

        const newUsername = username || currentAdmin.username;

        await pool.query(
            'UPDATE admins SET username = $1, photo_url = $2, password_hash = $3 WHERE id = $4',
            [newUsername, photo_url || '', newPasswordHash, req.admin.id]
        );

        // Registrar auditoría
        const changes = {};
        if (username && username !== currentAdmin.username) changes.username = newUsername;
        if (password && password.trim().length > 0) changes.password = 'changed';
        if (photo_url) changes.photo_url = 'changed';

        await logAction(req.admin.id, 'UPDATE_PROFILE', { ...changes });

        res.json({ success: true, message: 'Perfil actualizado exitosamente.', newUsername });
    } catch (error) {
        console.error('Error en PUT /profile:', error);
        if (error.code === '23505') { // Unique constraint
            return res.status(400).json({ success: false, message: 'Ese nombre de usuario ya está tomado.' });
        }
        res.status(500).json({ success: false, message: 'Error del servidor al actualizar perfil.' });
    }
});


// ==========================================
// RUTAS SUPERADMIN
// ==========================================

// Validar que el SuperAdmin da su contraseña maestra
const verifySuperAdminPassword = async (superadminId, providedPassword) => {
    const res = await pool.query('SELECT password_hash FROM admins WHERE id = $1', [superadminId]);
    if (res.rows.length === 0) return false;
    return await bcrypt.compare(providedPassword, res.rows[0].password_hash);
};

// Obtener todos los usuarios y logs
router.get('/', requireAdmin, requireSuperAdmin, async (req, res) => {
    try {
        const usersRes = await pool.query('SELECT id, username, photo_url, is_superadmin, status, created_at FROM admins ORDER BY id ASC');
        const logsRes = await pool.query(`
            SELECT l.id, l.action, l.details, l.created_at, a.username 
            FROM admin_logs l 
            LEFT JOIN admins a ON l.admin_id = a.id 
            ORDER BY l.created_at DESC LIMIT 100
        `);
        res.json({ success: true, users: usersRes.rows, logs: logsRes.rows });
    } catch (e) {
        console.error('Error GET /users superadmin', e);
        res.status(500).json({ success: false });
    }
});

// Crear usuario (Requiere superadminPassword)
router.post('/', requireAdmin, requireSuperAdmin, async (req, res) => {
    const { superadminPassword, newUsername, newPassword, isSuperadmin } = req.body;
    
    if (!await verifySuperAdminPassword(req.admin.id, superadminPassword)) {
        return res.status(403).json({ success: false, message: 'Contraseña maestra incorrecta.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword || 'Godzilla2026', salt);
        
        const r = await pool.query(
            'INSERT INTO admins (username, password_hash, is_superadmin) VALUES ($1, $2, $3) RETURNING id',
            [newUsername, hash, isSuperadmin === true]
        );
        
        await logAction(req.admin.id, 'CREATE_USER', { created_user: newUsername, is_superadmin: isSuperadmin });
        res.json({ success: true, message: 'Usuario creado.' });
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ success: false, message: 'Usuario ya existente.' });
        res.status(500).json({ success: false, message: 'Error del servidor.' });
    }
});

// Editar usuario / resetear pass (Requiere superadminPassword)
router.put('/:id', requireAdmin, requireSuperAdmin, async (req, res) => {
    const { superadminPassword, username, newPassword, status, isSuperadmin } = req.body;
    const targetId = req.params.id;

    if (!await verifySuperAdminPassword(req.admin.id, superadminPassword)) {
        return res.status(403).json({ success: false, message: 'Contraseña maestra incorrecta.' });
    }

    try {
        // Obtener actual
        const curRes = await pool.query('SELECT * FROM admins WHERE id = $1', [targetId]);
        if (curRes.rows.length === 0) return res.status(404).json({ success: false, message: 'No encontrado' });
        const cur = curRes.rows[0];

        // Evitar degradar al fundador JareG, excepto para el dueño supremo (ID 2 - godzilla_admin)
        if (cur.username === 'JareG' && isSuperadmin === false && parseInt(req.admin.id) !== 2) {
            return res.status(403).json({ success: false, message: 'El perfil de Fundador (JareG) solo puede ser degradado por el CEO (godzilla_admin).' });
        }

        let hash = cur.password_hash;
        if (newPassword && newPassword.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            hash = await bcrypt.hash(newPassword, salt);
        }

        const newUname = username || cur.username;
        const newStats = status || cur.status;
        const newIsSup = isSuperadmin !== undefined ? isSuperadmin : cur.is_superadmin;

        await pool.query(
            'UPDATE admins SET username=$1, password_hash=$2, status=$3, is_superadmin=$4 WHERE id=$5',
            [newUname, hash, newStats, newIsSup, targetId]
        );

        await logAction(req.admin.id, 'UPDATE_USER', { target_user: cur.username });
        res.json({ success: true, message: 'Usuario modificado.' });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error en edición.' });
    }
});

// Eliminar usuario (Requiere superadminPassword)
router.delete('/:id', requireAdmin, requireSuperAdmin, async (req, res) => {
    const { superadminPassword } = req.body;
    const targetId = req.params.id;

    if (!await verifySuperAdminPassword(req.admin.id, superadminPassword)) {
        return res.status(403).json({ success: false, message: 'Contraseña maestra incorrecta.' });
    }

    if (parseInt(targetId) === parseInt(req.admin.id)) {
        return res.status(400).json({ success: false, message: 'No puedes eliminarte a ti mismo.' });
    }

    try {
        const curRes = await pool.query('SELECT username FROM admins WHERE id = $1', [targetId]);
        if (curRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        
        if (curRes.rows[0].username === 'JareG' && parseInt(req.admin.id) !== 2) {
            return res.status(403).json({ success: false, message: 'Infranqueable: Solo el CEO (godzilla_admin) puede eliminar al perfil Fundador (JareG).' });
        }

        await pool.query('DELETE FROM admins WHERE id = $1', [targetId]);
        await logAction(req.admin.id, 'DELETE_USER', { deleted_user: curRes.rows[0].username });
        res.json({ success: true, message: 'Usuario eliminado.' });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error eliminando.' });
    }
});

// Para exportarlo para usarse de utilidad general desde otras rutas
export { logAction };

export default router;

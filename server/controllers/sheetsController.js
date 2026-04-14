import { google } from 'googleapis';

// ──────────────────────────────────────────────────────────────
// Reutiliza las credenciales del Service Account ya configuradas
// en .env para el Calendario de Google.
// ──────────────────────────────────────────────────────────────
const getAuth = () => {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;

    if (!privateKey || !clientEmail) {
        throw new Error('GOOGLE_CLIENT_EMAIL o GOOGLE_PRIVATE_KEY no están configuradas en .env');
    }

    return new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
};

// ──────────────────────────────────────────────────────────────
// Detecta el índice de columna por nombre (case-insensitive)
// ──────────────────────────────────────────────────────────────
const findCol = (headers, ...names) => {
    for (const name of names) {
        const idx = headers.findIndex(h => h?.toLowerCase().trim() === name.toLowerCase());
        if (idx !== -1) return idx;
    }
    return -1;
};

// ──────────────────────────────────────────────────────────────
// Parsea una fecha en múltiples formatos comunes
// ──────────────────────────────────────────────────────────────
const parseDate = (raw) => {
    if (!raw) return null;
    // Formatos: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, "14 abril 2026", etc.
    const str = String(raw).trim();
    // ISO
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str);
    // DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
        const [d, m, y] = str.split('/');
        return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
    }
    // Número serial de Excel/Sheets
    if (/^\d{5}$/.test(str)) {
        const excelEpoch = new Date(1899, 11, 30);
        return new Date(excelEpoch.getTime() + parseInt(str) * 86400000);
    }
    // Intento genérico
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
};

// ──────────────────────────────────────────────────────────────
// Mapeo de status legible → código interno del calendario
// ──────────────────────────────────────────────────────────────
const mapStatus = (raw) => {
    if (!raw) return 'warning';
    const s = raw.toLowerCase();
    if (s.includes('listo') || s.includes('done') || s.includes('aprobado') || s.includes('complet')) return 'success';
    if (s.includes('urgent') || s.includes('critico') || s.includes('crítico')) return 'urgent';
    return 'warning'; // pendiente, en progreso, etc.
};

// ──────────────────────────────────────────────────────────────
// Mapeo de plataforma
// ──────────────────────────────────────────────────────────────
const mapPlatform = (raw) => {
    if (!raw) return 'ALL';
    const p = raw.toLowerCase();
    if (p.includes('ig') || p.includes('insta')) return 'instagram';
    if (p.includes('fb') || p.includes('face')) return 'facebook';
    if (p.includes('tik') || p.includes('tt')) return 'tiktok';
    return 'ALL';
};

// ──────────────────────────────────────────────────────────────
// GET /api/sheets/import?spreadsheetId=...&range=...&sheet=...
// ──────────────────────────────────────────────────────────────
export const importFromSheets = async (req, res) => {
    try {
        const { spreadsheetId, range, sheet } = req.query;

        if (!spreadsheetId) {
            return res.status(400).json({ success: false, error: 'Falta el parámetro spreadsheetId' });
        }

        const auth = getAuth();
        const sheetsApi = google.sheets({ version: 'v4', auth });

        // Si no se especifica rango, leer la 1a hoja completa
        const readRange = range || (sheet ? `'${sheet}'!A:Z` : 'A:Z');

        const response = await sheetsApi.spreadsheets.values.get({
            spreadsheetId,
            range: readRange,
        });

        const rows = response.data.values;
        if (!rows || rows.length < 2) {
            return res.json({ success: true, events: [], message: 'Sheet vacío o sin datos' });
        }

        // Primera fila = encabezados
        const headers = rows[0];

        // Detectar columnas automáticamente (flexible)
        const colFecha     = findCol(headers, 'fecha', 'date', 'día', 'dia', 'Fecha de publicación', 'fecha publicacion');
        const colPlataform = findCol(headers, 'plataforma', 'platform', 'red', 'red social', 'canal');
        const colTitulo    = findCol(headers, 'titulo', 'título', 'title', 'nombre', 'contenido', 'tema', 'Tema');
        const colBrief     = findCol(headers, 'brief', 'caption', 'descripcion', 'descripción', 'copy', 'texto', 'briefing');
        const colStatus    = findCol(headers, 'status', 'estado', 'estatus', 'avance');
        const colAsignado  = findCol(headers, 'asignado', 'asignado a', 'responsable', 'quien', 'quién');
        const colRef       = findCol(headers, 'referencia', 'url', 'link', 'imagen', 'foto');

        const events = rows.slice(1).reduce((acc, row, idx) => {
            // Omitir filas completamente vacías
            if (row.every(cell => !cell || !String(cell).trim())) return acc;

            const fechaRaw = colFecha !== -1 ? row[colFecha] : null;
            const fecha = parseDate(fechaRaw);

            if (!fecha) {
                console.warn(`[SHEETS] Fila ${idx + 2}: fecha no parseable ("${fechaRaw}") — omitida`);
                return acc;
            }

            const titulo = colTitulo !== -1 ? (row[colTitulo] || '').trim() : `Entrada ${idx + 2}`;
            const plataforma = mapPlatform(colPlataform !== -1 ? row[colPlataform] : '');
            const brief = colBrief !== -1 ? (row[colBrief] || '').trim() : '';
            const status = mapStatus(colStatus !== -1 ? row[colStatus] : '');
            const asignado = colAsignado !== -1 ? (row[colAsignado] || '').trim() : '';
            const refUrl = colRef !== -1 ? (row[colRef] || '').trim() : '';

            const platformPrefix = plataforma === 'tiktok' ? '⚫ TK' :
                                   plataforma === 'instagram' ? '🟣 IG' :
                                   plataforma === 'facebook' ? '🔵 FB' : '🌐 Multi';

            acc.push({
                title: `${platformPrefix}: ${titulo}`,
                platform: plataforma,
                status,
                caption: brief,
                media_url: refUrl,
                provider: 'sheets_import',
                start_date: fecha.toISOString(),
                end_date: fecha.toISOString(),
                empresa: 'godzilla',
                assigned_to: asignado,
                from_sheets: true,
            });

            return acc;
        }, []);

        console.log(`[SHEETS] ✅ Importados ${events.length} eventos desde Spreadsheet ${spreadsheetId}`);

        return res.json({
            success: true,
            events,
            total: events.length,
            headers, // Devolver headers para que el frontend pueda mostrar las columnas detectadas
        });

    } catch (err) {
        console.error('[SHEETS] ❌ Error importando desde Google Sheets:', err.message);

        if (err.message.includes('not found') || err.code === 404) {
            return res.status(404).json({ success: false, error: 'Spreadsheet no encontrado. Verifica el ID y que esté compartido con la Service Account.' });
        }
        if (err.message.includes('permission') || err.code === 403) {
            return res.status(403).json({ success: false, error: 'Sin permiso. Comparte el Sheet con: ' + (process.env.GOOGLE_CLIENT_EMAIL || 'la Service Account') });
        }

        return res.status(500).json({ success: false, error: err.message });
    }
};

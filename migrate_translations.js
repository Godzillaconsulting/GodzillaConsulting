import pool from './server/config/db.js';
import { translateNodePayload } from './server/services/translateService.js';

const migrate = async () => {
    try {
        console.log('Initiating migration of existing package nodes...');
        const res = await pool.query('SELECT * FROM site_nodes WHERE id LIKE $1 OR id = $2', ['paquete-%', 'paquetes']);
        
        for (const row of res.rows) {
            console.log(`Processing node: ${row.id}`);
            const published = row.published_data || {};
            const draft = row.draft_data || {};

            console.log(`Translating PUBLISHED data for ${row.id}...`);
            const tPub = await translateNodePayload(published, row.id);
            if (tPub) {
                published.translations = { ...published.translations, en: tPub };
            }

            console.log(`Translating DRAFT data for ${row.id}...`);
            const tDraft = await translateNodePayload(draft, row.id);
            if (tDraft) {
                draft.translations = { ...draft.translations, en: tDraft };
            }

            await pool.query('UPDATE site_nodes SET published_data = $1, draft_data = $2 WHERE id = $3', [published, draft, row.id]);
            console.log(`Successfully updated node: ${row.id}`);
        }
        console.log('Migration complete. All nodes auto-translated.');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
};

migrate();

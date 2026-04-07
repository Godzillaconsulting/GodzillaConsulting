import db from './server/config/db.js';

async function run() {
    try {
        const HOST = 'https://godzillaconsulting.ai';
        const client = db;
        
        await client.query("UPDATE lead_magnets SET file_url=$1 WHERE slug='recurso1'", [`${HOST}/lead-magnets/prompts-ia.pdf`]);
        await client.query("UPDATE lead_magnets SET file_url=$1 WHERE slug='recurso2'", [`${HOST}/lead-magnets/whatsapp-guia.pdf`]);
        await client.query("UPDATE lead_magnets SET file_url=$1 WHERE slug='recurso3'", [`${HOST}/lead-magnets/crm-template.xlsx`]);
        
        console.log('Fallbacks de recursos corregidos existosamente!');
    } catch(err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
run();

import { generateAndSendAutoNewsletter } from './services/newsletterGenerator.js';

async function run() {
    console.log('Generando newsletter manualmente para compensar el que no se corrió hoy...');
    try {
        const result = await generateAndSendAutoNewsletter();
        console.log('✅ Éxito:', result);
    } catch (e) {
        console.error('❌ Error:', e);
    }
    process.exit(0);
}

run();

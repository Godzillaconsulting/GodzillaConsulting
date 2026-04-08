import { generateAndSendAutoNewsletter } from '../services/newsletterGenerator.js';

async function run() {
    console.log('⏳ [CRON] Activando Despliegue Automático Semanal del Newsletter...');
    try {
        const result = await generateAndSendAutoNewsletter();
        console.log('✅ [CRON] Éxito masivo. El boletín en PDF se ha puesto en circulación:', result);
        process.exit(0);
    } catch (e) {
        console.error('❌ [CRON] Falla en la programación del Newsletter:', e.message);
        // Salir con código 1 para que pm2 o el log registre el fallo
        process.exit(1);
    }
}

run();

import Engine from './services/automationEngine.js';

async function runLive() {
    try {
        console.log("Iniciando Trends Bot...");
        const ctx1 = await Engine.NODE_ACTIONS['Trends Bot']({ config: { niche: 'Marketing Digital' } }, {});
        console.log("Trends Bot completado. Obtenido:", ctx1.trend);
        
        console.log("Pasando a Paquete de Contenido Social...");
        const ctx2 = await Engine.NODE_ACTIONS['Paquete de Contenido Social']({ config: { content_type: 'video' } }, ctx1);
        console.log("Completado. ID Tarea generada:", ctx2.taskId);
        
        console.log("Script finalizado.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

runLive();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routesDir = path.join(__dirname, '../routes');

async function checkRoutes() {
    console.log('🛡️ [PREFLIGHT] Blindando servidor: Comprobando integridad de rutas y dependencias...');
    
    const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
    let errors = 0;
    
    for (const file of files) {
        try {
            await import(`file://${path.join(routesDir, file)}`);
            console.log(`✅ [OK] ${file}`);
        } catch (err) {
            console.error(`❌ [ERROR] Módulo roto detectado en ${file}:`);
            console.error(err.message);
            errors++;
        }
    }
    
    if (errors > 0) {
        console.error(`🚨 [CRÍTICO] Preflight falló. Se detectaron ${errors} errores de importación/sintaxis.`);
        console.error(`🔒 El despliegue a producción o el inicio del servidor ha sido BLOQUEADO para prevenir caídas.`);
        process.exit(1);
    } else {
        console.log('✅ [PREFLIGHT] Todos los módulos backend pasaron la auditoría de seguridad.');
        process.exit(0);
    }
}

checkRoutes();

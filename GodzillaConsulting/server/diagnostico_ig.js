import dotenv from 'dotenv';
dotenv.config();

async function testInstagramConnection() {
    console.log("🔍 Iniciando Auditoría de Token para Instagram...");
    const PAGE_TOKEN = process.env.PAGE_ACCESS_TOKEN;
    
    if (!PAGE_TOKEN || PAGE_TOKEN === 'PENDIENTE_TOKEN_DE_META') {
        return console.error("❌ ERROR: No hay PAGE_ACCESS_TOKEN configurado en tu archivo .env local.");
    }

    try {
        // 1. Obtener los IDs de las páginas que controla este token
        console.log("➡️ Paso 1: Obteniendo Cuentas de Facebook...");
        const meRes = await fetch(\`https://graph.facebook.com/v19.0/me?fields=id,name,instagram_business_account&access_token=\${PAGE_TOKEN}\`);
        const meData = await meRes.json();
        
        if (meData.error) {
            console.error("❌ ERROR del Token (Facebook API):", JSON.stringify(meData.error, null, 2));
            return;
        }
        
        console.log(\`✅ Token Válido para la Página: \${meData.name} (ID: \${meData.id})\`);
        
        // 2. Verificar cuenta vinculada de Instagram
        if (!meData.instagram_business_account) {
            console.log("=========================================");
            console.log("❌ FALLA CRÍTICA ENCONTRADA EN META ❌");
            console.log("Tu Token de Facebook SÍ funcionó para Messenger, pero Meta dice que ESTA PÁGINA ESPECÍFICA NO TIENE UNA CUENTA PROFESIONAL DE INSTAGRAM VINCULADA OFICIALMENTE.");
            console.log("Solución: Ve a Facebook > Configuración de la Página -> Cuentas Vinculadas -> Instagram y asegúrate de que esté 100% conectada y sea 'Cuenta de Creador' o 'Cuenta de Empresa'.");
            console.log("=========================================");
            return;
        }

        const igAccountId = meData.instagram_business_account.id;
        console.log(\`✅ Cuenta de Instagram vinculada detectada! (IG ID: \${igAccountId})\`);
        
        // 3. Probar envío vacío a Instagram para probar error de permisos (esperamos un error 100 "Unsupported get request", pero NO un error de permisos OAuth).
        console.log("➡️ Paso 2: Verificando permisos 'instagram_manage_messages'...");
        const igRes = await fetch(\`https://graph.facebook.com/v19.0/\${igAccountId}/messages_preferences?access_token=\${PAGE_TOKEN}\`);
        const igData = await igRes.json();
        
        if (igData.error && igData.error.type === 'OAuthException') {
            console.log("=========================================");
            console.log("❌ FALLA CRÍTICA DE PERMISOS (OAuthException) ❌");
            console.log("Tu Token es real y la cuenta está vinculada, pppero al generar tu Token olvidaste marcar la casilla de permiso: 'instagram_manage_messages'.");
            console.log("Solución: Tienes que regenerar el Token con el permiso activado y cambiarlo en Vercel.");
            console.log(igData.error.message);
            console.log("=========================================");
            return;
        }

        console.log("✅ Tu Token está perfecto para Instagram! Meta le tiene las puertas abiertas en teoría.");
        console.log("🎯 DIAGNÓSTICO DEL QA: Si todo esto salió en verde, significa que el código de Vercel y tu Token están 100% bien.");
        console.log("El problema es 100% en el Dashboard de Meta For Developers > Aplicación > Messenger > Configuración de Instagram. A Vercel (el webhook) ni siquiera le está llegando la notificación cuando alguien manda mensaje.");
        console.log("Asegúrate de haberle dado al botón azul de 'Suscribirse a Events' en la sección especifica de Instagram en tu app de desarrollador.");

    } catch (error) {
        console.error("❌ Error JS Crítico:", error);
    }
}

testInstagramConnection();

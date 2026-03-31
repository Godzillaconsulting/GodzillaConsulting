const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Cargar validamente el archivo .env del servidor local
const envPath = path.join(__dirname, 'server', '.env');
if (!fs.existsSync(envPath)) {
    console.error("No encontré el .env en la ruta de server.");
    process.exit(1);
}

const envConfig = dotenv.parse(fs.readFileSync(envPath));
const token = envConfig.PAGE_ACCESS_TOKEN;

if (!token) {
    console.error("El PAGE_ACCESS_TOKEN no existe dentro del .env :(");
    process.exit(1);
}

console.log("🔥 Arrancando radar cibernético hacia los servidores de Mark Zuckerberg...");
console.log("🔑 Enviando token secreto...");

async function pingMeta() {
    try {
        // Obtenemos los datos de la Página de Facebook y cuenta de Instagram amarrada
        const url = `https://graph.facebook.com/v19.0/me?fields=id,name,fan_count,followers_count,instagram_business_account{id,username,followers_count,media_count}&access_token=${token}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("❌ Rechazaron la llave o caducó:");
            console.error(data.error.message);
            return;
        }

        console.log("✅ ¡HACKEO LEGAL EXITOSO! Estamos conectados directamente a tu marca.");
        console.log("-----------------------------------------");
        console.log(`👤 EMPRESA FB: ${data.name} (ID: ${data.id})`);
        console.log(`⭐ Me Gustas en FB: ${data.fan_count || 'N/A'} | Seguidores FB: ${data.followers_count || 'N/A'}`);
        
        if (data.instagram_business_account) {
            const ig = data.instagram_business_account;
            console.log("-----------------------------------------");
            console.log(`📸 INSTAGRAM BUSINESS CONECTADO: @${ig.username} (ID: ${ig.id})`);
            console.log(`👥 Seguidores Reales en IG: ${ig.followers_count}`);
            console.log(`📝 Publicaciones Totales IG: ${ig.media_count}`);
        } else {
            console.log("⚠️ No detecto la cuenta de Instagram ligada a esta página de Face.");
        }
        
    } catch (e) {
        console.error("Error catastrofico en la red local:", e);
    }
}

pingMeta();

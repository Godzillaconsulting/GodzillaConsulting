import { generarGuionDelDia } from './server/auto_content_bot.js';
import { getTrends } from './server/controllers/trendsController.js';
import dotenv from 'dotenv';
import path from 'path';

// Load the correct env
dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

async function test() {
    console.log("======================================");
    console.log("🔥 TENDENCIAS VIRALES (HOY) 🔥");
    console.log("======================================");

    // Mock Express Req/Res
    const req = { query: { network: 'TikTok', filter: 'Startups y Negocios B2B' } };
    const res = {
        json: (data) => {
            console.log("\n📊 HASHTAGS Y GANCHOS GENERADOS:");
            console.log(JSON.stringify(data, null, 2));
            return data;
        }
    };
    
    await getTrends(req, res);

    console.log("\n======================================");
    console.log("🎬 GUION DEL DÍA (AUTO CONTENT BOT) 🎬");
    console.log("======================================");
    
    await generarGuionDelDia('Cómo usar Agentes de IA en Ventas B2B');
}

test();

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function setupSiteNodes() {
    const client = await pool.connect();
    try {
        console.log('⏳ Creando tabla site_nodes en la base de datos Local...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS site_nodes (
                id VARCHAR(255) PRIMARY KEY,
                next_node_id VARCHAR(255),
                published_data JSONB DEFAULT '{}'::jsonb,
                draft_data JSONB DEFAULT '{}'::jsonb,
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ Tabla "site_nodes" creada o verificada.');

        // Initialize with default sections if empty
        const countRes = await client.query('SELECT COUNT(*) FROM site_nodes');
        if (parseInt(countRes.rows[0].count) === 0) {
            console.log('⏳ Insertando nodos iniciales básicos...');
            const initialNodes = [
                { id: 'hero', next_node_id: 'servicios', title: 'Hero' },
                { id: 'servicios', next_node_id: 'paquetes', title: 'Servicios' },
                { id: 'paquetes', next_node_id: 'footer', title: 'Paquetes' },
                { id: 'footer', next_node_id: null, title: 'Footer' }
            ];

            for (const node of initialNodes) {
                const defaultData = JSON.stringify({ title: node.title, elements: [] });
                await client.query(`
                    INSERT INTO site_nodes (id, next_node_id, published_data, draft_data)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (id) DO NOTHING;
                `, [node.id, node.next_node_id, defaultData, defaultData]);
            }
            console.log('✅ Nodos iniciales insertados.');
        } else {
             console.log('✅ Nodos básicos ya existen, verificando los nuevos nodos de Landing Paquetes...');
        }

        // Insert we always run for LandingPaquetes to assure they exist
        const landingPaquetes = [
            'paquete-posicionamiento-social',
            'paquete-control-ia',
            'paquete-expansion',
            'paquete-elite'
        ];

        const defaultLandingData = JSON.stringify({
            heroTitle: "NOMBRE DEL PAQUETE",
            heroTopText: "CÓMO TE AYUDAREMOS",
            heroDisclaimer: "*Sujeto a contrato de servicios.",
            planTarget: "Ideal para la fase actual de tu negocio",
            planPrice: "$0,000",
            planPeriod: "al mes",
            videoUrl: "",
            guaranteeTitle: "GARANTÍA DE RESULTADOS",
            guaranteeBadge: "100% Garantizado",
            guaranteeText: "Si no cumplimos los objetivos, el siguiente mes es gratis.",
            planFeaturesExtended: [
                { title: "Característica 1", desc: "Descripción detallada de la característica." },
                { title: "Característica 2", desc: "Descripción detallada de la característica." }
            ]
        });

        for (const pid of landingPaquetes) {
            await client.query(`
                INSERT INTO site_nodes (id, next_node_id, published_data, draft_data)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (id) DO NOTHING;
            `, [pid, null, defaultLandingData, defaultLandingData]);
        }
        console.log('✅ Nodos de LandingPaquetes verificados/insertados.');

    } catch (err) {
        console.error('❌ Error al crear la tabla site_nodes:', err);
    } finally {
        client.release();
        process.exit();
    }
}

setupSiteNodes();

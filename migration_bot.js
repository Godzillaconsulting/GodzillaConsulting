import pool from './server/config/db.js';

async function migrate() {
    try {
        console.log("Creando tabla bot_configs...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bot_configs (
                plataforma VARCHAR(50) PRIMARY KEY,
                keywords TEXT,
                comment_template TEXT,
                dm_system_prompt TEXT
            );
        `);
        console.log("Tabla bot_configs verificada/creada.");

        // Insertar valores default si no existen
        await pool.query(`
            INSERT INTO bot_configs (plataforma, keywords, comment_template, dm_system_prompt)
            VALUES 
            ('tiktok', 'tecnologia, info', '¡Hola! Te invitamos a ver la información exclusiva. Mándanos un DM por aquí con la palabra "TECNOLOGIA" y nuestro bot te atenderá enseguida. 🚀', ''),
            ('instagram', 'tecnologia, info, precio', '¡Hola! Te hemos enviado un de las opciones a tus DMs automáticos.', ''),
            ('facebook', 'info', '¡Hola! Te enviamos info por Messenger.', '')
            ON CONFLICT (plataforma) DO NOTHING;
        `);
        console.log("Valores defecto insertados.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
migrate();

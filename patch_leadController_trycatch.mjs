import fs from 'fs';
const file = 'server/controllers/leadController.js';
let c = fs.readFileSync(file, 'utf8');

const regex = /\/\/ 5\. Registrar la descarga \(insertamos temporalmente sin lead_magnet_id\)[\s\S]*?const downloadId = downloadResult\.rows\[0\]\.id;/;

const replacement = `        // 5. Registrar la descarga y obtener ID (try/catch para no romper si no existe tabla 'downloads')
        let downloadId = null;
        try {
            const downloadResult = await client.query(
                "INSERT INTO downloads (user_id, sent) VALUES ($1, false) RETURNING id",
                [userId]
            );
            downloadId = downloadResult.rows[0].id;
        } catch (e) {
            console.error("Warning: no se pudo registrar en downloads table:", e.message);
        }`;

c = c.replace(regex, replacement);

const regex2 = /\/\/ 7\. Si fue exitoso, marcamos como enviado\s*await client\.query\("UPDATE downloads SET sent = true WHERE id = \$1", \[downloadId\]\);/;
const replacement2 = `            // 7. Si fue exitoso, marcamos como enviado
            if (downloadId) {
                await client.query("UPDATE downloads SET sent = true WHERE id = $1", [downloadId]);
            }`;

c = c.replace(regex2, replacement2);

fs.writeFileSync(file, c);
console.log("leadController.js patched with try-catch successfully!");

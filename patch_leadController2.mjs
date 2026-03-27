import fs from 'fs';
const file = 'server/controllers/leadController.js';
let c = fs.readFileSync(file, 'utf8');

const regex = /\/\/\s*3\. Buscar el Lead Magnet solicitado[\s\S]*?UPDATE downloads SET sent = true WHERE id = \$1', \[downloadId\]\);\s*\n\s*\/\/ 8\. Agregar a subscribers/;

const replacement = `        // 3. Buscar la configuración del Recurso en la página (site_nodes)
        const nodeResult = await client.query("SELECT published_data FROM site_nodes WHERE id = $1", ["recursos"]);
        
        if (nodeResult.rows.length === 0 || !nodeResult.rows[0].published_data) {
            throw new Error("La sección de recursos no está configurada o publicada.");
        }

        const data = nodeResult.rows[0].published_data;
        const emailSubject = data[\`\${slug}EmailSubject\`];
        const emailBody = data[\`\${slug}EmailBody\`];
        const fileUrl = data[\`\${slug}FileUrl\`];

        if (!emailSubject || !emailBody || !fileUrl) {
            throw new Error("El correo de este recurso no se ha configurado completo en Godzilla Studio -> Recursos -> 💌 Correos.");
        }

        // 5. Registrar la descarga y obtener ID (try/catch para tracking)
        let downloadId = null;
        try {
            const downloadResult = await client.query(
                "INSERT INTO downloads (user_id, sent) VALUES ($1, false) RETURNING id",
                [userId]
            );
            downloadId = downloadResult.rows[0].id;
        } catch (e) {
            console.error("Warning: tracking downloads failed:", e.message);
        }

        // 6. ENVIAR CORREO usando la plantilla profesional dinámica
        const emailSuccess = await sendLeadMagnetEmail({
            to: email,
            subject: emailSubject,
            body: emailBody,
            fileUrl: fileUrl
        });

        if (emailSuccess) {
            // 7. Si fue exitoso, marcamos como enviado
            if (downloadId) {
                await client.query("UPDATE downloads SET sent = true WHERE id = $1", [downloadId]);
            }

            // 8. Agregar a subscribers`;

c = c.replace(regex, replacement);
fs.writeFileSync(file, c);
console.log("leadController.js patched accurately!");

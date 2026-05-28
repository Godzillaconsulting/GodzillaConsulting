import pool from '../server/config/db.js';

async function main() {
    try {
        const mediaPayload = [
            {
                voice: "elevenlabs:pNInz6obbfIdGwnf8p5A",
                scenes: [
                    {
                        visual: "mexican football team historical photo",
                        narration: "En el mundial de mil novecientos ochenta y seis, México vibró con el gran gol de Hugo Sánchez contra Bélgica."
                    },
                    {
                        visual: "estadio azteca crowded fans celebrating",
                        narration: "El majestuoso Estadio Azteca se convirtió en un templo de pasión, con miles de gargantas gritando México."
                    },
                    {
                        visual: "mexican flag waving in football stadium",
                        narration: "Aquel equipo demostró garra, juego colectivo y un espíritu inquebrantable que quedó grabado para siempre."
                    }
                ],
                script: "En el mundial de mil novecientos ochenta y seis, México vibró con el gran gol de Hugo Sánchez contra Bélgica. El majestuoso Estadio Azteca se convirtió en un templo de pasión, con miles de gargantas gritando México. Aquel equipo demostró garra, juego colectivo y un espíritu inquebrantable que quedó grabado para siempre."
            }
        ];

        const res = await pool.query(
            `INSERT INTO studio_tasks (title, prompt, assigned_to, priority, status, content_type, media_payload, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING id`,
            [
                'Selección Mexicana 1986 - Test',
                'El histórico Mundial de México 1986 y la garra de la selección mexicana.',
                'auto',
                'High',
                'pending_render',
                'video',
                JSON.stringify(mediaPayload)
            ]
        );

        console.log(`✅ Test Task successfully created with ID: ${res.rows[0].id}`);
    } catch (err) {
        console.error('Error inserting test task:', err);
    }
    process.exit(0);
}
main();

import pool from '../server/config/db.js';
import fs from 'fs';
import path from 'path';

async function main() {
    try {
        const jsonPath = path.resolve('scratch/extracted_tasks.json');
        if (!fs.existsSync(jsonPath)) {
            console.error('scratch/extracted_tasks.json not found!');
            process.exit(1);
        }

        const rawData = fs.readFileSync(jsonPath, 'utf8');
        const tasks = JSON.parse(rawData);
        console.log(`📂 Read ${tasks.length} tasks from extracted JSON.`);

        // Delete any existing calendar tasks from days 1 to 8 if they exist to avoid duplicates
        // Calendar tasks titles start with "Día 1:", "Día 2:", etc.
        const titlesToDelete = tasks.map(t => t.title);
        console.log('🗑️ Cleaning up any existing tasks with matching titles...');
        await pool.query('DELETE FROM studio_tasks WHERE title = ANY($1)', [titlesToDelete]);

        let insertedCount = 0;
        for (const task of tasks) {
            const mediaPayload = {
                voice: 'elevenlabs:y2ijeTfmnXjzheHO6zeN', // Jose narrator voice
                sceneCount: 5,
                scenes: task.scenes
            };

            const tags = ['B2B', 'Marketing', 'Faceless', `Día ${task.day_number}`];

            const res = await pool.query(
                `INSERT INTO studio_tasks (title, prompt, status, content_type, assigned_to, tags, priority, media_payload, created_by) 
                 VALUES ($1, $2, 'pending_render_docker', 'video', 'auto', $3::jsonb, 'alta', $4, 'manual') 
                 RETURNING id, title, status`,
                [
                    task.title,
                    task.prompt,
                    JSON.stringify(tags),
                    JSON.stringify(mediaPayload)
                ]
            );

            console.log(`✅ Inserted Task ID #${res.rows[0].id}: "${res.rows[0].title}" (status: ${res.rows[0].status})`);
            insertedCount++;
        }

        console.log(`🎉 Successfully inserted ${insertedCount} tasks into database.`);
    } catch (err) {
        console.error('❌ Error during task insertion:', err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

main();

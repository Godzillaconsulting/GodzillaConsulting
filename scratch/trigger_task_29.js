import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });
import pool from '../server/config/db.js';

async function update() {
    try {
        console.log("Fetching current task 29...");
        const res = await pool.query("SELECT * FROM studio_tasks WHERE id = 29");
        if (res.rowCount === 0) {
            throw new Error("Task 29 not found in DB.");
        }
        
        const task = res.rows[0];
        let payload = typeof task.media_payload === 'string' ? JSON.parse(task.media_payload) : task.media_payload;
        if (Array.isArray(payload) && payload.length > 0) {
            payload = payload[0];
        }
        
        // Update scenes with reference images
        payload.scenes["REF_IMAGE ESCENA 1"] = "c:/Users/GODZILLA.IA/GodzillaConsulting/outputs/task_29_real_scene_1.jpg";
        payload.scenes["REF_IMAGE ESCENA 2"] = "c:/Users/GODZILLA.IA/GodzillaConsulting/outputs/task_29_real_scene_2.jpg";
        payload.scenes["REF_IMAGE ESCENA 3"] = "c:/Users/GODZILLA.IA/GodzillaConsulting/outputs/task_29_real_scene_3.jpg";
        payload.scenes["REF_IMAGE ESCENA 4"] = "c:/Users/GODZILLA.IA/GodzillaConsulting/outputs/task_29_real_scene_4.jpg";
        payload.scenes["REF_IMAGE ESCENA 5"] = "c:/Users/GODZILLA.IA/GodzillaConsulting/outputs/task_29_real_scene_5.jpg";
        
        // Clean up previous temp assets and video files for task 29 so we get a fresh build
        const OUTPUT_DIR = 'c:/Users/GODZILLA.IA/GodzillaConsulting/outputs';
        const files = fs.readdirSync(OUTPUT_DIR);
        for (const file of files) {
            if (file.startsWith('task_29_') && !file.includes('real_scene')) {
                const filePath = path.join(OUTPUT_DIR, file);
                try {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted cached task 29 asset: ${file}`);
                } catch(e) {}
            }
        }
        
        console.log("Updating database entry for task 29...");
        await pool.query(
            "UPDATE studio_tasks SET media_payload = $1, status = 'pending_render', updated_at = NOW() WHERE id = 29",
            [JSON.stringify([payload])]
        );
        console.log("✅ Task 29 updated successfully and queued for rendering!");
    } catch (e) {
        console.error("FAIL:", e.message);
    } finally {
        process.exit(0);
    }
}

update();

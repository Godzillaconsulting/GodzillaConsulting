import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function run() {
        fs.writeFileSync('test_video.mp4', 'Fake video binary content metadata filler filler filler filler.');
        const form = new FormData();
        form.append('file', fs.createReadStream('test_video.mp4'));

        const token = jwt.sign(
            { id: 1, username: 'JareG', role: 'superadmin' },
            process.env.JWT_SECRET || 'Godzilla_Secret_Key_2026_!@#',
            { expiresIn: '365d' }
        );

        console.log("Token:", token.substring(0, 20) + "...");
    
        const res = await fetch('https://godzillaconsulting.ai/api/media/upload-video', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: form
        });
        
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Body:", text);
    } catch(e) {
        console.error("Test error:", e);
    }
}
run();

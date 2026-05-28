import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';

// Load environmental variables from server/.env
dotenv.config({ path: path.resolve('server', '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'Godzilla_Secret_Key_2026_!@#';
const port = process.env.PORT || 3000;

console.log('Generating JWT with secret:', JWT_SECRET.substring(0, 5) + '...');

const token = jwt.sign(
    { 
        id: 1, 
        username: 'jareg',
        role: 'admin'
    },
    JWT_SECRET,
    { expiresIn: '1h' }
);

async function restartWorker() {
    try {
        const url = `http://127.0.0.1:${port}/api/automation/restart`;
        console.log(`Sending request to: ${url}`);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' // Avoid suspicious bot block
            },
            body: JSON.stringify({ processName: 'ai-core' })
        });
        
        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Body:', data);
    } catch (err) {
        console.error('Error restarting worker:', err);
    }
}

restartWorker();

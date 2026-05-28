import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';

// Load environmental variables from server/.env
dotenv.config({ path: path.resolve('server', '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'Godzilla_Secret_Key_2026_!@#';
const port = process.env.PORT || 3000;

const token = jwt.sign(
    { 
        id: 1, 
        username: 'jareg',
        role: 'admin'
    },
    JWT_SECRET,
    { expiresIn: '1h' }
);

async function checkStatus() {
    try {
        const url = `http://127.0.0.1:${port}/api/automation/status`;
        console.log(`Querying: ${url}`);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        
        const data = await response.json();
        console.log('PM2 Process List:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error querying PM2 status:', err);
    }
    process.exit(0);
}

checkStatus();

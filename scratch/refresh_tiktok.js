import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '../server/.env' });

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.TIKTOK_REFRESH_TOKEN;
const ENV_PATH = path.resolve('../server/.env');

async function run() {
    try {
        const body = new URLSearchParams({
            client_key: CLIENT_KEY,
            client_secret: CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: REFRESH_TOKEN
        });

        const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
            body: body.toString()
        });
        
        const data = await tokenRes.json();
        if (data.error) throw new Error(data.error_description || data.error);
        
        console.log('SUCCESS! Got new tokens from TikTok');
        
        if (data.access_token) {
            let envContent = fs.readFileSync(ENV_PATH, 'utf8');
            const update = (key, value) => {
                if (envContent.includes(`${key}=`)) {
                    envContent = envContent.replace(new RegExp(`${key}=.*`), `${key}=${value}`);
                } else {
                    envContent += `\n${key}=${value}`;
                }
            };
            update('TIKTOK_ACCESS_TOKEN', data.access_token);
            if(data.refresh_token) update('TIKTOK_REFRESH_TOKEN', data.refresh_token);
            fs.writeFileSync(ENV_PATH, envContent);
            console.log("Tokens guardados correctamente en server/.env");
        }
    } catch(e) {
        console.error("Failed to refresh token:", e);
    }
}
run();

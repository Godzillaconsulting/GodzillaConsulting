import dotenv from 'dotenv';
import url from 'url';
import path from 'path';
import jwt from 'jsonwebtoken';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

function generateKlingAuthToken() {
    const accessKey = process.env.KLING_ACCESS_KEY;
    const secretKey = process.env.KLING_SECRET_KEY;
    const payload = {
        iss: accessKey,
        exp: Math.floor(Date.now() / 1000) + (1800),
        nbf: Math.floor(Date.now() / 1000) - 5
    };
    return jwt.sign(payload, secretKey, { algorithm: 'HS256' });
}

async function test() {
  console.log("Testing Kling Image API...");
  try {
    const token = generateKlingAuthToken();
    const reqBody = {
        model: "kling-v1.5",
        prompt: "A beautiful cinematic shot of Cheems looking at Godzilla",
        ratio: "16:9",
        duration: "5"
    };
    const res = await fetch('https://api.klingai.com/v1/videos/text2video', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reqBody)
    });
    const data = await res.json();
    console.log("Response:", data);
  } catch (err) {
    console.error("Exception:", err);
  }
}
test();

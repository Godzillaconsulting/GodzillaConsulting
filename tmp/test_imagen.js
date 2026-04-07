import dotenv from 'dotenv';
import url from 'url';
import path from 'path';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function test() {
  console.log("Testing Google Imagen API with Key:", GEMINI_API_KEY ? "EXISTS" : "MISSING");
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages?key=${GEMINI_API_KEY}`;
  
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt: "A funny cat" }],
        parameters: { sampleCount: 1 }
      })
    });
    
    const dataText = await res.text();
    console.log("Status:", res.status);
    console.log("Raw Response Body:", dataText);
    if (res.ok) {
        console.log("Success! Raw output length:", dataText.length);
    } else {
        console.error("Failed.");
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}
test();

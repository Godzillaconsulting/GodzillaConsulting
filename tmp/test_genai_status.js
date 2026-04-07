import dotenv from 'dotenv';
import url from 'url';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testStatus() {
  try {
    const operationName = 'models/veo-3.1-fast-generate-preview/operations/r6f039ahugll';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${process.env.GEMINI_API_KEY}`);
    const op = await res.json();
    console.log("Status:", op.done ? "DONE" : "PENDING");
    if (op.done && op.response && op.response.generatedVideos) {
        console.log("Video URL/data structure:", op.response.generatedVideos[0]);
    } else if (op.done) {
        console.log("Done without videos array:", Object.keys(op));
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}
testStatus();

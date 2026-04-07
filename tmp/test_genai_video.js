import dotenv from 'dotenv';
import url from 'url';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  console.log("Testing Google Veo 3.1 with @google/genai!");
  try {
    const operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: 'A tiny cute robot driving a mini monster truck',
        config: {
            numberOfVideos: 1,
            aspectRatio: '16:9'
        }
    });

    console.log("Success! Operation returned:", Object.keys(operation));
    console.log("Operation name:", operation.name);
    console.log("Operation metadata:", operation.metadata);
  } catch (err) {
    console.error("Exception:", err);
  }
}
test();

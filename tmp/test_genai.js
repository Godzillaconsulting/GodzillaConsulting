import dotenv from 'dotenv';
import url from 'url';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { apiVersion: 'v1alpha' } });

async function test() {
  console.log("Testing Google Imagen 3 with @google/genai!");
  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-fast-generate-001',
        prompt: 'A tiny cute robot driving a mini monster truck',
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '16:9'
        }
    });

    for (const image of response.generatedImages) {
        console.log("Success! Image Output (base64 snippet):", image.image.imageBytes.substring(0, 50));
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}
test();

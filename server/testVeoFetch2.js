import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();
async function run() {
    const name = 'models/veo-2.0-generate-001/operations/5n77dpnfi323';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1alpha/${name}?key=${process.env.GEMINI_API_KEY}`);
    const data = await res.json();
    console.log(data.response.generateVideoResponse.generatedSamples[0].video.uri);
}
run();

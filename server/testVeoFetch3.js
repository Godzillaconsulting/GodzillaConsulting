import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();
async function run() {
    const name = 'models/veo-2.0-generate-001/operations/5n77dpnfi323';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1alpha/${name}?key=${process.env.GEMINI_API_KEY}`);
    const data = await res.json();
    const videoUri = data.response.generateVideoResponse.generatedSamples[0].video.uri;
    const authUri = videoUri + (videoUri.includes('?') ? '&' : '?') + 'key=' + process.env.GEMINI_API_KEY;
    const downloadRes = await fetch(authUri);
    const buffer = await downloadRes.arrayBuffer();
    fs.writeFileSync('test_veo_output.mp4', Buffer.from(buffer));
    console.log('Saved to test_veo_output.mp4');
}
run();

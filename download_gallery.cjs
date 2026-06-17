const fs = require('fs');
const https = require('https');
const path = require('path');

const prompts = [
    'Epic aerial planet view from space, milky way background, Unreal Engine 5, volumetric clouds, 8k',
    'Commercial macro product shot, f/2.8 aperture, soft studio lighting, blurred bokeh background, ultra detailed label',
    'Aerial drone shot over icy mountains at golden hour, volumetric rays, unreal engine, national geographic style',
    'Studio portrait editorial fashion, contrasty rim lighting, film grain, Hasselblad camera, fashion magazine cover',
    'Majestic mountain landscape, 35mm analog film photography, natural golden hour, highly textured raw photo',
    'Futuristic cyberspace holographic interface, neon data streams, blue tones, dark environment, matrix style',
    'Macro shot of a glowing neon jellyfish in deep dark ocean, bioluminescence, highly detailed, national geographic 8k',
    'Mystical dark forest with glowing mystical mushrooms, ethereal blue fog, cinematic fantasy concept art, highly detailed',
    'Cinematic shot of a neon glowing samurai standing in a rainy tokyo street, cyberpunk aesthetic, 8k resolution',
    'Ultra realistic macro shot of an eye with a galaxy reflecting in the pupil, cosmic lighting, 8k',
    'A massive floating sci-fi city above the clouds, god rays, epic scale, concept art',
    'Neon signs reflected in a puddle, dark rainy night, cinematic lighting, 35mm lens'
];

async function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 200) {
                res.pipe(fs.createWriteStream(filepath))
                   .on('error', reject)
                   .once('close', () => resolve(filepath));
            } else {
                res.resume();
                reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));
            }
        }).on('error', reject);
    });
}

async function main() {
    const dir = path.join(__dirname, 'public', 'gallery');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    for (let i = 0; i < prompts.length; i++) {
        const p = prompts[i];
        const safePrompt = encodeURIComponent(p);
        const url = `https://image.pollinations.ai/prompt/${safePrompt}?width=800&height=450&nologo=true&seed=8456${i}`;
        const filepath = path.join(dir, `gal_${i}.jpg`);
        console.log(`Downloading ${i}...`);
        try {
            await downloadImage(url, filepath);
            console.log(`Saved ${filepath}`);
        } catch (e) {
            console.error(`Error downloading ${i}:`, e);
        }
    }
}

main();

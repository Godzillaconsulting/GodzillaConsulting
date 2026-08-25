import fetch from 'node-fetch';

async function testBackends() {
    const prompt = 'NVIDIA supercomputer chip inside autonomous robotaxi vehicle, photorealistic, TIME magazine photography, dramatic lighting, high detail, no text';

    // 1. Pollinations POST
    try {
        console.log('1. Testing Pollinations POST...');
        const res = await fetch('https://image.pollinations.ai/prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: prompt,
                width: 1080,
                height: 1350,
                nologo: true,
                model: 'flux'
            })
        });
        console.log('Pollinations POST status:', res.status);
        if (res.ok) {
            const buf = await res.arrayBuffer();
            console.log('✅ Pollinations POST success! Size:', buf.byteLength);
            return;
        }
    } catch(e) {
        console.log('Pollinations POST error:', e.message);
    }

    // 2. Pollinations gen.pollinations.ai
    try {
        console.log('2. Testing gen.pollinations.ai...');
        const res = await fetch(`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?width=1080&height=1350`);
        console.log('gen.pollinations status:', res.status);
        if (res.ok) {
            const buf = await res.arrayBuffer();
            console.log('✅ gen.pollinations success! Size:', buf.byteLength);
            return;
        }
    } catch(e) {
        console.log('gen.pollinations error:', e.message);
    }

    // 3. Hugging Face free Flux / SD XL
    try {
        console.log('3. Testing Hugging Face free SDXL/Flux...');
        const res = await fetch('https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputs: prompt })
        });
        console.log('HF SDXL status:', res.status);
        if (res.ok) {
            const buf = await res.arrayBuffer();
            console.log('✅ HF SDXL success! Size:', buf.byteLength);
            return;
        }
    } catch(e) {
        console.log('HF error:', e.message);
    }

    // 4. Craiyon / Alternative Free AI Image generator
    try {
        console.log('4. Testing Craiyon / Alternative API...');
        const res = await fetch('https://backend.craiyon.com/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt })
        });
        console.log('Craiyon status:', res.status);
    } catch(e) {
        console.log('Craiyon error:', e.message);
    }
}

testBackends();

const fetch = require('node-fetch');

async function testCerebras() {
    const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer csk-4hxhpdwf456pxy5555dr6459jfeve2249trwprwjrf8vtx6y`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: "llama-3.3-70b",
            messages: [{role: "user", content: "Hi"}]
        })
    });
    console.log("Cerebras (llama-3.3-70b):", res.status);
    if (!res.ok) console.log(await res.text());
}

async function testSambaNova() {
    const res = await fetch('https://api.sambanova.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer 0ace2f14-a16d-49c1-bfb4-f43081cbfd74`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: "Meta-Llama-3.3-70B-Instruct",
            messages: [{role: "user", content: "Hi"}]
        })
    });
    console.log("SambaNova (Meta-Llama-3.3-70B-Instruct):", res.status);
    if (!res.ok) console.log(await res.text());
}

async function testGemini() {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    try {
        const genAI = new GoogleGenerativeAI("AIzaSyCP_fXiiBLMzXKM1p_HkdchdaQtElfN38Q");
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent("Hi");
        console.log("Gemini 2.0 Flash:", result.response.text());
    } catch (e) {
        console.log("Gemini Error:", e.message);
    }
}

async function run() {
    await testCerebras();
    await testSambaNova();
    await testGemini();
}

run();

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { EdgeTTS } from 'node-edge-tts';

// ────────────────────────────────────────────────────────────────────
// CATÁLOGO DE VOCES VIRALES DE FAKEYOU (tokens verificados)
// ────────────────────────────────────────────────────────────────────
export const FAKEYOU_CATALOG = {
    // 🌍 Español LATAM
    'fakeyou:adal-ramones':    'weight_vkvw3rzq08ryv821b6kv6qy0n',
    'fakeyou:alucard-latino':  'weight_gkgwd93dpw98tqas7r4ncj0cf',
    'fakeyou:ballas-gta':      'weight_a89ycjxtvyqgwq795b609cbz7',
    // 🇺🇸 Inglés — Los más virales en TikTok/YouTube
    'fakeyou:morgan-freeman':  null,  // se busca dinámicamente
    'fakeyou:darth-vader':     null,
    'fakeyou:spongebob':       'weight_6y87xbjmqjxbf49ad880590kw',
    'fakeyou:andrew-tate':     'weight_8p7s8cgxx0mytghejq53d81rk',
    'fakeyou:alan-watts':      'weight_49nbs7ya847f5z8dafss89pk6',
    'fakeyou:david-attenborough': null,
};

// Busca un token de FakeYou por nombre si no está hardcodeado
export async function lookupFakeYouToken(searchName) {
    try {
        const res = await fetch('https://api.fakeyou.com/tts/list', {
            headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) return null;
        const data = await res.json();
        const match = data.models?.find(m =>
            m.title.toLowerCase().includes(searchName.toLowerCase())
        );
        return match?.model_token || null;
    } catch { return null; }
}

// ────────────────────────────────────────────────────────────────────
// GENERADOR DE VOZ — CASCADA
// voice formato: 'fakeyou:key' | 'piper:model' | 'bark:model' | 'xtts:model' | 'edge:voice'
// ────────────────────────────────────────────────────────────────────
export async function generateVoice(text, outputPath, voiceParam = 'edge:es-MX-JorgeNeural', referenceAudio = null) {
    console.log(`[TTS Service] Generando "${voiceParam}" para: "${text.substring(0, 40)}..."`);

    const [provider, ...rest] = voiceParam.split(':');
    const voiceId = rest.join(':');

    // ── 1. FAKEYOU (Gratis, voces virales / celebridades) ──────────────
    if (provider === 'fakeyou') {
        try {
            let token = FAKEYOU_CATALOG[voiceParam];
            if (!token) token = await lookupFakeYouToken(voiceId.replace(/-/g, ' '));
            if (!token) throw new Error(`Token de FakeYou no encontrado para: ${voiceId}`);

            console.log(`[TTS Service] 🎭 FakeYou token: ${token}`);
            const inferRes = await fetch('https://api.fakeyou.com/tts/inference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    tts_model_token: token,
                    uuid_idempotency_token: `godzilla_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                    inference_text: text
                })
            });
            if (!inferRes.ok) throw new Error(`FakeYou inference HTTP ${inferRes.status}`);
            const inferData = await inferRes.json();
            if (!inferData.success) throw new Error('FakeYou rechazó la inferencia');

            const jobToken = inferData.inference_job_token;
            let audioPath = null;
            for (let i = 0; i < 25; i++) {
                await new Promise(r => setTimeout(r, 3000));
                const st = await fetch(`https://api.fakeyou.com/tts/job/${jobToken}`);
                const sd = await st.json();
                if (sd.state?.status === 'complete_success') { audioPath = sd.state.maybe_public_bucket_wav_audio_path; break; }
                if (sd.state?.status === 'complete_failure') throw new Error('FakeYou falló el render');
            }
            if (!audioPath) throw new Error('FakeYou timeout (>75s)');

            const audioRes = await fetch(`https://storage.googleapis.com/vocodes-public${audioPath}`);
            if (!audioRes.ok) throw new Error('No se pudo descargar audio de FakeYou');
            fs.writeFileSync(outputPath, Buffer.from(await audioRes.arrayBuffer()));
            console.log(`[TTS Service] ✅ FakeYou TTS listo.`);
            return outputPath;
        } catch (e) {
            console.warn(`[TTS Service] ⚠️ FakeYou falló (${e.message}). Pasando a siguiente...`);
        }
    }

    // ── 2. PIPER TTS (Local, Rápido) ───────────────────────────────────
    if (provider === 'piper') {
        try {
            const { exec } = await import('child_process');
            const util = await import('util');
            const execPromise = util.promisify(exec);
            const modelName = voiceId || 'es_MX-ald-medium';
            const piperDir = path.join(process.cwd(), 'server', 'bin', 'piper');
            const piperExe = path.join(piperDir, 'piper.exe');
            const modelPath = path.join(piperDir, `${modelName}.onnx`);
            
            if (!fs.existsSync(piperExe) || !fs.existsSync(modelPath)) {
                throw new Error(`Piper o modelo ${modelName} no instalados en ${piperDir}`);
            }

            // Sanitizar texto para la línea de comandos
            const safeText = text.replace(/"/g, '\\"').replace(/\n/g, ' ');
            const cmd = `echo "${safeText}" | "${piperExe}" --model "${modelPath}" --output_file "${outputPath}"`;
            
            await execPromise(cmd);
            console.log(`[TTS Service] ✅ Piper TTS listo (${modelName}).`);
            return outputPath;
        } catch (e) {
            console.warn(`[TTS Service] ⚠️ Piper falló (${e.message}). Pasando a siguiente...`);
        }
    }

    // ── 3. BARK (HuggingFace Inference API) ────────────────────────────
    if (provider === 'bark' && process.env.HF_API_KEY) {
        try {
            const barkRes = await fetch('https://api-inference.huggingface.co/models/suno/bark', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${process.env.HF_API_KEY}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    inputs: text,
                    // Algunos modelos de HF Bark permiten especificar voice_preset si están en el payload
                    parameters: { text_temp: 0.7, waveform_temp: 0.7 } 
                })
            });
            
            if (!barkRes.ok) {
                const errJson = await barkRes.json().catch(() => ({}));
                throw new Error(`Bark HTTP ${barkRes.status}: ${errJson.error || 'Unknown'}`);
            }
            
            const audioBuffer = await barkRes.arrayBuffer();
            fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
            console.log(`[TTS Service] ✅ Bark TTS listo.`);
            return outputPath;
        } catch (e) {
            console.warn(`[TTS Service] ⚠️ Bark falló (${e.message}). Pasando a siguiente...`);
        }
    }

    // ── 3.5 XTTS-v2 (HuggingFace Inference API) ───────────────────────
    if (provider === 'xtts' && process.env.HF_API_KEY) {
        try {
            const xttsRes = await fetch('https://api-inference.huggingface.co/models/coqui/XTTS-v2', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${process.env.HF_API_KEY}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    inputs: text,
                    parameters: { language: 'es' }
                })
            });
            
            if (!xttsRes.ok) {
                const errJson = await xttsRes.json().catch(() => ({}));
                throw new Error(`XTTS HTTP ${xttsRes.status}: ${errJson.error || 'Unknown'}`);
            }
            
            const audioBuffer = await xttsRes.arrayBuffer();
            fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
            console.log(`[TTS Service] ✅ XTTS-v2 TTS listo.`);
            return outputPath;
        } catch (e) {
            console.warn(`[TTS Service] ⚠️ XTTS falló (${e.message}). Pasando a siguiente...`);
        }
    }

    // ── 4. ELEVENLABS (si está configurado) ────────────────────────────
    if (process.env.ELEVENLABS_API_KEY) {
        try {
            const elVoiceId = provider === 'elevenlabs' ? voiceId : 'pNInz6obbfIdGwnf8p5A';
            const response = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${elVoiceId}?output_format=mp3_44100_128`,
                {
                    method: 'POST',
                    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' })
                }
            );
            if (response.ok) {
                fs.writeFileSync(outputPath, Buffer.from(await response.arrayBuffer()));
                console.log(`[TTS Service] ✅ ElevenLabs TTS listo.`);
                return outputPath;
            }
            console.warn(`[TTS Service] ⚠️ ElevenLabs HTTP ${response.status}.`);
        } catch (e) {
            console.error(`[TTS Service] ElevenLabs error: ${e.message}`);
        }
    }

    // ── 5. EDGE TTS (Siempre disponible — último recurso garantizado) ──
    console.log(`[TTS Service] 🔊 Edge TTS (fallback final)...`);
    const edgeVoiceName = provider === 'edge' ? voiceId : 'es-MX-JorgeNeural';
    const edgeTts = new EdgeTTS({ voice: edgeVoiceName });
    await edgeTts.ttsPromise(text, outputPath);
    console.log(`[TTS Service] ✅ Edge TTS listo (${edgeVoiceName}).`);
    return outputPath;
}

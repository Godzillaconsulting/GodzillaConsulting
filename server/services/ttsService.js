import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { EdgeTTS } from 'node-edge-tts';

// ────────────────────────────────────────────────────────────────────
// CATÁLOGO COMPLETO DE VOCES DISPONIBLES
// ────────────────────────────────────────────────────────────────────
export const VOICE_CATALOG = [
    // 🎙️ ELEVENLABS — Premium, ultra-realistas
    { id: 'elevenlabs:21m00Tcm4TlvDq8ikWAM', name: 'Rachel (ElevenLabs)', tone: 'Narrador documental', lang: 'ES', provider: 'elevenlabs', premium: true },
    { id: 'elevenlabs:29vD33N1CtxCmqQRPOHJ', name: 'Drew (ElevenLabs)',  tone: 'Masculino energético', lang: 'ES', provider: 'elevenlabs', premium: true },
    { id: 'elevenlabs:D38z5RcWu1voky8WS1ja', name: 'Fin (ElevenLabs)',   tone: 'Joven dinámico', lang: 'ES', provider: 'elevenlabs', premium: true },
    { id: 'elevenlabs:ThT5KcBeYPX3keUQqHPh', name: 'Dorothy (ElevenLabs)', tone: 'Femenino cálido', lang: 'ES', provider: 'elevenlabs', premium: true },

    // 🎭 EDGE TTS — Gratuito, calidad alta, muchos tonos
    // 🇲🇽 México
    { id: 'edge:es-MX-JorgeNeural',    name: 'Jorge (MX)',    tone: 'Narrador neutro masculino', lang: 'MX', provider: 'edge' },
    { id: 'edge:es-MX-DaliaNeural',    name: 'Dalia (MX)',    tone: 'Femenino profesional', lang: 'MX', provider: 'edge' },
    // 🇪🇸 España
    { id: 'edge:es-ES-AlvaroNeural',   name: 'Álvaro (ES)',   tone: 'Masculino autoritario', lang: 'ES', provider: 'edge' },
    { id: 'edge:es-ES-ElviraNeural',   name: 'Elvira (ES)',   tone: 'Femenino elegante', lang: 'ES', provider: 'edge' },
    { id: 'edge:es-ES-AbrilNeural',    name: 'Abril (ES)',    tone: 'Femenino joven vibrante', lang: 'ES', provider: 'edge' },
    { id: 'edge:es-ES-ArnauNeural',    name: 'Arnau (ES)',    tone: 'Masculino joven directo', lang: 'ES', provider: 'edge' },
    { id: 'edge:es-ES-DarioNeural',    name: 'Darío (ES)',    tone: 'Masculino grave dramático', lang: 'ES', provider: 'edge' },
    { id: 'edge:es-ES-EliasNeural',    name: 'Elías (ES)',    tone: 'Narrador misterioso', lang: 'ES', provider: 'edge' },
    { id: 'edge:es-ES-EstrellaNeural', name: 'Estrella (ES)', tone: 'Femenino noticias', lang: 'ES', provider: 'edge' },
    { id: 'edge:es-ES-IreneNeural',    name: 'Irene (ES)',    tone: 'Femenino cálido cercano', lang: 'ES', provider: 'edge' },
    { id: 'edge:es-ES-LaiaNeural',     name: 'Laia (ES)',     tone: 'Femenino suave', lang: 'ES', provider: 'edge' },
    { id: 'edge:es-ES-NilNeural',      name: 'Nil (ES)',      tone: 'Masculino serio', lang: 'ES', provider: 'edge' },
    { id: 'edge:es-ES-SaulNeural',     name: 'Saúl (ES)',     tone: 'Masculino maduro periodista', lang: 'ES', provider: 'edge' },
    { id: 'edge:es-ES-TeoNeural',      name: 'Teo (ES)',      tone: 'Masculino energético joven', lang: 'ES', provider: 'edge' },
    { id: 'edge:es-ES-TrianaNeural',   name: 'Triana (ES)',   tone: 'Femenino andaluz cálido', lang: 'ES', provider: 'edge' },
    { id: 'edge:es-ES-VeraNeural',     name: 'Vera (ES)',     tone: 'Femenino neutro limpio', lang: 'ES', provider: 'edge' },
    // 🇦🇷 Argentina
    { id: 'edge:es-AR-TomasNeural',    name: 'Tomás (AR)',    tone: 'Masculino rioplatense', lang: 'AR', provider: 'edge' },
    { id: 'edge:es-AR-ElenaNeural',    name: 'Elena (AR)',    tone: 'Femenino rioplatense', lang: 'AR', provider: 'edge' },
    // 🇨🇴 Colombia
    { id: 'edge:es-CO-GonzaloNeural',  name: 'Gonzalo (CO)', tone: 'Masculino colombiano cálido', lang: 'CO', provider: 'edge' },
    { id: 'edge:es-CO-SalomeNeural',   name: 'Salomé (CO)',  tone: 'Femenino colombiana', lang: 'CO', provider: 'edge' },
    // 🇲🇽 México adicional
    { id: 'edge:es-MX-BeatrizNeural',  name: 'Beatriz (MX)', tone: 'Femenino maduro serio', lang: 'MX', provider: 'edge' },
    { id: 'edge:es-MX-CandelaNeural',  name: 'Candela (MX)', tone: 'Femenino joven animada', lang: 'MX', provider: 'edge' },
    { id: 'edge:es-MX-CarlotaNeural',  name: 'Carlota (MX)', tone: 'Femenino elegante formal', lang: 'MX', provider: 'edge' },
    { id: 'edge:es-MX-CecilioNeural',  name: 'Cecilio (MX)', tone: 'Masculino grave denso', lang: 'MX', provider: 'edge' },
    { id: 'edge:es-MX-GerardoNeural',  name: 'Gerardo (MX)', tone: 'Masculino energético', lang: 'MX', provider: 'edge' },
    { id: 'edge:es-MX-LarissaNeural',  name: 'Larissa (MX)', tone: 'Femenino dinámico noticias', lang: 'MX', provider: 'edge' },
    { id: 'edge:es-MX-LibertoNeural',  name: 'Liberto (MX)', tone: 'Masculino relajado narrativo', lang: 'MX', provider: 'edge' },
    { id: 'edge:es-MX-LucianoNeural',  name: 'Luciano (MX)', tone: 'Masculino joven fresco', lang: 'MX', provider: 'edge' },
    { id: 'edge:es-MX-MarinaNeural',   name: 'Marina (MX)',  tone: 'Femenino suave storytelling', lang: 'MX', provider: 'edge' },
    { id: 'edge:es-MX-NuriaNeural',    name: 'Nuria (MX)',   tone: 'Femenino formal claro', lang: 'MX', provider: 'edge' },
    { id: 'edge:es-MX-PelayoNeural',   name: 'Pelayo (MX)',  tone: 'Masculino neutro limpio', lang: 'MX', provider: 'edge' },
    { id: 'edge:es-MX-YemisiNeural',   name: 'Yemisi (MX)',  tone: 'Femenino tropical vibrante', lang: 'MX', provider: 'edge' },

    // 🎭 FAKEYOU — Voces virales / celebridades
    { id: 'fakeyou:adal-ramones',   name: 'Adal Ramones', tone: 'Cómico viral Mexico', lang: 'MX', provider: 'fakeyou' },
    { id: 'fakeyou:alucard-latino', name: 'Alucard Latino', tone: 'Villano dramático', lang: 'MX', provider: 'fakeyou' },
];

// ────────────────────────────────────────────────────────────────────
// CATÁLOGO DE VOCES FAKEYOU (tokens verificados)
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

async function generateEdgeTtsSubtitlesOnly(text, outputPath) {
    try {
        const tempSubPath = outputPath + '_temp_edge.mp3';
        const edgeTts = new EdgeTTS({ voice: 'es-MX-JorgeNeural', saveSubtitles: true });
        await edgeTts.ttsPromise(text, tempSubPath);
        const tempJsonPath = tempSubPath + '.json';
        if (fs.existsSync(tempJsonPath)) {
            fs.copyFileSync(tempJsonPath, outputPath + '.json');
            fs.unlinkSync(tempJsonPath);
        }
        if (fs.existsSync(tempSubPath)) {
            fs.unlinkSync(tempSubPath);
        }
        console.log(`[TTS Service] 📝 Subtitle timings generated via Edge TTS for non-edge voice.`);
    } catch (subErr) {
        console.warn(`[TTS Service] ⚠️ Subtitle timings generation failed:`, subErr.message);
    }
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
            await generateEdgeTtsSubtitlesOnly(text, outputPath);
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
            await generateEdgeTtsSubtitlesOnly(text, outputPath);
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
            await generateEdgeTtsSubtitlesOnly(text, outputPath);
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
            await generateEdgeTtsSubtitlesOnly(text, outputPath);
            return outputPath;
        } catch (e) {
            console.warn(`[TTS Service] ⚠️ XTTS falló (${e.message}). Pasando a siguiente...`);
        }
    }

    // ── 4. OPENAI TTS (si está configurado) ───────────────────────────
    if (provider === 'openai' && process.env.OPENAI_API_KEY) {
        try {
            const openaiVoice = voiceId || 'onyx'; // onyx=grave, nova=femenino, echo=medio, alloy=neutro
            const oaiRes = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'tts-1',
                    input: text,
                    voice: openaiVoice,
                    response_format: 'mp3'
                })
            });
            if (oaiRes.ok) {
                fs.writeFileSync(outputPath, Buffer.from(await oaiRes.arrayBuffer()));
                console.log(`[TTS Service] ✅ OpenAI TTS listo (${openaiVoice}).`);
                await generateEdgeTtsSubtitlesOnly(text, outputPath);
                return outputPath;
            }
            throw new Error(`OpenAI TTS HTTP ${oaiRes.status}`);
        } catch (e) {
            console.warn(`[TTS Service] ⚠️ OpenAI TTS falló (${e.message}). Pasando a siguiente...`);
        }
    }

    // ── 5. ELEVENLABS — SOLO si el provider solicitado ES elevenlabs ──────────────
    if (provider === 'elevenlabs' && process.env.ELEVENLABS_API_KEY) {
        try {
            const elVoiceId = voiceId || '21m00Tcm4TlvDq8ikWAM';
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
                await generateEdgeTtsSubtitlesOnly(text, outputPath);
                return outputPath;
            }
            // NO escribir archivo corrupto si falla — cae al Edge TTS
            console.warn(`[TTS Service] ⚠️ ElevenLabs HTTP ${response.status}. Usando Edge TTS.`);
        } catch (e) {
            console.warn(`[TTS Service] ElevenLabs error: ${e.message}. Usando Edge TTS.`);
        }
    }

    // ── 6. EDGE TTS — Voz natural con parámetros de prosodia ──────────────────
    const SAFE_VOICES = ['es-ES-AlvaroNeural', 'es-MX-DaliaNeural', 'es-MX-JorgeNeural'];
    const requestedEdgeVoice = provider === 'edge' ? voiceId : 'es-ES-AlvaroNeural';
    const voicesToTry = [requestedEdgeVoice, ...SAFE_VOICES.filter(v => v !== requestedEdgeVoice)];

    for (const edgeVoiceName of voicesToTry) {
        try {
            console.log(`[TTS Service] 🔊 Edge TTS: ${edgeVoiceName} (rate=-12%, pitch natural)`);
            const edgeTts = new EdgeTTS({ 
                voice: edgeVoiceName, 
                saveSubtitles: true,
                rate: '-12%',       // ligeramente más lento = más humano
                pitch: '+2Hz',      // leve calidez en el tono
                volume: '+0%'
            });
            await edgeTts.ttsPromise(text, outputPath);

            const fileSize = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;
            if (fileSize < 5000) {
                console.warn(`[TTS Service] ⚠️ ${edgeVoiceName} vacío (${fileSize}B). Reintentando...`);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                continue;
            }

            console.log(`[TTS Service] ✅ Edge TTS listo: ${edgeVoiceName} (${(fileSize/1024).toFixed(1)}KB)`);
            return outputPath;
        } catch (e) {
            console.warn(`[TTS Service] ⚠️ ${edgeVoiceName} falló: ${e.message}. Probando siguiente...`);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
    }

    throw new Error('Todas las voces Edge TTS fallaron.');
}

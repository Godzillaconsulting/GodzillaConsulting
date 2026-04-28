import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import https from 'https';

const BIN_DIR = path.join(process.cwd(), 'server', 'bin');
const PIPER_DIR = path.join(BIN_DIR, 'piper');
const PIPER_URL = 'https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_windows_amd64.zip';
const MODEL_URL = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_MX/ald/medium/es_MX-ald-medium.onnx';
const MODEL_JSON_URL = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_MX/ald/medium/es_MX-ald-medium.onnx.json';

// Helper for HTTPS downloads
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

async function setup() {
    console.log('⚡ Iniciando setup de Piper TTS para Windows...');
    
    if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true });
    if (!fs.existsSync(PIPER_DIR)) fs.mkdirSync(PIPER_DIR, { recursive: true });

    const zipPath = path.join(BIN_DIR, 'piper.zip');
    const piperExePath = path.join(PIPER_DIR, 'piper.exe');
    
    if (!fs.existsSync(piperExePath)) {
        console.log('Descargando Piper TTS...');
        await downloadFile(PIPER_URL, zipPath);
        console.log('Extrayendo Piper TTS...');
        // We assume powershell is available on Windows to extract the zip
        execSync(`powershell -command "Expand-Archive -Force '${zipPath}' '${BIN_DIR}'"`);
        fs.unlinkSync(zipPath);
    } else {
        console.log('Piper TTS ya está instalado.');
    }

    const modelName = 'es_MX-ald-medium';
    const modelPath = path.join(PIPER_DIR, `${modelName}.onnx`);
    const modelJsonPath = path.join(PIPER_DIR, `${modelName}.onnx.json`);

    if (!fs.existsSync(modelPath)) {
        console.log(`Descargando modelo neuronal: ${modelName}...`);
        await downloadFile(MODEL_URL, modelPath);
        await downloadFile(MODEL_JSON_URL, modelJsonPath);
    } else {
        console.log(`Modelo ${modelName} ya está instalado.`);
    }

    console.log('✅ Setup completado exitosamente.');
}

setup().catch(console.error);

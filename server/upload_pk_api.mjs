/**
 * Sube GOOGLE_PRIVATE_KEY a Vercel via REST API (sin CLI, sin stdin)
 * Usa el token de autenticación guardado por la CLI de Vercel
 */
import https from 'https';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';

// Llave con newlines REALES
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDF0eqEcarBh/Ni
+56NJWZKW4XLZlmRs4sgjoGZT0+2STEoqiKYlaZlCU/8vQeoORmVML+1LBOIMkjQ
EOScwO8s0txiSsyh8htPaYMnfKsilcfJ65uOUazNsMpmqerFTsTPs1EWN83qOrn2
o5At53lvGIBexaAnBVD/7OWFmw269eYO/p9QZK3fgYjYT1ylwwsvHvps7ZlwH9Tr
UFQ3atPLB2uf7mekmn6t5vxjQ7spnWFnOyhYrpCtuG7U4poYjw+lt0WD2RomGRpr
tbkgSN5HF5K2iIDKDihBTn4bfP+4fnamo28cLaRs753lO/GLgILyyKS088nGh0YE
/jsFFT1JAgMBAAECggEAQ01k5YSqnMd9Ner3iXv07k1vGsGKrbiRGBWD4D4Ml68V
K4me1ZzsjKl7bjh912z92DVKs//38Tlybl+g9/foJ67hzgs2zc5KHl1+gru2mcCt
xXQEa4o8KYsBgaZDurdO3H9ckhuQUiWCyXfigMulE/gZDKVeFIiJg1j8ydTz+ew/
XjhH5GU+WDKEAP5xhtmsxM+F16tr1O8EvgSmDIeyv/PCMvAIVhRF+m4GuwmwCTze
TvxDXigEq6w4CDgfdPKTDtYhOYgTzecqsnc/gmlwM8/uFmXr05J7WfX/iYGmm4iO
4FVZ+7Y3zGzWbNc2q9lnPxOhFGUrAa5bW84GSR5U9QKBgQD46/qmSjMsxlBiuc0t
tn23SwyefyNqnzEZJdyxbDfa5tq+uiTs3yNHI9j0C+GrAG8KzBaq1P1lTi19ig/t
D+edkkrSi6LSOQKakBl8BmUplKdtJBdKprsFT32HbFsCwliFoCDpNZ3I9kW3eYHf
EzqeyKQxCe36tC3dmlsnw5Tn7wKBgQDLcfFEsKrI8ZgoS3bkJEQ3574OL7OGPh8+
9+tXANHqwwKvsOmlr/ogdxN5EIy6HtB+rXuy3Q7/Q+5rpOdqPAKG950VXatdM4my
UpqS/FNX9YuNzr4E7FZCo7o8fCoyLO91LVw0wtdSqssSS3fmL3r1AJTOgiJ8FgrF
hF+zl2u2RwKBgQCQeq+eS10OtQC9fOi5ir3HYLkvWc4duc6OsSo6lPyKgwoeP/7k
udNJHGZ1qFvQnEzXcIQLndqCLXE796Gs0Fl4XQwuzruv10VKny8bjL609sKDF7qp
KsNMnsnWi677mAA3dy0DD4rItSDcEJuv9gJFXWHn0MKfjGs+v7P/DYdlYwKBgAvR
Z6GE3bbkieE1WQexr6DLvneWf8g5jZkbz7jzHD6V628HSNtOGKqQIDp1IqehKJ1j
OH9QZhGgAZaRMrwyFjd+5Mob8dttJf+M2tvU+oZuhhfLvbANholCd4wR7mWRxKs6
4lNSSi3MLBW4+pMNiQf4a6x/VL9+jEui/+gv0Jr7AoGBANcIOnINPIlqfH1JX5hJ
c0g368gu6lQBkkx38N48Tzor3cZtaCqsjiLmD5y8w6Dny8utxNwKMcmoJsEEQ6iT
z5R0y76YYvz4kmkDSVFr2cJWa4SOSipoxmpSjl6B6WUSZbID7qHvAPQfT9myWKOG
j0VhBO4ouZIk7xSngkd81VXm
-----END PRIVATE KEY-----`;

// Buscar el token de la CLI de Vercel
let token = null;
const possiblePaths = [
    path.join(homedir(), 'AppData', 'Roaming', 'com.vercel.cli', 'Data', 'auth.json'),
    path.join(homedir(), 'AppData', 'Local', 'com.vercel.cli', 'auth.json'),
    path.join(homedir(), '.local', 'share', 'com.vercel.cli', 'auth.json'),
];
for (const p of possiblePaths) {
    try {
        const content = JSON.parse(readFileSync(p, 'utf8'));
        token = content.token;
        console.log('✅ Token encontrado en:', p);
        break;
    } catch {}
}

if (!token) {
    console.log('❌ Token no encontrado. Buscando en otras ubicaciones...');
    // Intentar con npx vercel whoami
    const { execSync } = await import('child_process');
    try {
        const res = execSync('npx vercel whoami --token=""', { encoding: 'utf8' });
        console.log('whoami:', res);
    } catch(e) {
        // Leer el directorio de config  
        console.log('Paths buscados:', possiblePaths);
    }
    process.exit(1);
}

// API de Vercel
const PROJECT_ID = 'godzilla-consulting';
const TEAM_ID = 'godzillas-projects-fbcf3811';

function apiRequest(method, path, body) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const req = https.request({
            hostname: 'api.vercel.com',
            path,
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
            }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => { resolve({ status: res.statusCode, body: JSON.parse(data) }); });
        });
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

// 1. Listar env vars para encontrar el ID de GOOGLE_PRIVATE_KEY
console.log('🔍 GET project info...');
const proj = await apiRequest('GET', `/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}`);
console.log('Project ID:', proj.body.id, '| Name:', proj.body.name);
const REAL_PROJECT_ID = proj.body.id || PROJECT_ID;

console.log('\n🔍 Listando env vars...');
const list = await apiRequest('GET', `/v10/projects/${REAL_PROJECT_ID}/env?teamId=${TEAM_ID}`);
const envList = list.body.envs || [];
console.log('Total env vars:', envList.length);
const existingAll = envList.filter(e => e.key === 'GOOGLE_PRIVATE_KEY');
console.log('GOOGLE_PRIVATE_KEY entries:', existingAll.map(e => ({ id: e.id, target: e.target, type: e.type })));

// 2. Eliminar TODOS los existentes
for (const existing of existingAll) {
    const del = await apiRequest('DELETE', `/v10/projects/${REAL_PROJECT_ID}/env/${existing.id}?teamId=${TEAM_ID}`);
    console.log(`🗑️  Eliminado ${existing.id} (${existing.target}): status`, del.status);
}

// 3. Crear nueva
const create = await apiRequest('POST', `/v10/projects/${REAL_PROJECT_ID}/env?teamId=${TEAM_ID}`, {
    key: 'GOOGLE_PRIVATE_KEY',
    value: PRIVATE_KEY,
    type: 'encrypted',
    target: ['production', 'preview', 'development']
});
console.log('\n📤 Create status:', create.status);
console.log('Create body:', JSON.stringify(create.body).substring(0, 300));

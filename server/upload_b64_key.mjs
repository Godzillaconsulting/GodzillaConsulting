// Genera la llave en Base64 y la sube a Vercel via REST API
import https from 'https';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';

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

// Validar localmente
import { createPrivateKey } from 'crypto';
try {
    createPrivateKey(PRIVATE_KEY);
    console.log('✅ Llave válida localmente');
} catch(e) { console.error('❌ Inválida:', e.message); process.exit(1); }

// Convertir a Base64 — una sola línea, sin headers problemáticos
const keyB64 = Buffer.from(PRIVATE_KEY, 'utf8').toString('base64');
console.log('✅ Base64 generado. Longitud:', keyB64.length, 'chars');
console.log('Primeros 20 chars del B64:', keyB64.substring(0, 20));

// Verificar que Base64 se puede revertir correctamente
const decoded = Buffer.from(keyB64, 'base64').toString('utf8');
try {
    createPrivateKey(decoded);
    console.log('✅ Decodificado correcto. Longitud decoded:', decoded.length);
} catch(e) { console.error('❌ Error al decodificar:', e.message); process.exit(1); }

// Obtener token
const authPath = path.join(homedir(), 'AppData', 'Roaming', 'com.vercel.cli', 'Data', 'auth.json');
const token = JSON.parse(readFileSync(authPath, 'utf8')).token;

function apiRequest(method, p, body) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const req = https.request({
            hostname: 'api.vercel.com',
            path: p, method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
            }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

const TEAM_ID = 'godzillas-projects-fbcf3811';
const PROJECT_ID = 'prj_fJD23rqMhSFmb5lXY9k7ET2tlerL';

// Obtener lista de env vars actuales
const list = await apiRequest('GET', `/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`);
const existingAll = (list.body.envs || []).filter(e => e.key === 'GOOGLE_PRIVATE_KEY_B64');

// Eliminar si existe
for (const e of existingAll) {
    await apiRequest('DELETE', `/v10/projects/${PROJECT_ID}/env/${e.id}?teamId=${TEAM_ID}`);
    console.log(`🗑️  Eliminado ${e.key} (${e.id})`);
}

// Crear nueva variable GOOGLE_PRIVATE_KEY_B64
const create = await apiRequest('POST', `/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`, {
    key: 'GOOGLE_PRIVATE_KEY_B64',
    value: keyB64,
    type: 'encrypted',
    target: ['production', 'preview', 'development']
});
console.log('📤 Create status:', create.status);
if (create.body.error) {
    console.error('❌ Error:', create.body.error);
} else {
    console.log('✅ GOOGLE_PRIVATE_KEY_B64 subida a Vercel');
}

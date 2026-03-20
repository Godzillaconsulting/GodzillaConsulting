import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';

// La clave COMPLETA con newlines reales (template literal de JS)
const KEY = `-----BEGIN PRIVATE KEY-----
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

// Verificar la llave localmente
import { createPrivateKey } from 'crypto';
try {
    createPrivateKey(KEY);
    console.log('✅ Llave válida. Longitud:', KEY.length, 'chars');
    console.log('Primeros 30:', JSON.stringify(KEY.substring(0, 30)));
} catch(e) {
    console.error('❌ Llave inválida:', e.message);
    process.exit(1);
}

// Escribir el archivo con solo LF (sin BOM, sin CRLF)
const tempFile = 'C:/tmp/pk_clean.txt';
writeFileSync(tempFile, KEY, { encoding: 'utf8' });
console.log('\n📝 Archivo escrito:', tempFile);

// Eliminar la variable existente y re-agregar
const cwd = 'C:\\Users\\GODZILLA.IA\\GodzillaConsulting';
try {
    execSync('npx vercel env rm GOOGLE_PRIVATE_KEY production --yes', { cwd, encoding: 'utf8' });
    console.log('🗑️  Variable eliminada de Vercel');
} catch(e) { console.log('Info rm:', e.message.split('\n')[0]); }

try {
    const out = execSync(
        `npx vercel env add GOOGLE_PRIVATE_KEY production --yes < ${tempFile}`,
        { cwd, encoding: 'utf8', shell: 'cmd.exe' }
    );
    console.log('✅ Variable subida a Vercel:', out.trim());
} catch(e) {
    console.error('❌ Error al subir:', e.stdout, e.stderr);
}

// Limpiar
try { unlinkSync(tempFile); } catch {}
console.log('\n🎯 Ahora ejecuta: npx vercel --prod --yes');

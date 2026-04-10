/**
 * ig_setup.cjs — Setup interactivo del bot de Instagram (CJS, compatible Node v24)
 * 
 * Maneja: 2FA, Checkpoint/verificación de nuevo dispositivo
 * Ejecución: node server/ig_setup.cjs
 */

const readline = require('readline');
const { writeFileSync, mkdirSync, existsSync } = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const { IgApiClient, IgLoginTwoFactorRequiredError, IgCheckpointError } = require('instagram-private-api');

const USERNAME     = process.env.IG_USERNAME;
const PASSWORD     = process.env.IG_PASSWORD;
const SESSION_DIR  = path.join(__dirname, '.wwebjs_auth');
const SESSION_FILE = path.join(SESSION_DIR, 'ig_session.json');

if (!existsSync(SESSION_DIR)) mkdirSync(SESSION_DIR, { recursive: true });

function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function setup() {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('  🦖 Godzilla Consulting — Setup Bot de Instagram');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Usuario: @${USERNAME}`);
    console.log('');

    const ig = new IgApiClient();
    ig.state.generateDevice(USERNAME + "fixed_device_v3");
    
    // PATCH para saltar el "unsupported_version" block de Meta
    ig.state.appVersion = '314.0.0.35.109';
    ig.state.appVersionCode = '3140035109';
    console.log('🔧 Aplicando patch de versión Instagram:', ig.state.appVersion);

    // ── Intentar login ───────────────────────────────────────────────────────
    let twoFactorInfo = null;
    try {
        console.log('🔐 Intentando login...');
        await ig.account.login(USERNAME, PASSWORD);
        console.log('✅ Login... haciendo warmup para verificar checkpoint...');
        await ig.account.currentUser();
        console.log('✅ Login directo exitoso (sin 2FA ni checkpoint).\n');
    } catch(err) {

        // ── CASO 1: 2FA requerido ─────────────────────────────────────────────
        if (err instanceof IgLoginTwoFactorRequiredError || err.name === 'IgLoginTwoFactorRequiredError') {
            twoFactorInfo = err.response.body.two_factor_info;
            const method = twoFactorInfo.totp_two_factor_on ? 'Authenticator App' :
                           twoFactorInfo.sms_two_factor_on  ? `SMS a ...${twoFactorInfo.obfuscated_phone_number}` :
                           'Email';
            
            console.log('');
            console.log('🔐 La cuenta tiene 2FA (autenticación de dos factores) activado.');
            console.log(`   Método: ${method}`);
            console.log('');
            
            if (twoFactorInfo.totp_two_factor_on) {
                console.log('   Abre tu app de Authenticator (Google Auth, Authy, etc.)');
                console.log('   y copia el código de 6 dígitos de la cuenta @' + USERNAME);
            } else {
                console.log('   Se enviará el código por: ' + method);
            }
            console.log('');
            
            const code = await ask('   ➤ Ingresa el código 2FA de 6 dígitos: ');
            const twoFactorIdentifier = twoFactorInfo.two_factor_identifier;
            
            try {
                await ig.account.twoFactorLogin({
                    username: USERNAME,
                    verificationCode: code.replace(/\s/g, ''),
                    twoFactorIdentifier,
                    verificationMethod: twoFactorInfo.totp_two_factor_on ? '3' : '1',
                    trustThisDevice: '1',
                });
                console.log('\n✅ 2FA verificado correctamente!\n');
                
                // Warmup: activar sesión haciendo 2 llamadas antes de guardar
                console.log('🔄 Omitiendo warmup por seguridad...');
                // const user = await ig.account.currentUser();
                // console.log('   Usuario verificado:', user.username, '| Seguidores:', user.follower_count);
                // await ig.feed.directInbox().items(); // Activa permisos de DMs
                // console.log('   Bandeja de DMs accesible ✅');
                
            } catch(tfaErr) {
                console.error('\n❌ Error en 2FA:', tfaErr.message);
                process.exit(1);
            }

        // ── CASO 2: Checkpoint (dispositivo nuevo) ────────────────────────────
        } else if (err instanceof IgCheckpointError || err.name === 'IgCheckpointError') {
            console.log('');
            console.log('📱 Instagram detectó nuevo dispositivo. Enviando código de verificación...');
            
            await ig.challenge.auto(true); // true = preferir email
            console.log('📩 Código enviado a tu email o teléfono registrado en Instagram.');
            console.log('');

            const code = await ask('   ➤ Ingresa el código de verificación de 6 dígitos: ');
            try {
                await ig.challenge.sendSecurityCode(code.replace(/\s/g, ''));
                console.log('\n✅ Dispositivo verificado!\n');
            } catch(chkErr) {
                console.error('\n❌ Código incorrecto:', chkErr.message);
                process.exit(1);
            }

        // ── CASO 2b: IgResponseError con checkpoint_required (diferido) ──────────
        } else if (
            err.message?.includes('checkpoint_required') ||
            err.response?.body?.checkpoint_url ||
            err.response?.body?.message === 'checkpoint_required'
        ) {
            console.log('');
            console.log('🚨 Instagram bloqueó el acceso (checkpoint_required).');
            console.log('');

            // Extraer checkpoint URL del body del error
            const checkpointUrl = err.response?.body?.checkpoint_url;
            console.log('   URL del checkpoint:', checkpointUrl || '(no disponible)');
            console.log('');

            // Inyectar el checkpoint en el state para que challenge.auto() pueda usarlo
            if (checkpointUrl) {
                ig.state.checkpoint = err.response.body;
                ig.state.challengeUrl = checkpointUrl;
            }

            try {
                console.log('   Intentando resolver automáticamente...');
                await ig.challenge.auto(true); // true = preferir email
                console.log('📩 Código enviado a tu email o teléfono registrado.');
                console.log('');
                const code = await ask('   ➤ Ingresa el código de 6 dígitos: ');
                await ig.challenge.sendSecurityCode(code.replace(/\s/g, ''));
                console.log('\n✅ Verificación completada!\n');
            } catch(chkErr) {
                console.error('\n❌ Error en challenge:', chkErr.message);
                console.log('');
                console.log('💡 Solución manual requerida:');
                console.log('   1. Abre Instagram en tu CELULAR');
                console.log('   2. Ve a Ajustes → Seguridad → Actividad de inicio de sesión');
                console.log('   3. Busca el intento reciente y presiona "Fui yo"');
                console.log('   4. Espera 2 minutos y ejecuta este script de nuevo');
                if (checkpointUrl) {
                    console.log('');
                    console.log('   O ve directamente a:', 'https://www.instagram.com' + checkpointUrl);
                }
                process.exit(1);
            }

        // ── CASO 3: Error desconocido ─────────────────────────────────────────
        } else {
            console.error('\n❌ Error:', err.name, '—', err.message);
            process.exit(1);
        }
    }

    // ── Guardar sesión en disco ───────────────────────────────────────────────
    try {
        const serialized = await ig.state.serialize();
        delete serialized.constants;
        writeFileSync(SESSION_FILE, JSON.stringify(serialized, null, 2));
        
        console.log('💾 Sesión guardada en:', SESSION_FILE);
        console.log('');
        console.log('✅ SETUP COMPLETADO. Ahora arranca el bot con:');
        console.log('');
        console.log('   pm2 start ecosystem.config.cjs --only godzilla-bot-ig');
        console.log('   pm2 save');
        console.log('');
        console.log('═══════════════════════════════════════════════════');
    } catch(saveErr) {
        console.error('❌ No se pudo guardar la sesión:', saveErr.message);
        process.exit(1);
    }
}

setup().catch(err => {
    console.error('Error fatal:', err.message);
    process.exit(1);
});

import { IgApiClient } from 'instagram-private-api';
import readline from 'readline';
import dotenv from 'dotenv';
import fs from 'fs';
import os from 'os';
import path from 'path';

dotenv.config();

const ig = new IgApiClient();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function loginWith2FA() {
    const username = process.env.IG_USERNAME;
    const password = process.env.IG_PASSWORD;

    if (!username || !password) {
        console.error("❌ Faltan IG_USERNAME o IG_PASSWORD en el archivo .env");
        process.exit(1);
    }

    ig.state.generateDevice(username);

    console.log(`\n🚀 [2FA CLI] Intentando iniciar sesión como @${username}...`);

    try {
        await ig.simulate.preLoginFlow();
        await ig.account.login(username, password);
        
        console.log("✅ Inicio de sesión exitoso sin 2FA. Guardando sesión...");
        await saveSession(username);
        rl.close();

    } catch (e) {
        if (e.name === 'IgLoginTwoFactorRequiredError') {
            console.log("\n🔐 [2FA RQUERIDO] Instagram detectó un nuevo inicio de sesión y pide Autenticación en 2 Pasos.");
            const { two_factor_identifier } = e.response.body.two_factor_info;
            
            // Determinar a dónde se envió el código
            const verificationMethod = e.response.body.two_factor_info.totp_two_factor_on ? 'App Autenticadora' : 'SMS';
            console.log(`📲 Por favor, revisa tu ${verificationMethod} para obtener el código de 6 dígitos.`);
            
            const code = await question("🔢 Ingresa el código 2FA: ");
            
            try {
                console.log("⏳ Verificando código...");
                await ig.account.twoFactorLogin({
                    username,
                    verificationCode: code.trim(),
                    twoFactorIdentifier: two_factor_identifier,
                    verificationMethod: e.response.body.two_factor_info.totp_two_factor_on ? '0' : '1', // 0 = TOTP, 1 = SMS
                    trustThisDevice: '1'
                });
                
                console.log("✅ ¡Código de 2 Pasos verificado correctamente!");
                await saveSession(username);
                rl.close();

            } catch (err) {
                console.error("❌ Falló la verificación 2FA. Código incorrecto o expirado.", err.message);
                rl.close();
            }

        } else if (e.name === 'IgCheckpointError' || e.message.includes('We can send you an email') || e.message.includes('challenge')) {
            console.log("\n⚠️ [BLOQUEO DE SEGURIDAD RED-ALERT] ⚠️");
            console.log("Instagram detectó que estamos iniciando sesión desde una nueva ubicación (tu bot local) y bloqueó el intento temporalmente.");
            console.log("\n📲 PASOS PARA EL USUARIO:");
            console.log("1. Abre la aplicación OFICIAL de Instagram en tu teléfono.");
            console.log("2. Ve a Notificaciones (el corazón corazón) o revisa si te sale un aviso gigante que dice '¿Fuiste tú?'.");
            console.log("3. Da clic en el botón verde/azul que dice: 'FUI YO' o 'Autorizar este dispositivo'.");
            console.log("4. A veces, también te envían un correo a la cuenta vinculada con el botón de Autorizar.");
            console.log("5. UNA VEZ QUE HAYAS HECHO CLIC EN 'FUI YO', presiona ENTER aquí para re-intentar.");
            
            await question("\nPresiona ENTER cuando hayas autorizado en tu celular... ");
            
            console.log("⏳ Re-intentando login mágico...");
            try {
                // Generar otro id
                ig.state.generateDevice(username);
                await ig.simulate.preLoginFlow();
                await ig.account.login(username, password);
                console.log("✅ ¡Inicio de sesión CONCEDIDO! Bypass exitoso.");
                await saveSession(username);
            } catch (err2) {
                console.error("❌ Aún está bloqueado. Por favor, asegúrate de autorizarlo en tu celular o espera unos minutos e interta correr este script otra vez.", err2.message);
            }
            rl.close();
            
        } else {
            console.error("\n❌ Fallo desconocido en el login:", e.message);
            rl.close();
        }
    }
}

async function saveSession(username) {
    process.nextTick(async () => await ig.simulate.postLoginFlow());
    
    const sessionDir = path.join(os.homedir(), '.godzilla-sessions', 'instagram');
    const sessionPath = path.join(sessionDir, `${username}.json`);
    
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }
    
    const stateInfo = await ig.state.serialize();
    delete stateInfo.constants;
    
    fs.writeFileSync(sessionPath, JSON.stringify(stateInfo));
    console.log(`\n💾 Sesión guardada de forma segura en: ${sessionPath}`);
    console.log(`🚀 Ya puedes iniciar el bot con PM2 de forma normal. (Ej. pm2 restart godzilla-instagram)\n`);
}

loginWith2FA();

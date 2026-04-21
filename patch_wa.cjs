const fs = require('fs');

let c = fs.readFileSync('server/whatsappBot.js', 'utf8');

// Eliminar el duplicado si existe
c = c.replace("import { validateBusinessHours } from './utils/businessHours.js';\r\nimport { validateBusinessHours } from './utils/businessHours.js';", "import { validateBusinessHours } from './utils/businessHours.js';");

// Check_availability
const beforeCheck = `                    if (callName === "check_availability") {
                        const { fecha, hora } = callArgs;
                        const dateObj = new Date(\`\${fecha}T\${hora}:00-07:00\`);
                        const isSunday = dateObj.getDay() === 0;
                        const hourInt = parseInt(hora.split(':')[0], 10);
                        const now = new Date();

                        if (dateObj < now) {
                            fRes = { disponible: false, razon: "La fecha solicitada es en el pasado. Solicita una fecha futura." };
                            console.log(\`[WA Guardián] Rechazo: Fecha Pasada para \${fecha} a las \${hora}\`);
                        } else if (isSunday) {
                            fRes = { disponible: false, razon: "Los domingos no laboramos. Por favor solicita otro día." };
                            console.log(\`[WA Guardián] Rechazo: Domingo para \${fecha} a las \${hora}\`);
                        } else if (hourInt < 9 || hourInt >= 19) {
                            fRes = { disponible: false, razon: "Fuera de horario de oficina (9am a 7pm). Por favor solicita otra hora." };
                            console.log(\`[WA Guardián] Rechazo: Fuera de Horario para \${fecha} a las \${hora}\`);
                        } else {`;
const afterCheck = `                    if (callName === "check_availability") {
                        const { fecha, hora } = callArgs;
                        const valErr = validateBusinessHours(fecha, hora);

                        if (valErr) {
                            fRes = { disponible: false, razon: valErr };
                        } else {`;

// Save_appointment (primera parte pre-db)
const beforeSave = `                    } else if (callName === "save_appointment") {
                        try {
                            const { nombre, correo, telefono, servicio, fecha, hora, notas } = callArgs;
                            
                            const dateObj = new Date(\`\${fecha}T\${hora}:00-07:00\`);
                            const isSunday = dateObj.getDay() === 0;
                            const hourInt = parseInt(hora.split(':')[0], 10);
                            const now = new Date();

                            if (dateObj < now) {
                                 console.warn(\`🛑 [Cita Rechazada por Guardián Final]: Fecha pasada \${fecha} \${hora}\`);
                                 fRes = { success: false, error: "Intento de agendar en el pasado. Pide otra fecha/hora a futuro." };
                            } else if (isSunday || hourInt < 9 || hourInt >= 19) {
                                 console.warn(\`🛑 [Cita Rechazada por Guardián Final]: \${fecha} \${hora}\`);
                                 fRes = { success: false, error: "Intento de agendar fuera de horario o en domingo. Pide otra fecha/hora al cliente." };
                            } else {`;
const afterSave = `                    } else if (callName === "save_appointment") {
                        try {
                            const { nombre, correo, telefono, servicio, fecha, hora, notas } = callArgs;
                            
                            const valErr = validateBusinessHours(fecha, hora);

                            if (valErr) {
                                 fRes = { success: false, error: valErr };
                            } else {`;

// Reschedule
const beforeRes = `                            const cita = result.rows[0];
                            const dTest = new Date(\`\${nueva_fecha}T\${nueva_hora}:00-07:00\`);
                            const isSunday = dTest.getDay() === 0;
                            const hourInt = parseInt(nueva_hora.split(':')[0], 10);
                            
                            if (dTest < new Date()) {
                                fRes = { success: false, error: "La nueva fecha es en el pasado." };
                            } else if (isSunday || hourInt < 9 || hourInt >= 19) {
                                fRes = { success: false, error: "El nuevo horario está fuera de horario de oficina o es domingo." };
                            } else {`;
const afterRes = `                            const cita = result.rows[0];
                            const valErr = validateBusinessHours(nueva_fecha, nueva_hora);
                            
                            if (valErr) {
                                fRes = { success: false, error: valErr };
                            } else {`;

// Replace ignoring spaces differences precisely
// A better way is using Regex matching parts without whitespaces being strict
function replaceFlexible(str, regexInput, replacement) {
    const r = new RegExp(regexInput, "gim");
    return str.replace(r, replacement);
}

// Actually let's just do manual matching if possible, otherwise write the file manually using match
// Wait, I can just use your API instead. But since we are here:
let finalCode = c;

finalCode = finalCode.replace(/if \(callName === "check_availability"\) \{[\s\S]*?\} else \{/m, afterCheck);
finalCode = finalCode.replace(/} else if \(callName === "save_appointment"\) \{[\s\S]*?\} else \{/m, afterSave);
finalCode = finalCode.replace(/const cita = result\.rows\[0\];[\s\S]*?\} else \{/m, afterRes);

fs.writeFileSync('server/whatsappBot.js', finalCode);
console.log('WhatsappBot parcheado');

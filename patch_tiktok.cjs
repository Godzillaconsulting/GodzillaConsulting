const fs = require('fs');

let c = fs.readFileSync('server/tiktok_bypass.js', 'utf8');

const importStatement = "import { validateBusinessHours } from './utils/businessHours.js';\n";
if (!c.includes("validateBusinessHours")) {
    c = c.replace(/import { agendarEnGoogleCalendar[\s\S]*?;/, match => match + "\n" + importStatement);
}

const beforeCheck = `                if (callName === "check_availability") {
                    const { fecha, hora } = callArgs;
                    const dateObj = new Date(\`\${fecha}T\${hora}:00-07:00\`);
                    const isSunday = dateObj.getDay() === 0;
                    const hourInt = parseInt(hora.split(':')[0], 10);
                    const now = new Date();

                    if (dateObj < now) {
                        fRes = { disponible: false, razon: "La fecha solicitada es en el pasado. Solicita una fecha futura." };
                    } else if (isSunday) {
                        fRes = { disponible: false, razon: "Los domingos no laboramos. Por favor solicita otro día." };
                    } else if (hourInt < 9 || hourInt >= 19) {
                        fRes = { disponible: false, razon: "Fuera de horario de oficina. Por favor solicita otra hora." };
                    } else {`;
const afterCheck = `                if (callName === "check_availability") {
                    const { fecha, hora } = callArgs;
                    const valErr = validateBusinessHours(fecha, hora);

                    if (valErr) {
                        fRes = { disponible: false, razon: valErr };
                    } else {`;

const beforeSave = `                } else if (callName === "save_appointment") {
                    const { nombre, correo, telefono, servicio, fecha, hora, notas } = callArgs;
                    
                    const dateObj = new Date(\`\${fecha}T\${hora}:00-07:00\`);
                    const isSunday = dateObj.getDay() === 0;
                    const hourInt = parseInt(hora.split(':')[0], 10);
                    const now = new Date();

                    if (dateObj < now || isSunday || hourInt < 9 || hourInt >= 19) {
                        fRes = { success: false, error: "El horario está en el pasado, es domingo, o fuera de oficina." };
                    } else {`;
const afterSave = `                } else if (callName === "save_appointment") {
                    const { nombre, correo, telefono, servicio, fecha, hora, notas } = callArgs;
                    const valErr = validateBusinessHours(fecha, hora);

                    if (valErr) {
                        fRes = { success: false, error: valErr };
                    } else {`;

const beforeRes = `                        const cita = result.rows[0];
                        const dTest = new Date(\`\${nueva_fecha}T\${nueva_hora}:00-07:00\`);
                        if (dTest < new Date() || dTest.getDay() === 0 || parseInt(nueva_hora.split(':')[0], 10) < 9 || parseInt(nueva_hora.split(':')[0], 10) >= 19) {
                            fRes = { success: false, error: "El nuevo horario está fuera de oficina o es pasado." };
                        } else {`;
const afterRes = `                        const cita = result.rows[0];
                        const valErr = validateBusinessHours(nueva_fecha, nueva_hora);
                        if (valErr) {
                            fRes = { success: false, error: valErr };
                        } else {`;

let finalCode = c;
finalCode = finalCode.replace(/if \(callName === "check_availability"\) \{[\s\S]*?\} else \{/m, afterCheck);
finalCode = finalCode.replace(/} else if \(callName === "save_appointment"\) \{[\s\S]*?\} else \{/m, afterSave);
finalCode = finalCode.replace(/const cita = result\.rows\[0\];[\s\S]*?\} else \{/m, afterRes);

fs.writeFileSync('server/tiktok_bypass.js', finalCode);
console.log('TikTok parcheado');

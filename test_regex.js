// Test del AutoSave regex localmente
const txt = 'Soy Carlos Mendoza, correo carlos@barbershop.mx, cel 6561234567, quiero Automatizacion de Bots, fecha 2026-04-01, hora 09:00, notas barberia con 5 estilistas';

const namePatterns = [
    /(?:soy|me llamo|mi nombre es)\s+([A-Za-z][A-Za-z\s]{2,35}?)(?=\s*,|\s*correo|\s*email|\s*cel|\s*tel|\s*quiero|$)/i,
    /(?:nombre[:\s]+)([A-Za-z][A-Za-z\s]{2,35}?)(?=,|\.|$)/i,
];

let nombre = null;
for (const p of namePatterns) {
    const m = txt.match(p);
    if (m) { nombre = m[1].trim(); break; }
}

const emailMatch = txt.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
const phoneMatch = txt.match(/(?:\+?52)?\s?\d{3}[\s\-]?\d{3}[\s\-]?\d{4}/);

console.log('Nombre detectado:', nombre ?? 'NO DETECTADO');
console.log('Email detectado:', emailMatch ? emailMatch[0] : 'NO DETECTADO');
console.log('Phone detectado:', phoneMatch ? phoneMatch[0] : 'NO DETECTADO');
console.log('hasAll:', !!(nombre && emailMatch && phoneMatch));

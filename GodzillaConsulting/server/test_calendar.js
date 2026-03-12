import { agendarEnGoogleCalendar } from './services/calendarService.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    console.log("Testing Calendar...");
    const datosCita = {
        nombre: 'Zilla Tester',
        correo: 'admin@godzillaconsulting.ai',
        telefono: '5551234567',
        servicio: 'Control IA',
        fecha: '2026-03-15',
        hora: '14:00',
        notas: 'Test from backend'
    };
    await agendarEnGoogleCalendar(datosCita);
    process.exit(0);
}

test();

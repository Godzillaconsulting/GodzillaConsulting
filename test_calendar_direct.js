import dotenv from 'dotenv';
dotenv.config();
import { agendarEnGoogleCalendar } from './GodzillaConsulting/server/services/calendarService.js';

async function testCalendar() {
    console.log("Probando inserción en Google Calendar...");
    const datosPrueba = {
        nombre: "Test de Diagnóstico",
        correo: "test@godzillaconsulting.ai",
        telefono: "5551234567",
        servicio: "Diagnóstico Calendar",
        fecha: "2026-03-15",
        hora: "10:00",
        notas: "Prueba técnica para capturar error de API."
    };

    const resultado = await agendarEnGoogleCalendar(datosPrueba);
    if (resultado) {
        console.log("✅ ÉXITO: La cita de prueba se guardó correctamente.");
    } else {
        console.log("❌ FALLO: Revisa los logs de error arriba para ver la razón exacta de Google.");
    }
}

testCalendar();

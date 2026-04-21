export function validateBusinessHours(fecha, hora) {
    if (!fecha || !hora) return "Faltan parámetros de fecha u hora (YYYY-MM-DD, HH:MM). Solicita esos datos al cliente primero.";
    const dateObj = new Date(`${fecha}T${hora}:00-07:00`);
    const now = new Date();

    if (dateObj < now) {
        return "La fecha/hora solicitada es en el pasado. Solicita una fecha y hora futura.";
    }

    const day = dateObj.getDay();
    if (day === 0 || day === 6) { // 0: Domingo, 6: Sábado
        return "Nuestra oficina está cerrada los fines de semana. Solo laboramos de Lunes a Viernes.";
    }

    const hourInt = parseInt(hora.split(':')[0], 10);
    // L-V de 9 a 5 (Se aceptan citas desde 09:00 hasta las 16:59)
    if (hourInt < 9 || hourInt >= 17) {
        return "Fuera de horario de oficina. Nuestro horario es de Lunes a Viernes, de 9:00 AM a 5:00 PM.";
    }

    // Días festivos de USA (Federal Holidays 2026 y 2027)
    const usHolidays = [
        // 2026
        "2026-01-01", // New Year's Day
        "2026-01-19", // MLK Jr. Day
        "2026-02-16", // Washington's Birthday
        "2026-05-25", // Memorial Day
        "2026-06-19", // Juneteenth
        "2026-07-03", // Independence Day (Observed if July 4 is Saturday)
        "2026-07-04", // Independence Day
        "2026-09-07", // Labor Day
        "2026-10-12", // Columbus Day
        "2026-11-11", // Veterans Day
        "2026-11-26", // Thanksgiving Day
        "2026-12-25", // Christmas Day

        // 2027
        "2027-01-01", // New Year's Day
        "2027-01-18", // MLK Jr. Day
        "2027-02-15", // Washington's Birthday
        "2027-05-31", // Memorial Day
        "2027-06-18", // Juneteenth (Observed)
        "2027-06-19", // Juneteenth
        "2027-07-05", // Independence Day (Observed)
        "2027-09-06", // Labor Day
        "2027-10-11", // Columbus Day
        "2027-11-11", // Veterans Day
        "2027-11-25", // Thanksgiving Day
        "2027-12-24", // Christmas Day (Observed)
        "2027-12-25", // Christmas Day
        "2027-12-31"  // New Year's Eve (Observed for 2028)
    ];

    if (usHolidays.includes(fecha)) {
        return "La fecha solicitada es un día festivo oficial en Estados Unidos y nuestra oficina permanecerá cerrada. Por favor sugiere otro día.";
    }

    return null; // Null significa que está dentro del horario y días permitidos
}

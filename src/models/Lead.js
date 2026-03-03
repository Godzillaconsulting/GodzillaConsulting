import mongoose from 'mongoose';

const LeadSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre es obligatorio'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'El correo es obligatorio'],
        unique: true,
        lowercase: true
    },
    empresa: {
        type: String,
        default: 'BDX Performance' // Empresa por defecto según tu proyecto actual
    },
    telefono: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['Nuevo', 'Contactado', 'Cita Programada', 'Cerrado', 'Perdido'],
        default: 'Nuevo'
    },
    notas: {
        type: String
    },
    fechaRegistro: {
        type: Date,
        default: Date.now
    }
});

// Esta línea evita errores de "re-compilación" del modelo en el modo desarrollo de Vite/Antigravity
export default mongoose.models.Lead || mongoose.model('Lead', LeadSchema);

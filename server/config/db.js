import mongoose from 'mongoose';
import LeadMagnet from '../models/LeadMagnet.js';

const seedDatabase = async () => {
    try {
        const count = await LeadMagnet.countDocuments();
        if (count === 0) {
            await LeadMagnet.insertMany([
                {
                    slug: 'prompts-ia-marketing',
                    title: '7 prompts de IA para marketing que sí funcionan',
                    email_subject: '🎁 Aquí están tus 7 prompts de IA para marketing',
                    email_body: 'Hola, gracias por descargar nuestro recurso. Adjunto encontrarás los 7 prompts de IA para marketing que realmente generan resultados. Cualquier pregunta, responde este correo.',
                    file_url: 'https://tu-storage.com/prompts.pdf' // Reemplazar con URL real
                },
                {
                    slug: 'leads-whatsapp',
                    title: 'Cómo generar leads en WhatsApp sin spam',
                    email_subject: '📲 Tu guía: Genera leads en WhatsApp sin spam',
                    email_body: 'Hola, gracias por tu interés. Adjunto encontrarás la guía completa para generar leads en WhatsApp de forma profesional y sin spam.',
                    file_url: 'https://tu-storage.com/whatsapp.pdf' // Reemplazar con URL real
                }
            ]);
            console.log('🌱 Base de datos inicializada automáticamente con Lead Magnets.');
        }
    } catch (error) {
        console.error('❌ Error inicializando datos semilla:', error.message);
    }
};

const connectDB = async () => {
    try {
        if (mongoose.connection.readyState >= 1) return;
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`✅ MongoDB Conectado: ${conn.connection.host}`);

        // Correr el seeder para asegurar que existen los magnets
        await seedDatabase();

    } catch (error) {
        console.error(`❌ Error en MongoDB: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;

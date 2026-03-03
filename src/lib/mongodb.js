import mongoose from 'mongoose';

// Esta es la URI que obtendrás de MongoDB Atlas
const MONGODB_URI = process.env.VITE_MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error(
        'Por favor, define la variable VITE_MONGODB_URI en tu archivo .env'
    );
}

/**
 * Global se usa aquí para mantener una conexión estable durante el "Hot Realoding" de Vite
 * y evitar que se saturen las conexiones en desarrollo.
 */
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        };

        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            console.log("✅ Conexión exitosa a MongoDB para Godzilla Consulting");
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

export default connectDB;

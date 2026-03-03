import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

export const client = createClient({
    projectId: 'u5v5sn7d',
    dataset: 'production',
    useCdn: false, // Cambiado a false para poder extraer los paquetes editados de inmediato sin retraso de cache
    apiVersion: '2024-02-27', // Fecha del día de hoy como versión de la API
});

const builder = imageUrlBuilder(client);

// Función útil para poder extraer y construir las URLs de las imágenes subidas a Sanity
export const urlFor = (source) => builder.image(source);

import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

export const client = createClient({
    projectId: 'u5v5sn7d',
    dataset: 'production',
    useCdn: true, // `true` para usar el caché en el Edge global. `false` si necesitas ver información recién editada al segundo.
    apiVersion: '2024-02-27', // Fecha del día de hoy como versión de la API
});

const builder = imageUrlBuilder(client);

// Función útil para poder extraer y construir las URLs de las imágenes subidas a Sanity
export const urlFor = (source) => builder.image(source);

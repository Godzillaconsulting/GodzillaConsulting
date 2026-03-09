import { createClient } from '@sanity/client';

const client = createClient({
    projectId: 's211g475', // Need to get this from sanityClient.js
    dataset: 'production',
    useCdn: false,
    apiVersion: '2023-05-03',
});

client.fetch(`*[_type == "paquete"] | order(id asc)`).then(console.log).catch(console.error);

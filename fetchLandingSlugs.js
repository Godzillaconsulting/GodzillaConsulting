import { createClient } from '@sanity/client';

const client = createClient({
    projectId: 'u5v5sn7d',
    dataset: 'production',
    useCdn: false,
    apiVersion: '2024-02-27',
});

client.fetch(`*[_type == "landingPaquete"]{ "slug": slug.current, heroTitle }`).then(data => {
    console.log(data);
}).catch(err => console.error(err));

import { createClient } from '@sanity/client';

const client = createClient({
    projectId: 'u5v5sn7d',
    dataset: 'production',
    useCdn: false,
    apiVersion: '2024-02-27',
});

client.fetch(`*[_type == "paquete"] | order(id asc)`).then(data => {
    console.log(JSON.stringify(data, null, 2));
}).catch(err => console.error(err));

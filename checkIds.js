import { createClient } from '@sanity/client';

const client = createClient({
    projectId: 'u5v5sn7d',
    dataset: 'production',
    useCdn: false,
    apiVersion: '2024-02-27',
});

client.fetch(`*[_type == "paquete"] | order(id asc) { id, title }`).then(data => {
    console.log(data);
}).catch(err => console.error(err));

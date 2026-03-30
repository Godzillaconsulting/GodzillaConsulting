import { client } from './src/sanityClient.js';

client.fetch(`*[_type == "landingPaquete" && lower(slug.current) == lower($slug)][0]{ "slug": slug.current, heroTitle }`, { slug: 'posicionamiento-social' })
    .then(data => {
        console.log(data);
    }).catch(err => console.error(err));

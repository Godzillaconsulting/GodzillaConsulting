const TOKEN = 'EAAUZAf8fQip4BRBBMknUw5XyEpVZA6iyf3do2wgnRVKjBQz4fVR5sL9e1DLwMuqph3gqZBfvyNskfZAmClhmtZARJbb51kzm2thPX9b0QVq6rnlMlp72qz4JlHldh8JZC9ZALIZCccvQX7ecA5ShKx71LD3UEnXFzcKyc1xnLEL7QWJelEZAzT8hensAbE5IyQeVhzK65xO41IFLoqzHNz2FzdybZCgOteaXV2p8EhOZBpvYzr4Uxdg3QVIHF6qtpKNkY6NF6PZBMxlfg2gZD';
const PAGE_ID = '109675814777716'; // Godzilla Consulting

async function check() {
    // Verificar la página directamente
    const page = await fetch(`https://graph.facebook.com/v19.0/${PAGE_ID}?fields=id,name,access_token,instagram_business_account{id,username,name}&access_token=${TOKEN}`).then(r=>r.json());
    console.log('\n📄 Página con nuevo token:');
    console.log('  Nombre:', page.name);
    console.log('  ID:', page.id);

    if (page.instagram_business_account) {
        const ig = page.instagram_business_account;
        console.log('  ✅ IG Vinculado:', `@${ig.username}`, '| ID:', ig.id);
        // Si hay IG, mostrar el page token incluido
        if (page.access_token) {
            console.log('\n🔑 Page Access Token (permanente):');
            console.log('  ' + page.access_token);
        }
    } else {
        console.log('  ❌ IG: No vinculado o sin permisos');
    }

    if (page.error) console.error('  Error:', page.error.message);

    // También probar con el token actual del .env para comparar
    require('dotenv').config();
    const OLD = process.env.PAGE_ACCESS_TOKEN;
    const page2 = await fetch(`https://graph.facebook.com/v19.0/${PAGE_ID}?fields=id,name,instagram_business_account{id,username}&access_token=${OLD}`).then(r=>r.json());
    console.log('\n🔴 Token VIEJO del .env:');
    console.log('  IG:', page2.instagram_business_account ? `✅ @${page2.instagram_business_account.username}` : '❌ No visible');
}
check().catch(e => console.error(e.message));

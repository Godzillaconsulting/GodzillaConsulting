import { createClient } from '@sanity/client';

const client = createClient({
    projectId: 'u5v5sn7d',
    dataset: 'production',
    useCdn: false,
    apiVersion: '2024-02-27',
});

async function run() {
    try {
        console.log("Fetching paquetes from Sanity...");
        const paquetes = await client.fetch(`*[_type == "paquete"] | order(id asc)`);
        console.log("Paquetes Grid:", JSON.stringify(paquetes, null, 2));

        console.log("\nFetching landings from Sanity...");
        const landings = await client.fetch(`*[_type == "landingPaquete"]`);
        console.log("Landings:", JSON.stringify(landings, null, 2));
    } catch (e) {
        console.error("Sanity fetch failed:", e);
    }
}
run();

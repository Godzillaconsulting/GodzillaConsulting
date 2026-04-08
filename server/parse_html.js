import fs from 'fs';

const html = fs.readFileSync('tiktok_dom_dump.html', 'utf8');

// Find all elements with data-e2e
const e2eMatches = html.match(/data-e2e="([^"]+)"/g);
if (e2eMatches) {
    const uniqueE2e = [...new Set(e2eMatches)];
    console.log("Data E2E Selectors:");
    console.log(uniqueE2e.join('\n'));
}

// Find input areas
const contentEditables = html.match(/<[^>]+contenteditable[^>]+>/g);
if (contentEditables) console.log("\nContentEditables:\n", contentEditables.join('\n'));

// Find anything containing 'Hola'
const holaSnippets = html.match(/.{0,50}Hola.{0,50}/g);
if (holaSnippets) {
    console.log("\nSnippets with Hola:\n", holaSnippets.map(s => s.trim()).join('\n---\n'));
}

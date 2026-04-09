import fs from 'fs';

const html = fs.readFileSync('tiktok_notifications_dump.html', 'utf8');

// Find all elements with data-e2e
const e2eMatches = html.match(/data-e2e="([^"]+)"/g);
if (e2eMatches) {
    const uniqueE2e = [...new Set(e2eMatches)];
    console.log("Data E2E Selectors in Notifications:");
    console.log(uniqueE2e.join('\n'));
}

// Check for anything containing 'comment' or string related to comments
const comments = html.match(/<[^>]+>[^<]*coment[^<]*<\/[^>]+>/gi);
if (comments && comments.length > 0) {
    console.log("\nPossible comment indicators:", comments.slice(0, 10));
}

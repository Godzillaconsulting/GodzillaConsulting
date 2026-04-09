import fs from 'fs';

const html = fs.readFileSync('comments_dump.html', 'utf8');

const items = html.match(/<div[^>]*data-e2e="inbox-list-item"[^>]*>([\s\S]*?)<\/div><div[^>]*data-e2e="inbox-list-item"/g) || html.match(/<div[^>]*data-e2e="inbox-list-item".{0,1000}/g);

if(items) {
   console.log("Found " + items.length + " inbox items.");
   console.log(items[0]);
}

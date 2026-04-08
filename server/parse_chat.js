import fs from 'fs';

const html = fs.readFileSync('tiktok_dom_dump.html', 'utf8');

const chatItems = html.match(/<div[^>]*data-e2e="chat-item"[^>]*>([\s\S]*?)<\/div><div[^>]*data-e2e="chat-item"[^>]*>/g) || html.match(/<div[^>]*data-e2e="chat-item"[\s\S]{0,800}/g);

if(chatItems){
   console.log("Found chat items:");
   console.log(chatItems[0]);
   console.log("\n----\n");
   if(chatItems[chatItems.length-1]) console.log(chatItems[chatItems.length-1]);
}

const fs = require('fs');
const content = fs.readFileSync('src/components/AutomationFlow.jsx', 'utf8');
const lines = content.split('\n');

// Find the WA bot config block
const startLineIdx = lines.findIndex(l => l.includes("'WhatsApp Bot', 'TikTok Bot', 'IG / Messenger Bot'].includes(selectedNode.title)"));
console.log('WA block starts at line', startLineIdx + 1);

// Show the next 80 lines to understand structure
const snippet = lines.slice(startLineIdx, startLineIdx + 80).join('\n');
console.log(snippet.substring(0, 3000));

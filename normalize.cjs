const fs = require('fs');
// Read as buffer to handle encodings
let content = fs.readFileSync('src/components/AutomationFlow.jsx', 'utf8');
// Normalize all line endings to LF  
content = content.replace(/\r\n/g, '\n');
fs.writeFileSync('src/components/AutomationFlow.jsx', content, 'utf8');
console.log('✅ Line endings normalized to LF');
console.log('File size:', content.length, 'chars,', content.split('\n').length, 'lines');

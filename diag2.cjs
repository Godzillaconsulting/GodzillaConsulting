const fs = require('fs');
const content = fs.readFileSync('src/components/AutomationFlow.jsx', 'utf8');
const lines = content.split('\n');

const startLine = 1432; // 0-indexed = line 1433
// Show lines 1432 to 1520
lines.slice(startLine, startLine + 90).forEach((l, i) => console.log(startLine + i + 1, ':', l));

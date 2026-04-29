const fs = require('fs');
const content = fs.readFileSync('src/components/AutomationFlow.jsx', 'utf8');
const lines = content.split('\n');

// Find the WA block
const startLine = lines.findIndex(l => l.includes("'WhatsApp Bot', 'TikTok Bot', 'IG / Messenger Bot'].includes(selectedNode.title)"));
console.log('WA block at line:', startLine + 1);

// Count JSX expression braces { } in the block from startLine to endLine
// We need to find where the outer { ...&& ( ...JSX... )} ends
// The structure is: {ARRAY.includes(title) && ( <JSX> )}
// Count ( and ) to find the matching close
let parenDepth = 0;
let found = false;
for (let i = startLine; i < Math.min(startLine + 100, lines.length); i++) {
  const line = lines[i];
  for (let c = 0; c < line.length; c++) {
    if (line[c] === '(') parenDepth++;
    if (line[c] === ')') {
      parenDepth--;
      if (parenDepth === 0) {
        // This is where the conditional ends
        console.log(`Block ends at line ${i+1}, col ${c+1}: "${line.trim().substring(0, 60)}"`);
        found = true;
        // Show a few more lines
        console.log('\nLines after block end:');
        lines.slice(i, i+4).forEach((l, j) => console.log(i+j+1, ':', l));
        break;
      }
    }
  }
  if (found) break;
}

const fs = require('fs');
const content = fs.readFileSync('src/components/AutomationFlow.jsx', 'utf8');
const lines = content.split('\n');

// Check for unbalanced braces in EditorView function
// Find EditorView function start
const editorStart = lines.findIndex(l => l.includes('function EditorView('));
console.log('EditorView starts at line:', editorStart + 1);

// Count curly braces from EditorView start to find where it ends
let depth = 0;
let started = false;
for (let i = editorStart; i < lines.length; i++) {
  const line = lines[i];
  for (const ch of line) {
    if (ch === '{') { depth++; started = true; }
    if (ch === '}') depth--;
    if (started && depth === 0) {
      console.log('EditorView ends at line:', i + 1);
      console.log('Next lines:');
      lines.slice(i, i + 5).forEach((l, j) => console.log(i + j + 1, ':', l.trim().substring(0,80)));
      process.exit(0);
    }
  }
}

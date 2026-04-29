const fs = require('fs');
let content = fs.readFileSync('src/components/AutomationFlow.jsx', 'utf8');

// Line 1433 starts with a space then ['WhatsApp Bot'... 
// It should start with {['WhatsApp Bot'...
// The missing { is because our patch script subtracted 14 chars (for "              {") but 
// the replacement didn't include the leading {

const bad = ` ['WhatsApp Bot', 'TikTok Bot', 'IG / Messenger Bot'].includes(selectedNode.title) && (`;
const good = `              {['WhatsApp Bot', 'TikTok Bot', 'IG / Messenger Bot'].includes(selectedNode.title) && (`;

if (content.includes(bad)) {
  content = content.replace(bad, good);
  fs.writeFileSync('src/components/AutomationFlow.jsx', content, 'utf8');
  console.log('✅ Fixed missing opening brace');
} else {
  console.log('Pattern not found, trying alternate...');
  // Look for the line directly
  const lines = content.split('\n');
  const idx = lines.findIndex(l => l.trim().startsWith("['WhatsApp Bot', 'TikTok Bot', 'IG / Messenger Bot']"));
  if (idx > -1) {
    console.log('Found at line:', idx + 1, '|', lines[idx]);
    lines[idx] = "              {['WhatsApp Bot', 'TikTok Bot', 'IG / Messenger Bot'].includes(selectedNode.title) && (";
    content = lines.join('\n');
    fs.writeFileSync('src/components/AutomationFlow.jsx', content, 'utf8');
    console.log('✅ Fixed via line replacement');
  } else {
    console.log('❌ Could not find the bad line');
  }
}

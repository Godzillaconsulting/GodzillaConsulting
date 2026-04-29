const fs = require('fs');
const acorn = require('acorn');
const jsx = require('acorn-jsx');

const JSXParser = acorn.Parser.extend(jsx());
const code = fs.readFileSync('src/components/AutomationFlow.jsx', 'utf8');

try {
  JSXParser.parse(code, { sourceType: 'module', ecmaVersion: 2022 });
  console.log('✅ Syntax OK');
} catch(e) {
  console.error(`❌ Syntax error: ${e.message}`);
}

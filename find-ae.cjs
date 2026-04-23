const fs = require('fs');
const code = fs.readFileSync('dist/assets/AdminStudio-DtmzZfQ6.js', 'utf8');

// Buscamos "const ae=" o "let ae=" o "class ae "
const matches = [...code.matchAll(/(const|let|class|function)\s+ae[\s=\(]/g)];

matches.forEach(m => {
  const index = m.index;
  const context = code.substring(Math.max(0, index - 50), Math.min(code.length, index + 200));
  console.log(`FOUND at index ${index}:`);
  console.log(context);
  console.log('----------------');
});

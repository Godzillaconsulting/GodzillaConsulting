const fs = require('fs');
const code = fs.readFileSync('dist/assets/AdminStudio-DtmzZfQ6.js', 'utf8');

const matches = [...code.matchAll(/ae\s*=/g)];
matches.forEach(m => {
  const index = m.index;
  const context = code.substring(Math.max(0, index - 50), Math.min(code.length, index + 100));
  if (context.includes('const ') || context.includes('let ') || context.includes('class ')) {
      console.log(`FOUND at index ${index}:`);
      console.log(context);
      console.log('----------------');
  }
});

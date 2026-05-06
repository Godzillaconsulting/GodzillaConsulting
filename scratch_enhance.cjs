const fs = require('fs');
let c = fs.readFileSync('server/services/newsletterGenerator.js', 'utf8');
c = c.replace(
    /const fallbackUrl = `https:\/\/image\.pollinations\.ai\/prompt\/\$\{encodeURIComponent\("magazine cover " \+ data\.coverPrompt\)\}\?width=1080&height=1920&nologo=true`;/g,
    'const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent("Award-winning TIME magazine cover, ultra-realistic, highly detailed, 8k resolution, corporate photography. " + data.coverPrompt)}?width=1080&height=1920&nologo=true&model=flux&enhance=true`;'
);
fs.writeFileSync('server/services/newsletterGenerator.js', c);
console.log('Done!');

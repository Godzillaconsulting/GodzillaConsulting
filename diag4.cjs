const fs = require('fs');
const content = fs.readFileSync('src/components/AutomationFlow.jsx', 'utf8');
const lines = content.split('\n');

// Find handleCanvasPointerDown to check if it got corrupted
const canvasDownLine = lines.findIndex(l => l.includes('handleCanvasPointerDown = (e) => {'));
console.log('handleCanvasPointerDown at line:', canvasDownLine + 1);
lines.slice(canvasDownLine, canvasDownLine + 15).forEach((l, i) => console.log(canvasDownLine + i + 1, ':', l));

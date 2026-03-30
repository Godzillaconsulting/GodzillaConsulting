const fs = require('fs');
const dest = 'c:/Users/jesus/GodzillaConsulting/src/components/MediaPicker.jsx';
const src = 'd:/Godzilla Co/Godzilla Consulting/Página web/Vercel/godzilla-app/src/components/MediaPicker.jsx';
if (fs.existsSync(src) && fs.existsSync(dest)) {
    fs.writeFileSync(dest, fs.readFileSync(src));
    console.log('Synced MediaPicker to C:');
}

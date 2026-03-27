const cp = require('child_process');
const fs = require('fs');

try {
    const diff1 = cp.execSync('git diff origin/main src/App.jsx', { encoding: 'utf8' });
    const diff2 = cp.execSync('git diff origin/main src/components/AdminStudio.jsx', { encoding: 'utf8' });
    const diff3 = cp.execSync('git diff origin/main src/utils/studioConfig.js', { encoding: 'utf8' });

    fs.writeFileSync('colliding_diffs.txt', "--- App.jsx ---\n" + diff1 + "\n\n--- AdminStudio.jsx ---\n" + diff2 + "\n\n--- studioConfig.js ---\n" + diff3);
    console.log("Got diffs");
} catch (e) {
    console.log("ERROR", e.message);
}

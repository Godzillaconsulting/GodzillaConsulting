const cp = require('child_process');
const fs = require('fs');

try {
    console.log("Fetching remote...");
    cp.execSync('git fetch', { stdio: 'inherit' });
    
    console.log("Diffing...");
    const diff = cp.execSync('git diff --name-status HEAD..origin/main', { encoding: 'utf8' });
    
    console.log("Status...");
    const status = cp.execSync('git status --short', { encoding: 'utf8' });

    fs.writeFileSync('git_result.txt', "--- REMOTE DIFF ---\n" + (diff || "No remote changes.") + "\n\n--- LOCAL STATUS ---\n" + (status || "Clean local."));
    console.log("DONE");
} catch (e) {
    fs.writeFileSync('git_result.txt', "ERROR: " + e.message);
    console.log("ERROR GITHUB", e.message);
}

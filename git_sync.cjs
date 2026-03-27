const cp = require('child_process');

function run(cmd) {
    try {
        console.log(`Running: ${cmd}`);
        const out = cp.execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
        console.log(out || "(No output)");
    } catch (e) {
        console.log(`Command failed: ${e.message}`);
        if (e.stderr) console.log(`Stderr: ${e.stderr.toString()}`);
        if (e.stdout) console.log(`Stdout: ${e.stdout.toString()}`);
    }
}

console.log("=== INICIANDO SYNC ===");
run('git add .');
run('git commit -m "Integracion final: Analytics Dashboard & Motor de Correos Lead Magnets"');
run('git pull origin main --rebase');
run('git push origin main');
console.log("=== SYNC COMPLETADO ===");

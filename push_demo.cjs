const cp = require('child_process');

try {
    console.log("Adding...");
    cp.execSync('git add src/components/AnalyticsDashboard.jsx', { stdio: 'inherit' });
    
    console.log("Committing...");
    cp.execSync('git commit -m "Analytics: Desactivar data de prueba temporal (Demo Mode OFF)"', { stdio: 'inherit' });
    
    console.log("Pushing...");
    cp.execSync('git push origin main', { stdio: 'inherit' });

    console.log("PUSH COMPLETADO");
} catch (e) {
    console.log("ERROR O NADA QUE COMMITEAR: ", e.message);
}

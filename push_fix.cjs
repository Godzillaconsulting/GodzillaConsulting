const cp = require('child_process');
try {
  cp.execSync('git add src/components/Cultura.jsx src/components/Servicios.jsx', { stdio: 'inherit' });
  cp.execSync('git commit -m "Fix: Nodos en Cultura y Render Inteligente en bg de Servicios"', { stdio: 'inherit' });
  cp.execSync('git push origin main', { stdio: 'inherit' });
  console.log('PUSH COMPLETADO');
} catch(e) {
  console.log('ERROR: ' + e.message);
}

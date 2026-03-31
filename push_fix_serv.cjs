const cp = require('child_process');
try {
  cp.execSync('git add src/components/Servicios.jsx', { stdio: 'inherit' });
  cp.execSync('git commit -m "Fix: Renderizado infalible de Particulas Rojas en Servicios"', { stdio: 'inherit' });
  cp.execSync('git push origin main', { stdio: 'inherit' });
  console.log('PUSH COMPLETADO');
} catch(e) {
  console.log('ERROR: ' + e.message);
}

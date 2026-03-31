const cp = require('child_process');
try {
  cp.execSync('git add src/components/Cultura.jsx', { stdio: 'inherit' });
  cp.execSync('git commit -m "Fix: Prevenir que vaciar Bg Video reviva a Zilla y sanear el carrusel de Cultura"', { stdio: 'inherit' });
  cp.execSync('git push origin main', { stdio: 'inherit' });
  console.log('PUSH COMPLETADO');
} catch(e) {
  console.log('ERROR: ' + e.message);
}

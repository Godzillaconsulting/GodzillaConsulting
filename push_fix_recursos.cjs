const cp = require('child_process');
try {
  cp.execSync('git add src/components/Recursos.jsx src/utils/studioConfig.js', { stdio: 'inherit' });
  cp.execSync('git commit -m "Fix: Actualización de defaultMagnets a la nueva info y Gifs (Bot, Embudo, Crm)"', { stdio: 'inherit' });
  cp.execSync('git push origin main', { stdio: 'inherit' });
  console.log('PUSH COMPLETADO');
} catch(e) {
  console.log('ERROR: ' + e.message);
}

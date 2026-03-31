const cp = require('child_process');
try {
  cp.execSync('git add src/components/Cultura.jsx src/utils/studioConfig.js', { stdio: 'inherit' });
  cp.execSync('git commit -m "Fix: Remover imagen Unsplash y slot huérfano de Cultura"', { stdio: 'inherit' });
  cp.execSync('git push origin main', { stdio: 'inherit' });
  console.log('PUSH COMPLETADO');
} catch(e) {
  console.log('ERROR: ' + e.message);
}

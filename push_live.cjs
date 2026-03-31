const cp = require('child_process');
try {
  cp.execSync('git add src/utils/studioConfig.js src/components/Cultura.jsx src/context/SiteContext.jsx server/routes/nodes.js', { stdio: 'inherit' });
  cp.execSync('git commit -m "Fix: Caching aggressiveness en /api/nodes y Context; bgVideoUrl dinámico para Cultura"', { stdio: 'inherit' });
  cp.execSync('git push origin main', { stdio: 'inherit' });
  console.log('PUSH COMPLETADO');
} catch(e) {
  console.log('ERROR: ' + e.message);
}

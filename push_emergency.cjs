const cp = require('child_process');
try {
  cp.execSync('git add src/components/Recursos.jsx src/components/AnalyticsDashboard.jsx', { stdio: 'inherit' });
  cp.execSync('git commit -m "Emergency Fix: Sintaxis rota en Analytics Dashboard y Typo de Gifs"', { stdio: 'inherit' });
  cp.execSync('git push origin main', { stdio: 'inherit' });
  console.log('EMERGENY PUSH COMPLETADO');
} catch(e) {
  console.log('ERROR: ' + e.message);
}

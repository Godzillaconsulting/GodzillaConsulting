const cp = require('child_process');
try {
  cp.execSync('git add server/routes/media.js server/package.json server/package-lock.json', { stdio: 'inherit' });
  cp.execSync('git commit -m "Feature: Media universal - cualquier imagen/video convertido a WebP/MP4 via sharp+ffmpeg"', { stdio: 'inherit' });
  cp.execSync('git push origin main', { stdio: 'inherit' });
  console.log('PUSH COMPLETADO');
} catch(e) {
  console.log('ERROR: ' + e.message);
}

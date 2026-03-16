import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const SERVER_DIR = path.join(ROOT_DIR, 'server');
const API_DIR = path.join(ROOT_DIR, 'api');

console.log('📦 Starting Godzila Backend prebuild process for Vercel...');

// 1. Pack the server directory into a tarball
console.log(`➡️ Packing ${SERVER_DIR}...`);
const packResult = execSync('npm pack', { cwd: SERVER_DIR, encoding: 'utf-8' }).trim();
const tarballName = packResult.split('\n').pop(); // Usually godzilla-backend-1.0.0.tgz
const tarballPath = path.join(SERVER_DIR, tarballName);

// 2. Ensure api/ directory exists
if (!fs.existsSync(API_DIR)) {
    fs.mkdirSync(API_DIR);
}

// 3. Move the tarball to api/
const destTarballPath = path.join(API_DIR, 'godzilla-backend.tgz');
console.log(`➡️ Moving ${tarballName} to api/godzilla-backend.tgz...`);
fs.renameSync(tarballPath, destTarballPath);

// 4. Generate api/package.json that depends on the local tarball
console.log('➡️ Generating api/package.json...');

// Copying exactly the dependencies from server just to ensure Vercel installs them, 
// though the native pack should handle it. We do this for redundancy against Vercel NFT.
const serverPkg = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'package.json'), 'utf-8'));

const apiPkg = {
  name: 'godzilla-api-lambda',
  version: '1.0.0',
  type: 'module',
  dependencies: {
    'godzilla-backend': 'file:./godzilla-backend.tgz',
    ...serverPkg.dependencies 
  }
};

fs.writeFileSync(path.join(API_DIR, 'package.json'), JSON.stringify(apiPkg, null, 2));

// 5. Generate api/index.js entrypoint
console.log('➡️ Generating api/index.js...');
const apiIndexCode = `import app from 'godzilla-backend/index.js';\nexport default app;\n`;
fs.writeFileSync(path.join(API_DIR, 'index.js'), apiIndexCode);

console.log('✅ Prebuild complete. api/ directory is ready for Vercel Serverless deployment.');

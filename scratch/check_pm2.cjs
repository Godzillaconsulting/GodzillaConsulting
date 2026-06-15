const { execSync } = require('child_process');
const path = require('path');

const dirs = ['.pm2', '.pm2_ventas', '.pm2_godzilla', '.pm2_custom', '.pm2_local', '.pm2_new'];
const pm2Cmd = 'C:\\Users\\GODZILLA.IA\\AppData\\Roaming\\npm\\pm2.cmd';

for (const d of dirs) {
    const pm2Home = path.join('C:\\Users\\GODZILLA.IA', d);
    console.log(`\n=========================================`);
    console.log(`Checking PM2_HOME: ${pm2Home}`);
    console.log(`=========================================`);
    try {
        const output = execSync(`"${pm2Cmd}" list`, {
            env: {
                ...process.env,
                PM2_HOME: pm2Home
            },
            encoding: 'utf8'
        });
        console.log(output);
    } catch (e) {
        console.error(`Error checking ${pm2Home}:`, e.message);
    }
}

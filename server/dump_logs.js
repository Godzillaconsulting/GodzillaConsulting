import fs from 'fs';
import { exec } from 'child_process';

exec('pm2 logs godzilla-bot-redes --lines 100 --nostream', (err, stdout, stderr) => {
    fs.writeFileSync('C:\\Users\\GODZILLA.IA\\GodzillaConsulting\\server\\logs_dump.txt', stdout + '\n' + stderr);
});

import fs from 'fs';
import { exec } from 'child_process';

exec('pm2 logs email-worker --lines 100 --nostream', (err, stdout, stderr) => {
    fs.writeFileSync('C:\\Users\\GODZILLA.IA\\GodzillaConsulting\\server\\logs_dump_email.txt', stdout + '\n' + stderr);
});

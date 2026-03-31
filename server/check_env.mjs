import dotenv from 'dotenv';
import fs from 'fs';
const envConfig = dotenv.parse(fs.readFileSync('C:\\Users\\GODZILLA.IA\\GodzillaConsulting\\server\\.env'));

console.log('EMAIL_DIRECT:', envConfig.EMAIL_DIRECT);
console.log('EMAIL_SMTP_HOST:', envConfig.EMAIL_SMTP_HOST);
console.log('EMAIL_USER:', envConfig.EMAIL_USER);
console.log('EMAIL_FROM_ADDRESS:', envConfig.EMAIL_FROM_ADDRESS);
console.log('EMAIL_FROM_NAME:', envConfig.EMAIL_FROM_NAME);

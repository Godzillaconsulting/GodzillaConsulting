import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

const email = process.env.GOOGLE_CLIENT_EMAIL;
const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

console.log('CLIENT_EMAIL:', email);
console.log('KEY empieza con:', key?.substring(0, 50));
console.log('KEY termina con:', key?.substring(key.length - 50));
console.log('KEY incluye BEGIN:', key?.includes('-----BEGIN PRIVATE KEY-----'));
console.log('KEY incluye END:  ', key?.includes('-----END PRIVATE KEY-----'));
console.log('CALENDAR_ID:', process.env.GOOGLE_CALENDAR_ID);

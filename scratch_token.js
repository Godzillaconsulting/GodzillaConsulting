import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const token = jwt.sign(
    { id: 1, username: 'jareg', role: 'admin' }, 
    process.env.JWT_SECRET || 'Godzilla_Secret_Key_2026_!@#'
);
console.log("TOKEN=" + token);

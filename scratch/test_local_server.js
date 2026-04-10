import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const secret = process.env.JWT_SECRET || 'Godzilla_Secret_Key_2026_!@#';
const token = jwt.sign({ id: 1, username: 'jareg', role: 'admin' }, secret, { expiresIn: '1h' });

async function check() {
    try {
        const res = await fetch('http://localhost:3000/api/analytics/proxy-posts?network=ig', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const text = await res.text();
        console.log('IG Response:', text);
        
        const res2 = await fetch('http://localhost:3000/api/analytics/proxy-posts?network=fb', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const text2 = await res2.text();
        console.log('\nFB Response:', text2);
    } catch(e) {
        console.error('Server down or error:', e);
    }
}
check();

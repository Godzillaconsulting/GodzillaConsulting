const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: 'server/.env' });

async function testUpload() {
    try {
        fs.writeFileSync('test.png', 'fake image content');
        const form = new FormData();
        form.append('file', fs.createReadStream('test.png'));

        const token = jwt.sign(
            { id: 1, username: 'JareG', role: 'superadmin' },
            process.env.JWT_SECRET || 'Godzilla_Secret_Key_2026_!@#',
            { expiresIn: '365d' }
        );

        console.log("Subiendo archivo as multipart/form-data...");
        const res = await axios.post('http://localhost:3000/api/media/upload', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });

        console.log("Éxito:", res.data);
    } catch (e) {
        if (e.response) {
            console.error("Falló (Response):", e.response.status, e.response.data);
        } else {
            console.error("Falló (Net/Other):", e.message);
        }
    }
}

testUpload();

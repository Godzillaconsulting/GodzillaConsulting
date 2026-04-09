const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const token = jwt.sign(
    { id: 1, username: 'JareG', role: 'superadmin' },
    'Godzilla_Secret_Key_2026_!@#',
    { expiresIn: '1h' }
);

const tempFile = path.join(__dirname, 'test_img.png');
fs.writeFileSync(tempFile, 'fake_png_data');

const form = new FormData();
form.append('file', fs.createReadStream(tempFile));

fetch('http://localhost:3000/api/media/upload', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`
    },
    body: form
})
.then(r => r.json())
.then(data => {
    console.log("Response:", data);
    fs.unlinkSync(tempFile);
})
.catch(err => console.error("Error:", err));

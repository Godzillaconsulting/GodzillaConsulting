import express from 'express';
import qrcodeLib from 'qrcode';

const app = express();

app.get('/qr', async (req, res) => {
    try {
        const fakeQrString = '1@FakeQRDataGeneratedByGodzillaAI1234567890_GodzillaConsulting2024';
        const qrImageURL = await qrcodeLib.toDataURL(fakeQrString);
        
        res.send(`
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; background: #111; color: white;">
                <h1 style="color: #ff0000; font-size: 2.5rem; text-transform: uppercase; letter-spacing: 2px;">Escanea con WhatsApp</h1>
                <p style="font-size: 1.2rem; margin-bottom: 30px;">Abre WhatsApp en tu celular > Dispositivos Vinculados > Vincular un dispositivo</p>
                
                <div style="padding: 20px; background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(255,0,0,0.3);">
                    <img src="${qrImageURL}" style="width: 350px; height: 350px; display: block;" />
                </div>
                
                <p style="margin-top: 30px; opacity: 0.6; font-size: 0.9rem;">Powered by Godzilla Consulting - Bot Authentication</p>
            </div>
        `);
    } catch (e) {
        res.status(500).send("Error generando imagen QR: " + e.message);
    }
});

const PORT = 3005;
app.listen(PORT, () => {
    console.log(`✅ [Preview] Servidor de demostración listo. Abre http://localhost:${PORT}/qr en tu navegador.`);
});

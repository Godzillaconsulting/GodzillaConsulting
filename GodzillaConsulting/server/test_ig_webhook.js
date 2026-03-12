import { processWebhookMessage } from './controllers/webhookController.js';
import dotenv from 'dotenv';
dotenv.config();

const mockReq = {
    body: {
        object: "instagram",
        entry: [
            {
                id: "1234567890", // Page ID or IG Account ID
                time: 1234567890,
                messaging: [
                    {
                        sender: { id: "9876543210" },
                        recipient: { id: "1234567890" },
                        timestamp: 1234567890,
                        message: {
                            mid: "mid.$cAA...",
                            text: "Hola Zilla, prueba desde IG"
                        }
                    }
                ]
            }
        ]
    },
    query: {}
};

const mockRes = {
    status: function (code) {
        console.log("Response Status:", code);
        return this;
    },
    send: function (text) {
        console.log("Response Send:", text);
    },
    sendStatus: function (code) {
        console.log("Response SendStatus:", code);
    }
};

(async () => {
    console.log("Testing IG Webhook...");
    await processWebhookMessage(mockReq, mockRes);
    console.log("Test finished.");
})();

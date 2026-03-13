export default function handler(req, res) {
    res.status(200).json({ status: 'Test OK', time: new Date().toISOString() });
}

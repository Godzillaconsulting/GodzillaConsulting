export default async function handler(req, res) {
    try {
        const module = await import('../server/index.js');
        const app = module.default;
        return app(req, res);
    } catch (error) {
        return res.status(500).json({
            status: "CRASH_Vercel_Boot",
            error: error.message,
            stack: error.stack
        });
    }
}

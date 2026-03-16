import app from 'godzilla-backend/index.js';

export default function handler(req, res) {
  // Pass the request to the Express app
  return app(req, res);
}

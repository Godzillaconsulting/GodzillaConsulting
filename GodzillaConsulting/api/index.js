import 'express';
import 'cors';
import 'helmet';
import 'express-rate-limit';
import 'dotenv';
import 'express-validator';
import 'nodemailer';
import 'pg';
import '@googleapis/calendar';
import '@google/generative-ai';

import app from '../server/index.js';

export default app;

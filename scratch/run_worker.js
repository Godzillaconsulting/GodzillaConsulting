import dotenv from 'dotenv';
dotenv.config({path: './server/.env'});
import('../server/workers/mediaWorker.js');

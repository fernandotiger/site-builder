import 'dotenv/config';
//import dotenv from 'dotenv';
//dotenv.config();

import express, { Request, Response } from 'express';

import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import userRouter from './routes/userRoutes.js';
import projectRouter from './routes/projectRoutes.js';
import { stripeWebhook } from './controllers/stripeWebhook.js';
// new stripe - import { stripeWebhook } from  './controllers/webhook.controller.js';
import imageRouter from './routes/image.js';
import deployRouter from './routes/deployroutes.js';
import purchaseRouter from './routes/purchaseRoutes.js';
import tutorialRouter from './routes/tutorialRoutes.js';

const app = express();

const port = 3000;

const corsOptions = {
    origin: process.env.TRUSTED_ORIGINS?.split(',') || [],
    credentials: true,
}

app.use(cors(corsOptions))
app.post('/api/stripe', express.raw({type: 'application/json'}), stripeWebhook)
// new stripe - app.post('/api/stripe',  express.raw({ type: 'application/json' }),  stripeWebhook);

app.all('/api/auth/{*any}', toNodeHandler(auth));

app.use(express.json({limit: '50mb'}))

app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});
app.use('/api/user', userRouter);
app.use('/api/project', projectRouter);

app.use('/api/image', imageRouter);

app.use('/api/deploy', deployRouter);

app.use('/api/purchase', purchaseRouter);

app.use('/api/tutorials', tutorialRouter);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
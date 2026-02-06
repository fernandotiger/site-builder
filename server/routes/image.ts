import express from 'express';
import { uploadImage, generateaiimage, multerMiddleware } from '../controllers/imageController.js';
import { protect } from '../middlewares/auth.js';

const imageRouter = express.Router();

imageRouter.post('/generate-ai-image', protect, generateaiimage)
imageRouter.post('/upload',protect, multerMiddleware, uploadImage)

export default imageRouter
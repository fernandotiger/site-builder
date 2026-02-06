import express, { Request, Response } from 'express';
import ImageKit from 'imagekit';
import multer from 'multer';

// Configure multer for memory storage
const storage = multer.memoryStorage();
const multerUpload = multer({ 
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        console.log('File filter called:', file);
        // Accept images only
        if (!file.mimetype.startsWith('image/')) {
            cb(new Error('Only image files are allowed'));
            return;
        }
        cb(null, true);
    }
});

// Multer middleware for single file upload 
export const multerMiddleware = multerUpload.single('image');

// Initialize ImageKit with private key on server
const imagekit = new ImageKit({
    publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY as string || '',
    privateKey: process.env.NEXT_PUBLIC_IMAGEKIT_PRIVATE_KEY as string || '',
    urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT as string || '',
});

// Type definitions
interface UploadResponse {
    url: string;
    fileId: string;
    filePath: string;
    thumbnailUrl?: string;
}

interface ErrorResponse {
    error: string;
}

// Upload endpoint
/**
 * Upload image to ImageKit
 * @route POST /api/image/upload
 * @access Protected
 */
export const uploadImage = async (req: Request, res: Response) : Promise<void> => {
    try {
        console.log( req.body);
        console.log('Received upload request:', req.file);
        if (!req.file) {
            res.status(400).json({ error: 'No file provided' } as ErrorResponse);
            return;
        }

        const result = await imagekit.upload({
            file: req.file.buffer,
            fileName: `${Date.now()}_${req.file.originalname}.png`,
            folder: '/uploads', // Optional: organize uploads
            useUniqueFileName: true,
        });
console.log('ImageKit upload OK:', result);
        const response: UploadResponse = {
            url: result.url,
            fileId: result.fileId,
            filePath: result.filePath,
            thumbnailUrl: result.thumbnailUrl
        };

        res.status(200).json(response);
        console.log('ImageKit upload FIM', );
    } catch (error) {
        console.error('ImageKit upload error:', error);
        console.log('ImageKit upload error:', error);
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Upload failed' 
        } as ErrorResponse);
    }
};

/**
 * Generate AI image using ImageKit
 * @route POST /api/image/generate-ai-image
 * @access Protected
 */
export const generateaiimage = async (req: Request, res: Response) : Promise<void> => {
    try {
        const { prompt } = req.body;
console.log(req.body)
console.log(prompt)
        if (!prompt || typeof prompt !== 'string') {
            res.status(400).json({ error: 'Valid prompt is required' } as ErrorResponse);
            return;
        }

        // Sanitize prompt for URL
        const sanitizedPrompt = prompt.trim().replace(/[^a-zA-Z0-9\s-]/g, '');

        if (!sanitizedPrompt) {
            res.status(400).json({ error: 'Prompt contains no valid characters' } as ErrorResponse);
            return;
        }
       
        const url = `${process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT_PROMPT}${encodeURIComponent(sanitizedPrompt)}/${Date.now()}.png?tr=`;

console.log("url-: " + url)
        res.status(200).json({ url } as { url: string });
    } catch (error) {
        console.error('AI image generation error:', error);
        console.log(error)
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Generation failed' 
        } as ErrorResponse);
    }
};
/*
// Get authentication parameters for client-side operations (if needed)
router.get('/auth', (req: Request, res: Response) => {
    try {
        const authParams = imagekit.getAuthenticationParameters();
        res.json(authParams);
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Auth failed' 
        } as ErrorResponse);
    }
});

export default router;*/
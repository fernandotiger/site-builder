import {Request} from 'express'
import multer from 'multer';

declare global {
    namespace Express {
        interface Request {
            userId?: string;
            file?: multer.File;
            files?: multer.File[] | { [fieldname: string]: multer.File[] };
        }
    }
}
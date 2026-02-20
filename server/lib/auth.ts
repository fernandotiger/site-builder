import 'dotenv/config';
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma.js";
import { sendVerificationEmail } from './mailer.js';

const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(',') || [];

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql", 
    }),
    emailAndPassword: { 
        enabled: true, 
        requireEmailVerification: true,
        sendEmailVerificationOnSignUp: true
    },
    user: {
      deleteUser: {enabled: true}
    },
    trustedOrigins,
    baseURL: process.env.BETTER_AUTH_URL!,
    secret: process.env.BETTER_AUTH_SECRET!,
    advanced: {
      cookies: {
          session_token: {
              name: 'auth_session',
              attributes: {
                  httpOnly: true,
                  secure: process.env.NODE_ENV === 'production',
                  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                  path: '/',
              }
          }
      }
    },
    emailVerification: {
      sendVerificationEmail: async ({user, url, token}) => {
        // Implement your email sending logic here using the token
        // For example, you can use nodemailer to send an email with the verification link
        const verifyUrl = url.replace(
          process.env.BETTER_AUTH_URL! + '/api/auth', 
          process.env.FRONTEND_URL!
        );

        await sendVerificationEmail(user.email, verifyUrl);
      },
      requireEmailVerification: true,
      // Token lifetime (seconds). 
      expiresIn: 60 * 60 * 24, // 24 hours
      sendOnSignUp: true,
    }
  
});
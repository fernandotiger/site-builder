import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_RESEND_KEY
  }
});

export async function sendVerificationEmail(to: string, verificationUrl: string) : Promise<void> {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: "Activate your account",
    text: `Please click the link below to verify your email address:\n\n${verificationUrl}`,
    html: `
      <p>Please click the link below to activate your account:</p>
      <a style="margin-top: 20px;" href="${verificationUrl}">Click here - Activate Account</a>
      <p style="margin-top: 24px; font-size: 12px; color: #888;">
        If you did not create an account, please ignore this email.
      </p>
    `
  };
  await transporter.sendMail(mailOptions);
}
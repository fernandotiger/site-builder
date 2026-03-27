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
export async function sendVerificationEmail(to, verificationUrl) {
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to,
        subject: "Activate your account",
        text: `Please click the link below to verify your email address:\n\n${verificationUrl}`,
        html: `
      <p>Please click the link below to activate your account:</p>
      <a style="margin-top: 20px;" href="${verificationUrl}">Click here - Activate Account</a>
      <p>Please note that the best way to test the functionalities of your landing page is by downloading it and opening it in a browser.</p>
      <p style="margin-top: 24px; font-size: 12px; color: #888;">
        If you did not create an account, please ignore this email.
      </p>
    `
    };
    await transporter.sendMail(mailOptions);
}
export async function sendProjectCompletedEmail(to, projectName, projectUrl) {
    if (!to || to.trim().length === 0) {
        console.warn("No email provided for sending project completion email.");
        return;
    }
    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject: `Your Landing Page "${projectName}" is ready!`,
        text: `Great news! Your Landing Page "${projectName}" has been generated.\n\nView it here: ${projectUrl}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px;">
        <h2 style="color: #1e40af;">Your Landing Page is ready! 🎉</h2>
        <p style="color: #334155; font-size: 15px;">
          <strong>${projectName}</strong> has been successfully generated.
        </p>
        <a href="${projectUrl}"
           style="display: inline-block; margin-top: 20px; padding: 12px 28px;
                  background: #1e40af; color: #fff; border-radius: 6px;
                  text-decoration: none; font-weight: bold; font-size: 15px;">
          View your Landing Page
        </a>
        <p style="margin-top: 24px; font-size: 12px; color: #888;">
          You're receiving this because you have an account on our platform.
        </p>
      </div>
    `
    });
}

import 'dotenv/config';
import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    } : undefined,
});
export async function sendEmail(opts) {
    if (!opts.to)
        throw new Error('Missing recipient email');
    const from = process.env.SMTP_FROM || 'no-reply@payroll.rdc.gov';
    await transporter.sendMail({
        from,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html ?? `<p>${opts.text}</p>`,
    });
}

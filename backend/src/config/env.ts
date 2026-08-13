import dotenv from 'dotenv';
import path from 'path';

// Charger le fichier .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const env = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  // Railway injecte DATABASE_URL, on accepte les deux noms
  DB_URL: process.env.DATABASE_URL || '',
  SESSION_SECRET: process.env.SESSION_SECRET || 'centresaoufi_default_secret_key_987',
  NODE_ENV: process.env.NODE_ENV || 'development',
  // Notifications email
  REMINDER_EMAILS: process.env.REMINDER_EMAILS || '',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  // SMTP conservé pour compatibilité mais non utilisé si RESEND_API_KEY est défini
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
};

// Validation simple
if (!env.DB_URL) {
  console.warn('WARNING: DB_URL environment variable is not defined.');
}
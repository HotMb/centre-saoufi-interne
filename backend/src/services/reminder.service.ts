import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { prisma } from '../config/prisma';
import { env } from '../config/env';

function buildTransporter() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}

async function sendReminderEmails() {
  const recipients = env.REMINDER_EMAILS
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);

  if (recipients.length === 0 || !env.SMTP_USER || !env.SMTP_PASS) {
    console.log('[Rappels] SMTP ou destinataires non configurés — rappels ignorés.');
    return;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Pas d'envoi le dimanche (RDV du lundi seront envoyés le samedi)
  if (tomorrow.getDay() === 0) {
    console.log('[Rappels] Demain est dimanche — aucun rappel envoyé.');
    return;
  }

  const dayStart = new Date(tomorrow);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(tomorrow);
  dayEnd.setHours(23, 59, 59, 999);

  const appointments = await prisma.appointment.findMany({
    where: {
      dateTime: { gte: dayStart, lte: dayEnd },
      status: 'PLANIFIE',
    },
    include: {
      patient: { select: { firstName: true, name: true, phone: true } },
      practitioner: { select: { name: true } },
    },
    orderBy: { dateTime: 'asc' },
  });

  if (appointments.length === 0) {
    console.log('[Rappels] Aucun RDV planifié demain.');
    return;
  }

  const dateLabel = tomorrow.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const rows = appointments.map(a => {
    const heure = new Date(a.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const patient = a.patient
      ? `${a.patient.firstName} ${a.patient.name}`
      : (a.patientName ?? 'Patient inconnu');
    const praticien = a.practitioner?.name ?? '—';
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${heure}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${patient}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${a.service}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${praticien}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${a.durationMinutes ?? 30} min</td>
      </tr>`;
  }).join('');

  const html = `
    <div style="font-family:sans-serif;max-width:700px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#0ea5e9,#38bdf8);padding:24px 32px;border-radius:12px 12px 0 0;">
        <h1 style="color:white;margin:0;font-size:1.3rem;">Centre Saoufi — Rappel Planning</h1>
        <p style="color:#e0f2fe;margin:6px 0 0;font-size:0.9rem;">Rendez-vous du ${dateLabel}</p>
      </div>
      <div style="background:#f8fafc;padding:24px 32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
        <p style="color:#475569;margin:0 0 16px;">${appointments.length} rendez-vous planifié(s) pour demain :</p>
        <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.07);">
          <thead>
            <tr style="background:#0ea5e9;color:white;font-size:0.85rem;">
              <th style="padding:10px 12px;text-align:left;">Heure</th>
              <th style="padding:10px 12px;text-align:left;">Patient</th>
              <th style="padding:10px 12px;text-align:left;">Service</th>
              <th style="padding:10px 12px;text-align:left;">Praticien</th>
              <th style="padding:10px 12px;text-align:left;">Durée</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#94a3b8;font-size:0.78rem;margin:20px 0 0;">
          Email automatique envoyé par le système Centre Saoufi.
        </p>
      </div>
    </div>`;

  const transporter = buildTransporter();
  await transporter.sendMail({
    from: `"Centre Saoufi" <${env.SMTP_USER}>`,
    to: recipients.join(', '),
    subject: `[Centre Saoufi] ${appointments.length} RDV demain — ${dateLabel}`,
    html,
  });

  console.log(`[Rappels] Email envoyé à ${recipients.join(', ')} — ${appointments.length} RDV pour demain.`);

  await prisma.activityLog.create({
    data: {
      action: 'RAPPEL_EMAIL',
      details: `Rappel J-1 envoyé à ${recipients.join(', ')} — ${appointments.length} RDV pour le ${dateLabel}.`,
    },
  });
}

export function startReminderCron() {
  if (!env.REMINDER_EMAILS) return;

  // Tous les jours à 19h00
  cron.schedule('00 19 * * *', async () => {
    console.log('[Rappels] Déclenchement du cron rappel J-1...');
    try {
      await sendReminderEmails();
    } catch (err) {
      console.error('[Rappels] Erreur lors de l\'envoi des rappels:', err);
    }
  }, { timezone: 'Africa/Casablanca' });

  console.log('[Rappels] Cron rappel J-1 démarré (tous les jours à 19h00).');
}

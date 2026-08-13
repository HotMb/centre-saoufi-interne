import cron from 'node-cron';
import { Resend } from 'resend';
import { prisma } from '../config/prisma';
import { env } from '../config/env';

export async function sendReminderEmails(): Promise<{ sent: boolean; reason: string }> {
  const recipients = env.REMINDER_EMAILS
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);

  if (recipients.length === 0 || !env.RESEND_API_KEY) {
    const msg = '[Rappels] RESEND_API_KEY ou REMINDER_EMAILS non configurés — rappels ignorés.';
    console.log(msg);
    return { sent: false, reason: 'RESEND_API_KEY ou REMINDER_EMAILS non configurés.' };
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Pas d'envoi le dimanche (RDV du lundi seront envoyés le samedi)
  if (tomorrow.getDay() === 0) {
    console.log('[Rappels] Demain est dimanche — aucun rappel envoyé.');
    return { sent: false, reason: 'Demain est dimanche — centre fermé.' };
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
    return { sent: false, reason: 'Aucun rendez-vous PLANIFIÉ pour demain.' };
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

  const resend = new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: 'Centre Saoufi <onboarding@resend.dev>',
    to: recipients,
    subject: `[Centre Saoufi] ${appointments.length} RDV demain — ${dateLabel}`,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }

  console.log(`[Rappels] Email envoyé à ${recipients.join(', ')} — ${appointments.length} RDV pour demain.`);

  await prisma.activityLog.create({
    data: {
      action: 'RAPPEL_EMAIL',
      details: `Rappel J-1 envoyé à ${recipients.join(', ')} — ${appointments.length} RDV pour le ${dateLabel}.`,
    },
  });

  return { sent: true, reason: `Email envoyé à ${recipients.join(', ')} — ${appointments.length} RDV pour le ${dateLabel}.` };
}

export function startReminderCron() {
  if (!env.REMINDER_EMAILS) {
    console.warn('[Rappels] REMINDER_EMAILS non défini — cron désactivé. Aucun rappel ne sera envoyé.');
    return;
  }

  // Tous les jours à 19h00
  cron.schedule('00 19 * * *', async () => {
    console.log('[Rappels] Déclenchement du cron rappel J-1...');
    try {
      const result = await sendReminderEmails();
      console.log('[Rappels] Résultat:', JSON.stringify(result));
    } catch (err: any) {
      console.error('[Rappels] ÉCHEC envoi rappels — code:', err?.code, '— message:', err?.message);
      console.error('[Rappels] Détail complet:', err);
    }
  }, { timezone: 'Africa/Casablanca' });

  console.log('[Rappels] Cron rappel J-1 démarré (tous les jours à 19h00).');
}

import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

// Services disponibles au Centre Saoufi
export const SERVICES_DISPONIBLES = [
  'Kinésithérapie',
  'Rééducation fonctionnelle',
  'Soins',
  'Ventousothérapie',
  'Massage thérapeutique',
  'Balnéothérapie',
  'Électrothérapie',
];

// Statuts valides
const STATUTS_VALIDES = ['PLANIFIE', 'ANNULE', 'REPORTE', 'REALISE'];

// Fonction de validation des horaires
function isWithinOpeningHours(date: Date): { valid: boolean; reason?: string } {
  // Les timestamps sont stockés en UTC par Prisma.
  // Africa/Casablanca = UTC+1 permanent depuis le 28 octobre 2018 (pas de DST).
  const casablanca = new Date(date.getTime() + 60 * 60 * 1000);
  const day = casablanca.getUTCDay();     // 0 = Dimanche, ..., 6 = Samedi
  const hours = casablanca.getUTCHours();
  const minutes = casablanca.getUTCMinutes();
  const time = hours + minutes / 60;      // Ex: 9h30 -> 9.5

  if (day === 0) {
    return { valid: false, reason: "Le centre est fermé le dimanche." };
  }

  if (day >= 1 && day <= 5) {
    // Lundi - Vendredi: 09:30-13:30 et 15:30-19:30
    // Dernier créneau 1h avant fermeture => matin max 12:30, aprem max 18:30
    const isMatin = time >= 9.5 && time <= 12.5;
    const isAprem = time >= 15.5 && time <= 18.5;
    if (!isMatin && !isAprem) {
      return { valid: false, reason: "Horaires en semaine : 09:30-12:30 et 15:30-18:30 (dernier créneau 1h avant la fermeture)." };
    }
  }

  if (day === 6) {
    // Samedi: 09:00-15:00 — dernier créneau 1h avant => max 14:00
    if (time < 9.0 || time > 14.0) {
      return { valid: false, reason: "Horaires le samedi : 09:00-14:00 (dernier créneau 1h avant la fermeture)." };
    }
  }

  return { valid: true };
}

// ─────────────────────────────────────────────
// GET /api/appointments — Liste des rendez-vous
// Filtres : ?date=YYYY-MM-DD, ?patientId=, ?status=, ?practitionerId=
// Accès : ADMIN, SECRETAIRE, PRATICIEN
// ─────────────────────────────────────────────
export async function listAppointments(req: Request, res: Response) {
  try {
    const { date, startDate, endDate, patientId, status, practitionerId } = req.query;
    const currentUser = (req as any).user;

    // Construction des filtres
    const where: any = {};

    if (date) {
      const start = new Date(date as string);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date as string);
      end.setHours(23, 59, 59, 999);
      where.dateTime = { gte: start, lte: end };
    } else if (startDate && endDate) {
      const start = new Date(startDate as string);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      where.dateTime = { gte: start, lte: end };
    }

    if (patientId) where.patientId = patientId as string;
    if (status) where.status = status as string;

    // Un praticien ne voit que ses propres rendez-vous
    if (currentUser.role === 'PRATICIEN') {
      where.practitionerId = currentUser.id;
    } else if (practitionerId) {
      where.practitionerId = practitionerId as string;
    }

    // Un patient ne voit que ses propres rendez-vous
    if (currentUser.role === 'PATIENT') {
      if (!currentUser.patientId) return res.status(200).json([]); // Aucun dossier lié
      where.patientId = currentUser.patientId;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: { id: true, name: true, firstName: true, phone: true },
        },
        practitioner: {
          select: { id: true, name: true, username: true },
        },
      },
      orderBy: { dateTime: 'asc' },
    });

    return res.status(200).json(appointments);
  } catch (error) {
    console.error('Erreur listAppointments:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des rendez-vous.' });
  }
}

// ─────────────────────────────────────────────
// GET /api/appointments/:id — Détail d'un RDV
// Accès : ADMIN, SECRETAIRE, PRATICIEN (le sien)
// ─────────────────────────────────────────────
export async function getAppointment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          select: { id: true, name: true, firstName: true, phone: true, email: true },
        },
        practitioner: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Rendez-vous non trouvé.' });
    }

    // Un praticien ne peut voir que ses propres RDV
    if (currentUser.role === 'PRATICIEN' && appointment.practitionerId !== currentUser.id) {
      return res.status(403).json({ error: 'Accès interdit à ce rendez-vous.' });
    }

    // Un patient ne peut voir que son propre RDV
    if (currentUser.role === 'PATIENT' && appointment.patientId !== currentUser.patientId) {
      return res.status(403).json({ error: 'Accès interdit.' });
    }

    return res.status(200).json(appointment);
  } catch (error) {
    console.error('Erreur getAppointment:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération du rendez-vous.' });
  }
}

// ─────────────────────────────────────────────
// POST /api/appointments — Créer un RDV
// Accès : ADMIN, SECRETAIRE
// ─────────────────────────────────────────────
export async function createAppointment(req: Request, res: Response) {
  try {
    const { patientId, patientName, dateTime, durationMinutes, service, practitionerId } = req.body;
    // Forcer le patientId si c'est un PATIENT qui fait la requête
    const finalPatientId = (req as any).user.role === 'PATIENT' ? (req as any).user.patientId : patientId;

    if ((!finalPatientId && !patientName) || !dateTime || !service) {
      return res.status(400).json({
        error: 'Champs obligatoires : (patientId ou patientName), dateTime, service.',
      });
    }

    // Valider le service
    if (!SERVICES_DISPONIBLES.includes(service)) {
      return res.status(400).json({
        error: `Service invalide. Services disponibles : ${SERVICES_DISPONIBLES.join(', ')}.`,
      });
    }

    // Valider la date (pas dans le passé)
    const rdvDate = new Date(dateTime);
    if (isNaN(rdvDate.getTime())) {
      return res.status(400).json({ error: 'Format de date invalide.' });
    }
    
    // Empêcher les RDV dans le passé (avec une marge de tolérance de 5 mins)
    if (rdvDate.getTime() < Date.now() - 5 * 60 * 1000) {
      return res.status(400).json({ error: 'Impossible de créer un rendez-vous dans le passé.' });
    }

    // Valider les horaires d'ouverture
    const hoursCheck = isWithinOpeningHours(rdvDate);
    if (!hoursCheck.valid) {
      return res.status(400).json({ error: hoursCheck.reason });
    }

    // Vérifier que le patient existe (si un ID est fourni)
    let patient = null;
    if (finalPatientId) {
      patient = await prisma.patient.findUnique({ where: { id: finalPatientId } });
      if (!patient) {
        return res.status(404).json({ error: 'Patient non trouvé.' });
      }
    }

    // Vérifier que le praticien existe (si renseigné)
    if (practitionerId) {
      const practitioner = await prisma.user.findUnique({ where: { id: practitionerId } });
      if (!practitioner || practitioner.role !== 'PRATICIEN') {
        return res.status(400).json({ error: 'Praticien invalide ou non trouvé.' });
      }
    }

    // Vérifier l'absence de chevauchement de créneau
    {
      const duration = durationMinutes ? parseInt(durationMinutes, 10) : 30;
      const startMs = rdvDate.getTime();
      const endMs = startMs + duration * 60 * 1000;

      const startOfDay = new Date(rdvDate); startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(rdvDate); endOfDay.setUTCHours(23, 59, 59, 999);

      // Si un praticien est assigné : vérifier ses RDV. Sinon : vérifier tous les RDV du jour.
      const dayAppointments = await prisma.appointment.findMany({
        where: {
          status: { in: ['PLANIFIE', 'REPORTE'] },
          dateTime: { gte: startOfDay, lte: endOfDay },
          ...(practitionerId ? { practitionerId } : {}),
        },
      });

      const conflict = dayAppointments.find(a => {
        const aStart = a.dateTime.getTime();
        const aEnd = aStart + (a.durationMinutes || 30) * 60 * 1000;
        return startMs < aEnd && endMs > aStart;
      });

      if (conflict) {
        const conflictTime = new Date(conflict.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        return res.status(409).json({
          error: practitionerId
            ? `Conflit de créneau : ce praticien a déjà un rendez-vous à ${conflictTime}.`
            : `Ce créneau est déjà occupé (rendez-vous existant à ${conflictTime}).`,
        });
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: finalPatientId || null,
        patientName: patientName || null,
        dateTime: rdvDate,
        durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : 30,
        service,
        status: 'PLANIFIE', // Considéré comme "DEMANDÉ/PLANIFIE" si créé par patient
        practitionerId: practitionerId || null,
      },
      include: {
        patient: { select: { id: true, name: true, firstName: true } },
        practitioner: { select: { id: true, name: true } },
      },
    });

    // Journalisation CNIL
    const displayName = patient ? `${patient.firstName} ${patient.name}` : patientName;
    await prisma.activityLog.create({
      data: {
        userId: (req as any).user?.id,
        action: 'CREATION_RENDEZ_VOUS',
        details: `RDV créé pour ${displayName} le ${rdvDate.toLocaleString('fr-FR')} — Service: ${service}.`,
      },
    });

    return res.status(201).json(appointment);
  } catch (error) {
    console.error('Erreur createAppointment:', error);
    return res.status(500).json({ error: 'Erreur lors de la création du rendez-vous.' });
  }
}

// ─────────────────────────────────────────────
// PATCH /api/appointments/:id — Modifier un RDV (statut / report)
// Accès : ADMIN, SECRETAIRE
// ─────────────────────────────────────────────
export async function updateAppointment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, dateTime, service, practitionerId } = req.body;

    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: { select: { name: true, firstName: true } } },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Rendez-vous non trouvé.' });
    }

    // Validation du statut si fourni
    if (status && !STATUTS_VALIDES.includes(status)) {
      return res.status(400).json({ error: `Statut invalide. Valeurs : ${STATUTS_VALIDES.join(', ')}.` });
    }

    // Validation du service si fourni
    if (service && !SERVICES_DISPONIBLES.includes(service)) {
      return res.status(400).json({ error: 'Service invalide.' });
    }

    const newDate = dateTime ? new Date(dateTime) : existing.dateTime;

    // Valider les horaires d'ouverture lors d'un report
    if (dateTime) {
      const hoursCheck = isWithinOpeningHours(newDate);
      if (!hoursCheck.valid) {
        return res.status(400).json({ error: hoursCheck.reason });
      }
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: status ?? existing.status,
        dateTime: newDate,
        service: service ?? existing.service,
        practitionerId: practitionerId !== undefined ? (practitionerId || null) : existing.practitionerId,
      },
      include: {
        patient: { select: { id: true, name: true, firstName: true } },
        practitioner: { select: { id: true, name: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: (req as any).user?.id,
        action: 'MODIFICATION_RENDEZ_VOUS',
        details: `RDV ${id} mis à jour — Statut: ${updated.status} — Patient: ${existing.patient?.firstName} ${existing.patient?.name}.`,
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Erreur updateAppointment:', error);
    return res.status(500).json({ error: 'Erreur lors de la modification du rendez-vous.' });
  }
}

// ─────────────────────────────────────────────
// DELETE /api/appointments/:id — Annuler/supprimer un RDV
// Accès : ADMIN, SECRETAIRE
// ─────────────────────────────────────────────
export async function deleteAppointment(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: { select: { name: true, firstName: true } } },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Rendez-vous non trouvé.' });
    }

    await prisma.appointment.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: (req as any).user?.id,
        action: 'SUPPRESSION_RENDEZ_VOUS',
        details: `RDV supprimé — Patient: ${existing.patient?.firstName} ${existing.patient?.name} — Service: ${existing.service}.`,
      },
    });

    return res.status(200).json({ message: 'Rendez-vous supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur deleteAppointment:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression du rendez-vous.' });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/appointments/bulk - Création en masse de rendez-vous (Validation Devis)
// ────────────────────────────────────────────────────────────────────────────
export async function createBulkAppointments(req: Request, res: Response) {
  try {
    const { patientId, patientName, service, dates, practitionerId, durationMinutes } = req.body;

    if ((!patientId && !patientName) || !dates || !Array.isArray(dates)) {
      return res.status(400).json({ error: 'patientId ou patientName, et un tableau de dates sont requis.' });
    }

    if (patientId) {
      const patient = await prisma.patient.findUnique({ where: { id: patientId } });
      if (!patient) {
        return res.status(404).json({ error: 'Patient introuvable.' });
      }
    }

    const duration = durationMinutes ? parseInt(durationMinutes, 10) : 30;
    const apptDates = dates.map((dt: string) => new Date(dt));

    // 1. Valider chaque date (format, passé, horaires)
    for (const appt_date of apptDates) {
      if (isNaN(appt_date.getTime())) {
        return res.status(400).json({ error: `Format de date invalide.` });
      }
      if (appt_date.getTime() < Date.now() - 5 * 60 * 1000) {
        return res.status(400).json({ error: 'Impossible de créer un rendez-vous dans le passé.' });
      }
      const hoursCheck = isWithinOpeningHours(appt_date);
      if (!hoursCheck.valid) {
        return res.status(400).json({
          error: `Créneau hors horaires (${appt_date.toLocaleString('fr-FR', { timeZone: 'Africa/Casablanca' })}) : ${hoursCheck.reason}`,
        });
      }
    }

    // 2. Vérifier les doublons dans la liste elle-même
    for (let i = 0; i < apptDates.length; i++) {
      for (let j = i + 1; j < apptDates.length; j++) {
        const iStart = apptDates[i].getTime();
        const iEnd = iStart + duration * 60 * 1000;
        const jStart = apptDates[j].getTime();
        const jEnd = jStart + duration * 60 * 1000;
        if (iStart < jEnd && iEnd > jStart) {
          return res.status(409).json({
            error: `Deux séances du devis se chevauchent. Vérifiez les dates et heures saisies.`,
          });
        }
      }
    }

    // 3. Vérifier les conflits avec les RDV existants
    for (const appt_date of apptDates) {
      const startMs = appt_date.getTime();
      const endMs = startMs + duration * 60 * 1000;
      const startOfDay = new Date(appt_date); startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(appt_date); endOfDay.setUTCHours(23, 59, 59, 999);

      const dayAppts = await prisma.appointment.findMany({
        where: {
          status: { in: ['PLANIFIE', 'REPORTE'] },
          dateTime: { gte: startOfDay, lte: endOfDay },
          ...(practitionerId ? { practitionerId } : {}),
        },
      });

      const conflict = dayAppts.find((a: any) => {
        const aStart = a.dateTime.getTime();
        const aEnd = aStart + (a.durationMinutes || 30) * 60 * 1000;
        return startMs < aEnd && endMs > aStart;
      });

      if (conflict) {
        const ct = (conflict as any).dateTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        return res.status(409).json({
          error: practitionerId
            ? `Conflit : ce praticien a déjà un rendez-vous à ${ct}.`
            : `Ce créneau est déjà occupé (rendez-vous existant à ${ct}).`,
        });
      }
    }

    const createdAppointments = [];

    for (const appt_date of apptDates) {
      const appt = await prisma.appointment.create({
        data: {
          dateTime: appt_date,
          service: service || 'Soins',
          status: 'PLANIFIE',
          patientId: patientId || null,
          patientName: patientId ? null : (patientName || null),
          practitionerId: practitionerId || null,
          durationMinutes: duration,
        }
      });
      createdAppointments.push(appt);
    }

    res.status(201).json(createdAppointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la création en masse.' });
  }
}

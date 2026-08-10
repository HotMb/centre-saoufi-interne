import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

// ─────────────────────────────────────────────
// GET /api/sessions — Lister les séances
// Filtres : ?patientId=, ?practitionerId=
// Accès : ADMIN voit tout | PRATICIEN voit les siennes | SECRETAIRE voit tout (sans notes)
// ─────────────────────────────────────────────
export async function listSessions(req: Request, res: Response) {
  try {
    const { patientId, practitionerId, startDate, endDate } = req.query;
    const currentUser = (req as any).user;

    const where: any = {};
    if (patientId) where.patientId = patientId as string;

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      where.dateTime = { gte: start, lte: end };
    }

    // Un praticien ne voit que ses propres séances
    if (currentUser.role === 'PRATICIEN') {
      where.practitionerId = currentUser.id;
    } else if (practitionerId) {
      where.practitionerId = practitionerId as string;
    }

    // Un patient ne voit que ses propres séances
    if (currentUser.role === 'PATIENT') {
      if (!currentUser.patientId) return res.status(200).json([]);
      where.patientId = currentUser.patientId;
    }

    const sessions = await prisma.session.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, firstName: true } },
        practitioner: { select: { id: true, name: true } },
      },
      orderBy: { dateTime: 'desc' },
    });

    // La secrétaire ne voit pas les notes cliniques (confidentialité médicale)
    const result = sessions.map((s) => ({
      ...s,
      notes: currentUser.role === 'SECRETAIRE' ? '[Confidentiel — accès praticien uniquement]' : s.notes,
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error('Erreur listSessions:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des séances.' });
  }
}

// ─────────────────────────────────────────────
// GET /api/sessions/:id — Détail d'une séance
// Accès : ADMIN, PRATICIEN (la sienne)
// ─────────────────────────────────────────────
export async function getSession(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true, firstName: true, phone: true, birthDate: true } },
        practitioner: { select: { id: true, name: true } },
      },
    });

    if (!session) return res.status(404).json({ error: 'Séance non trouvée.' });

    // Un praticien ne peut consulter que ses propres séances
    if (currentUser.role === 'PRATICIEN' && session.practitionerId !== currentUser.id) {
      return res.status(403).json({ error: 'Accès interdit à cette séance.' });
    }

    // Un patient ne peut consulter que sa propre séance
    if (currentUser.role === 'PATIENT' && session.patientId !== currentUser.patientId) {
      return res.status(403).json({ error: 'Accès interdit.' });
    }

    return res.status(200).json(session);
  } catch (error) {
    console.error('Erreur getSession:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération de la séance.' });
  }
}

// ─────────────────────────────────────────────
// POST /api/sessions — Créer une séance (note de soin)
// Accès : PRATICIEN uniquement (le rédacteur est toujours le praticien connecté)
// ─────────────────────────────────────────────
export async function createSession(req: Request, res: Response) {
  try {
    const currentUser = (req as any).user;
    const { patientId, dateTime, service, notes, practitionerId: bodyPractitionerId } = req.body;

    if (!patientId || !dateTime || !service || !notes?.trim()) {
      return res.status(400).json({
        error: 'Champs obligatoires : patientId, dateTime, service, notes.',
      });
    }

    const rdvDate = new Date(dateTime);
    if (isNaN(rdvDate.getTime())) {
      return res.status(400).json({ error: 'Format de date invalide.' });
    }

    // ADMIN peut spécifier le praticien ; PRATICIEN est toujours l'auteur
    let finalPractitionerId: string;
    if (currentUser.role === 'ADMIN') {
      if (!bodyPractitionerId) return res.status(400).json({ error: 'En tant qu\'administrateur, veuillez spécifier le praticien.' });
      const prac = await prisma.user.findUnique({ where: { id: bodyPractitionerId } });
      if (!prac || prac.role !== 'PRATICIEN') return res.status(400).json({ error: 'Praticien introuvable ou rôle invalide.' });
      finalPractitionerId = bodyPractitionerId;
    } else {
      finalPractitionerId = currentUser.id;
    }

    // Vérifier que le patient existe
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé.' });

    const session = await prisma.session.create({
      data: {
        patientId,
        dateTime: rdvDate,
        service,
        notes: notes.trim(),
        practitionerId: finalPractitionerId,
      },
      include: {
        patient: { select: { id: true, name: true, firstName: true } },
        practitioner: { select: { id: true, name: true } },
      },
    });

    // Journalisation CNIL — action sensible (données médicales)
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'CREATION_SEANCE',
        details: `Note de soin créée par ${currentUser.username} pour ${patient.firstName} ${patient.name} le ${rdvDate.toLocaleString('fr-FR')}.`,
      },
    });

    return res.status(201).json(session);
  } catch (error) {
    console.error('Erreur createSession:', error);
    return res.status(500).json({ error: 'Erreur lors de la création de la séance.' });
  }
}

// ─────────────────────────────────────────────
// GET /api/sessions/:id/notes — Consignes d'une séance
// Accès : ADMIN, PRATICIEN
// ─────────────────────────────────────────────
export async function listSessionNotes(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;

    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) return res.status(404).json({ error: 'Séance non trouvée.' });

    if (currentUser.role === 'PRATICIEN' && session.practitionerId !== currentUser.id) {
      return res.status(403).json({ error: 'Accès interdit à cette séance.' });
    }

    const notes = await prisma.sessionNote.findMany({
      where: { sessionId: id },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return res.status(200).json(notes);
  } catch (error) {
    console.error('Erreur listSessionNotes:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des consignes.' });
  }
}

// ─────────────────────────────────────────────
// POST /api/sessions/:id/notes — Ajouter une consigne
// Accès : ADMIN, PRATICIEN
// ─────────────────────────────────────────────
export async function createSessionNote(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Le contenu de la consigne est obligatoire.' });
    }

    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) return res.status(404).json({ error: 'Séance non trouvée.' });

    if (currentUser.role === 'PRATICIEN' && session.practitionerId !== currentUser.id) {
      return res.status(403).json({ error: 'Vous ne pouvez ajouter des consignes qu\'à vos propres séances.' });
    }

    const note = await prisma.sessionNote.create({
      data: {
        sessionId: id,
        authorId: currentUser.id,
        content: content.trim(),
      },
      include: { author: { select: { id: true, name: true } } },
    });

    return res.status(201).json(note);
  } catch (error) {
    console.error('Erreur createSessionNote:', error);
    return res.status(500).json({ error: 'Erreur lors de l\'ajout de la consigne.' });
  }
}

// ─────────────────────────────────────────────
// DELETE /api/sessions/:id/notes/:noteId — Supprimer une consigne
// Accès : ADMIN, PRATICIEN (auteur uniquement)
// ─────────────────────────────────────────────
export async function deleteSessionNote(req: Request, res: Response) {
  try {
    const { id, noteId } = req.params;
    const currentUser = (req as any).user;

    const note = await prisma.sessionNote.findUnique({ where: { id: noteId } });
    if (!note || note.sessionId !== id) {
      return res.status(404).json({ error: 'Consigne non trouvée.' });
    }

    if (currentUser.role === 'PRATICIEN' && note.authorId !== currentUser.id) {
      return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres consignes.' });
    }

    await prisma.sessionNote.delete({ where: { id: noteId } });

    return res.status(200).json({ message: 'Consigne supprimée.' });
  } catch (error) {
    console.error('Erreur deleteSessionNote:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression de la consigne.' });
  }
}

// ─────────────────────────────────────────────
// DELETE /api/sessions/:id — Supprimer une séance
// Accès : ADMIN | PRATICIEN (uniquement la sienne)
// ─────────────────────────────────────────────
export async function deleteSession(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;

    const session = await prisma.session.findUnique({
      where: { id },
      include: { patient: { select: { name: true, firstName: true } } },
    });

    if (!session) return res.status(404).json({ error: 'Séance non trouvée.' });

    if (currentUser.role === 'PRATICIEN' && session.practitionerId !== currentUser.id) {
      return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres séances.' });
    }

    await prisma.session.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'SUPPRESSION_SEANCE',
        details: `Séance supprimée (ID: ${id}) — Patient: ${session.patient?.firstName} ${session.patient?.name}.`,
      },
    });

    return res.status(200).json({ message: 'Séance supprimée.' });
  } catch (error) {
    console.error('Erreur deleteSession:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression de la séance.' });
  }
}

// ─────────────────────────────────────────────
// PATCH /api/sessions/:id — Modifier une séance
// Accès : PRATICIEN (uniquement la sienne) | ADMIN
// ─────────────────────────────────────────────
export async function updateSession(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;
    const { notes, service } = req.body;

    const existing = await prisma.session.findUnique({
      where: { id },
      include: { patient: { select: { name: true, firstName: true } } },
    });

    if (!existing) return res.status(404).json({ error: 'Séance non trouvée.' });

    // Seul le praticien auteur peut modifier (sauf admin)
    if (currentUser.role === 'PRATICIEN' && existing.practitionerId !== currentUser.id) {
      return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres séances.' });
    }

    const updated = await prisma.session.update({
      where: { id },
      data: {
        notes: notes?.trim() ?? existing.notes,
        service: service ?? existing.service,
      },
      include: {
        patient: { select: { id: true, name: true, firstName: true } },
        practitioner: { select: { id: true, name: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'MODIFICATION_SEANCE',
        details: `Note de soin modifiée (ID: ${id}) — Patient: ${existing.patient?.firstName} ${existing.patient?.name}.`,
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Erreur updateSession:', error);
    return res.status(500).json({ error: 'Erreur lors de la modification de la séance.' });
  }
}

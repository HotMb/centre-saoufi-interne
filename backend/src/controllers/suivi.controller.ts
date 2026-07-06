import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { StatutSuivi } from '@prisma/client';

const STATUTS_VALIDES = Object.values(StatutSuivi);

// ─────────────────────────────────────────────
// GET /api/suivis — Liste des suivis
// Filtres : ?patientId=, ?practitionerId=, ?statut=
// ─────────────────────────────────────────────
export async function listSuivis(req: Request, res: Response) {
  try {
    const { patientId, practitionerId, statut } = req.query;
    const currentUser = (req as any).user;

    const where: any = {};
    if (patientId) where.patientId = patientId as string;
    if (statut) where.statut = statut as StatutSuivi;

    if (currentUser.role === 'PRATICIEN') {
      where.practitionerId = currentUser.id;
    } else if (practitionerId) {
      where.practitionerId = practitionerId as string;
    }

    if (currentUser.role === 'PATIENT') {
      if (!currentUser.patientId) return res.status(200).json([]);
      where.patientId = currentUser.patientId;
    }

    const suivis = await prisma.suiviPatient.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, firstName: true } },
        practitioner: { select: { id: true, name: true } },
        _count: { select: { notes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(suivis);
  } catch (error) {
    console.error('Erreur listSuivis:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des suivis.' });
  }
}

// ─────────────────────────────────────────────
// GET /api/suivis/:id — Détail d'un suivi (avec ses notes)
// ─────────────────────────────────────────────
export async function getSuivi(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;

    const suivi = await prisma.suiviPatient.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true, firstName: true, phone: true } },
        practitioner: { select: { id: true, name: true } },
        notes: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!suivi) return res.status(404).json({ error: 'Suivi non trouvé.' });

    if (currentUser.role === 'PRATICIEN' && suivi.practitionerId !== currentUser.id) {
      return res.status(403).json({ error: 'Accès interdit à ce suivi.' });
    }

    if (currentUser.role === 'PATIENT' && suivi.patientId !== currentUser.patientId) {
      return res.status(403).json({ error: 'Accès interdit.' });
    }

    return res.status(200).json(suivi);
  } catch (error) {
    console.error('Erreur getSuivi:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération du suivi.' });
  }
}

// ─────────────────────────────────────────────
// POST /api/suivis — Créer un suivi
// Accès : ADMIN (choisit le praticien), PRATICIEN (auteur auto)
// ─────────────────────────────────────────────
export async function createSuivi(req: Request, res: Response) {
  try {
    const currentUser = (req as any).user;
    const { patientId, practitionerId: bodyPractitionerId, pathologie, objectifs, seancesPrevues, dateDebut, dateFin } = req.body;

    if (!patientId || !pathologie || !seancesPrevues) {
      return res.status(400).json({ error: 'Champs obligatoires : patientId, pathologie, seancesPrevues.' });
    }

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé.' });

    let finalPractitionerId: string;
    if (currentUser.role === 'ADMIN') {
      if (!bodyPractitionerId) return res.status(400).json({ error: 'En tant qu\'administrateur, veuillez spécifier le praticien.' });
      const prac = await prisma.user.findUnique({ where: { id: bodyPractitionerId } });
      if (!prac || prac.role !== 'PRATICIEN') return res.status(400).json({ error: 'Praticien introuvable ou rôle invalide.' });
      finalPractitionerId = bodyPractitionerId;
    } else {
      finalPractitionerId = currentUser.id;
    }

    const suivi = await prisma.suiviPatient.create({
      data: {
        patientId,
        practitionerId: finalPractitionerId,
        pathologie,
        objectifs: objectifs || null,
        seancesPrevues: parseInt(seancesPrevues, 10),
        dateDebut: dateDebut ? new Date(dateDebut) : new Date(),
        dateFin: dateFin ? new Date(dateFin) : null,
        statut: StatutSuivi.EN_COURS,
      },
      include: {
        patient: { select: { id: true, name: true, firstName: true } },
        practitioner: { select: { id: true, name: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'CREATION_SUIVI',
        details: `Suivi créé pour ${patient.firstName} ${patient.name} — Pathologie: ${pathologie}.`,
      },
    });

    return res.status(201).json(suivi);
  } catch (error) {
    console.error('Erreur createSuivi:', error);
    return res.status(500).json({ error: 'Erreur lors de la création du suivi.' });
  }
}

// ─────────────────────────────────────────────
// PATCH /api/suivis/:id — Modifier un suivi
// Accès : ADMIN, PRATICIEN (le sien uniquement)
// ─────────────────────────────────────────────
export async function updateSuivi(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;
    const { pathologie, objectifs, seancesPrevues, dateFin, statut } = req.body;

    const existing = await prisma.suiviPatient.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Suivi non trouvé.' });

    if (currentUser.role === 'PRATICIEN' && existing.practitionerId !== currentUser.id) {
      return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres suivis.' });
    }

    if (statut && !STATUTS_VALIDES.includes(statut)) {
      return res.status(400).json({ error: `Statut invalide. Valeurs : ${STATUTS_VALIDES.join(', ')}.` });
    }

    const updated = await prisma.suiviPatient.update({
      where: { id },
      data: {
        pathologie: pathologie ?? existing.pathologie,
        objectifs: objectifs !== undefined ? objectifs : existing.objectifs,
        seancesPrevues: seancesPrevues ? parseInt(seancesPrevues, 10) : existing.seancesPrevues,
        dateFin: dateFin !== undefined ? (dateFin ? new Date(dateFin) : null) : existing.dateFin,
        statut: statut ?? existing.statut,
      },
      include: {
        patient: { select: { id: true, name: true, firstName: true } },
        practitioner: { select: { id: true, name: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'MODIFICATION_SUIVI',
        details: `Suivi ${id} modifié — Statut: ${updated.statut}.`,
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Erreur updateSuivi:', error);
    return res.status(500).json({ error: 'Erreur lors de la modification du suivi.' });
  }
}

// ─────────────────────────────────────────────
// DELETE /api/suivis/:id — Supprimer un suivi
// Accès : ADMIN uniquement
// ─────────────────────────────────────────────
export async function deleteSuivi(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const existing = await prisma.suiviPatient.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Suivi non trouvé.' });

    await prisma.suiviPatient.delete({ where: { id } });

    return res.status(200).json({ message: 'Suivi supprimé.' });
  } catch (error) {
    console.error('Erreur deleteSuivi:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression du suivi.' });
  }
}

// ─────────────────────────────────────────────
// GET /api/suivis/:id/notes — Notes de progression
// ─────────────────────────────────────────────
export async function listSuiviNotes(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;

    const suivi = await prisma.suiviPatient.findUnique({ where: { id } });
    if (!suivi) return res.status(404).json({ error: 'Suivi non trouvé.' });

    if (currentUser.role === 'PRATICIEN' && suivi.practitionerId !== currentUser.id) {
      return res.status(403).json({ error: 'Accès interdit.' });
    }

    const notes = await prisma.suiviNote.findMany({
      where: { suiviId: id },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return res.status(200).json(notes);
  } catch (error) {
    console.error('Erreur listSuiviNotes:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des notes.' });
  }
}

// ─────────────────────────────────────────────
// POST /api/suivis/:id/notes — Ajouter une note de progression
// ─────────────────────────────────────────────
export async function createSuiviNote(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;
    const { content } = req.body;

    if (!content?.trim()) return res.status(400).json({ error: 'Le contenu de la note est obligatoire.' });

    const suivi = await prisma.suiviPatient.findUnique({ where: { id } });
    if (!suivi) return res.status(404).json({ error: 'Suivi non trouvé.' });

    if (currentUser.role === 'PRATICIEN' && suivi.practitionerId !== currentUser.id) {
      return res.status(403).json({ error: 'Vous ne pouvez ajouter des notes qu\'à vos propres suivis.' });
    }

    const note = await prisma.suiviNote.create({
      data: { suiviId: id, authorId: currentUser.id, content: content.trim() },
      include: { author: { select: { id: true, name: true } } },
    });

    return res.status(201).json(note);
  } catch (error) {
    console.error('Erreur createSuiviNote:', error);
    return res.status(500).json({ error: 'Erreur lors de l\'ajout de la note.' });
  }
}

// ─────────────────────────────────────────────
// DELETE /api/suivis/:id/notes/:noteId
// ─────────────────────────────────────────────
export async function deleteSuiviNote(req: Request, res: Response) {
  try {
    const { id, noteId } = req.params;
    const currentUser = (req as any).user;

    const note = await prisma.suiviNote.findUnique({ where: { id: noteId } });
    if (!note || note.suiviId !== id) return res.status(404).json({ error: 'Note non trouvée.' });

    if (currentUser.role === 'PRATICIEN' && note.authorId !== currentUser.id) {
      return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres notes.' });
    }

    await prisma.suiviNote.delete({ where: { id: noteId } });

    return res.status(200).json({ message: 'Note supprimée.' });
  } catch (error) {
    console.error('Erreur deleteSuiviNote:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression de la note.' });
  }
}

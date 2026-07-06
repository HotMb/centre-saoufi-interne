import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

// GET /api/patients/:id/notes — ADMIN, PRATICIEN uniquement
export async function listPatientNotes(req: Request, res: Response) {
  try {
    const { id: patientId } = req.params;

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé.' });

    const notes = await prisma.patientNote.findMany({
      where: { patientId },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(notes);
  } catch (err) {
    console.error('Erreur listPatientNotes:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}

// POST /api/patients/:id/notes — ADMIN, PRATICIEN uniquement
export async function createPatientNote(req: Request, res: Response) {
  try {
    const currentUser = (req as any).user;
    const { id: patientId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) return res.status(400).json({ error: 'Le contenu de la note est obligatoire.' });

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé.' });

    const note = await prisma.patientNote.create({
      data: { patientId, authorId: currentUser.id, content: content.trim() },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'CREATION_NOTE_PATIENT',
        details: `Note ajoutée au dossier de ${patient.firstName} ${patient.name} par ${currentUser.username}.`,
      },
    });

    return res.status(201).json(note);
  } catch (err) {
    console.error('Erreur createPatientNote:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}

// DELETE /api/patients/:id/notes/:noteId — auteur ou ADMIN uniquement
export async function deletePatientNote(req: Request, res: Response) {
  try {
    const currentUser = (req as any).user;
    const { id: patientId, noteId } = req.params;

    const note = await prisma.patientNote.findUnique({
      where: { id: noteId },
      include: { patient: { select: { name: true, firstName: true } } },
    });

    if (!note || note.patientId !== patientId) return res.status(404).json({ error: 'Note non trouvée.' });

    if (currentUser.role !== 'ADMIN' && note.authorId !== currentUser.id) {
      return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres notes.' });
    }

    await prisma.patientNote.delete({ where: { id: noteId } });

    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'SUPPRESSION_NOTE_PATIENT',
        details: `Note (ID: ${noteId}) supprimée du dossier de ${note.patient?.firstName} ${note.patient?.name}.`,
      },
    });

    return res.status(204).send();
  } catch (err) {
    console.error('Erreur deletePatientNote:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}

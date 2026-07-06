import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

// ─────────────────────────────────────────────
// GET /api/patients — Liste tous les patients
// Accès : ADMIN, SECRETAIRE, PRATICIEN
// ─────────────────────────────────────────────
export async function listPatients(req: Request, res: Response) {
  try {
    const { search } = req.query;

    const patients = await prisma.patient.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search as string, mode: 'insensitive' } },
              { firstName: { contains: search as string, mode: 'insensitive' } },
              { phone: { contains: search as string } },
            ],
          }
        : undefined,
      select: {
        id: true,
        name: true,
        firstName: true,
        phone: true,
        email: true,
        birthDate: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return res.status(200).json(patients);
  } catch (error) {
    console.error('Erreur listPatients:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des patients.' });
  }
}

// ─────────────────────────────────────────────
// GET /api/patients/:id — Détail d'un patient
// Accès : ADMIN, SECRETAIRE, PRATICIEN
// ─────────────────────────────────────────────
export async function getPatient(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        appointments: {
          select: {
            id: true,
            dateTime: true,
            service: true,
            status: true,
          },
          orderBy: { dateTime: 'desc' },
          take: 10,
        },
        sessions: {
          select: {
            id: true,
            dateTime: true,
            service: true,
            notes: true,
          },
          orderBy: { dateTime: 'desc' },
          take: 10,
        },
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient non trouvé.' });
    }

    return res.status(200).json(patient);
  } catch (error) {
    console.error('Erreur getPatient:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération du patient.' });
  }
}

// ─────────────────────────────────────────────
// POST /api/patients — Créer un patient
// Accès : ADMIN, SECRETAIRE
// ─────────────────────────────────────────────
export async function createPatient(req: Request, res: Response) {
  try {
    const { name, firstName, phone, email, birthDate, address, medecinTraitant, pathologie } = req.body;

    // Validation des champs minimaux (conformité CNIL)
    if (!name?.trim() || !firstName?.trim() || !phone?.trim() || !birthDate || !address?.trim()) {
      return res.status(400).json({
        error: 'Champs obligatoires manquants : nom, prénom, téléphone, date de naissance, adresse.',
      });
    }

    // Vérification format date
    const parsedDate = new Date(birthDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'Format de date de naissance invalide.' });
    }

    const patient = await prisma.patient.create({
      data: {
        name: name.trim(),
        firstName: firstName.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        birthDate: parsedDate,
        address: address.trim(),
        medecinTraitant,
        pathologie
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        phone: true,
        email: true,
        birthDate: true,
        address: true,
        createdAt: true,
      },
    });

    // Journalisation CNIL
    await prisma.activityLog.create({
      data: {
        userId: (req as any).user?.id,
        action: 'CREATION_PATIENT',
        details: `Fiche patient créée : ${patient.firstName} ${patient.name} (ID: ${patient.id}) par ${(req as any).user?.username}.`,
      },
    });

    return res.status(201).json(patient);
  } catch (error) {
    console.error('Erreur createPatient:', error);
    return res.status(500).json({ error: 'Erreur lors de la création du patient.' });
  }
}

// ─────────────────────────────────────────────
// PATCH /api/patients/:id — Mettre à jour un patient
// Accès : ADMIN, SECRETAIRE
// ─────────────────────────────────────────────
export async function updatePatient(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, firstName, phone, email, birthDate, address, medecinTraitant, pathologie } = req.body;

    if (!name?.trim() || !firstName?.trim() || !phone?.trim() || !birthDate || !address?.trim()) {
      return res.status(400).json({
        error: 'Champs obligatoires manquants : nom, prénom, téléphone, date de naissance, adresse.',
      });
    }

    const parsedDate = new Date(birthDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'Format de date de naissance invalide.' });
    }

    // Vérifier que le patient existe
    const existing = await prisma.patient.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Patient non trouvé.' });
    }

    const updated = await prisma.patient.update({
      where: { id },
      data: {
        name: name.trim(),
        firstName: firstName.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        birthDate: parsedDate,
        address: address.trim(),
        medecinTraitant,
        pathologie,
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        phone: true,
        email: true,
        birthDate: true,
        address: true,
        updatedAt: true,
      },
    });

    // Journalisation CNIL
    await prisma.activityLog.create({
      data: {
        userId: (req as any).user?.id,
        action: 'MODIFICATION_PATIENT',
        details: `Fiche patient modifiée : ${updated.firstName} ${updated.name} (ID: ${updated.id}) par ${(req as any).user?.username}.`,
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Erreur updatePatient:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour du patient.' });
  }
}

// ─────────────────────────────────────────────
// DELETE /api/patients/:id — Supprimer un patient
// Accès : ADMIN uniquement (droit d'effacement CNIL)
// ─────────────────────────────────────────────
export async function deletePatient(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const existing = await prisma.patient.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Patient non trouvé.' });
    }

    await prisma.patient.delete({ where: { id } });

    // Journalisation CNIL
    await prisma.activityLog.create({
      data: {
        userId: (req as any).user?.id,
        action: 'SUPPRESSION_PATIENT',
        details: `Fiche patient supprimée : ${existing.firstName} ${existing.name} (ID: ${id}) par ${(req as any).user?.username}.`,
      },
    });

    return res.status(200).json({ message: 'Patient supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur deletePatient:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression du patient.' });
  }
}

// ─────────────────────────────────────────────
// POST /api/patients/bulk-import — Import CSV
// Accès : ADMIN, SECRETAIRE
// ─────────────────────────────────────────────
export async function bulkImportPatients(req: Request, res: Response) {
  try {
    const { patients } = req.body as { patients: Array<{ name: string; firstName: string; phone?: string; email?: string; birthDate?: string; address?: string; medecinTraitant?: string; pathologie?: string }> };

    if (!Array.isArray(patients) || patients.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à importer.' });
    }
    if (patients.length > 500) {
      return res.status(400).json({ error: 'Maximum 500 patients par import.' });
    }

    let created = 0;
    const importErrors: string[] = [];

    for (const p of patients) {
      if (!p.name || !p.firstName) { importErrors.push(`Ligne sans nom/prénom`); continue; }
      try {
        await prisma.patient.create({
          data: {
            name: p.name.trim(),
            firstName: p.firstName.trim(),
            phone: p.phone?.trim() || '',
            email: p.email?.trim() || null,
            birthDate: p.birthDate ? new Date(p.birthDate) : new Date('1970-01-01'),
            address: p.address?.trim() || null,
            medecinTraitant: p.medecinTraitant?.trim() || null,
            pathologie: p.pathologie?.trim() || null,
          },
        });
        created++;
      } catch {
        importErrors.push(`${p.firstName} ${p.name}`);
      }
    }

    await prisma.activityLog.create({
      data: {
        userId: (req as any).user?.id,
        action: 'IMPORT_CSV',
        details: `Import CSV : ${created} patient(s) créé(s), ${importErrors.length} erreur(s).`,
      },
    });

    return res.status(200).json({ created, errors: importErrors });
  } catch (error) {
    console.error('Erreur bulkImportPatients:', error);
    return res.status(500).json({ error: "Erreur lors de l'import." });
  }
}

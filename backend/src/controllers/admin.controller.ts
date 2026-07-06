import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma';
import { UserRole } from '@prisma/client';

export async function createUser(req: Request, res: Response) {
  try {
    const { name, username, password, role } = req.body;

    if (!name || !username || !password || !role) {
      return res.status(400).json({ error: 'Tous les champs (nom, identifiant, mot de passe, rôle) sont requis.' });
    }

    const cleanUsername = username.toLowerCase().trim();

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Cet identifiant est déjà utilisé.' });
    }

    // Valider le rôle
    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide.' });
    }

    // Hashage du mot de passe
    const passwordHash = await bcrypt.hash(password, 10);

    // Création de l'utilisateur
    const user = await prisma.user.create({
      data: {
        name,
        username: cleanUsername,
        password_hash: passwordHash,
        role,
        enabled: true,
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        enabled: true,
        createdAt: true,
      },
    });

    // Loguer l'activité
    await prisma.activityLog.create({
      data: {
        userId: (req as any).user?.id,
        action: 'CREATION_UTILISATEUR',
        details: `Création du compte ${user.username} (${user.role}) par ${(req as any).user?.username}.`,
      },
    });

    return res.status(201).json(user);
  } catch (error) {
    console.error('Erreur createUser:', error);
    return res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur.' });
  }
}

export async function listUsers(req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        enabled: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json(users);
  } catch (error) {
    console.error('Erreur listUsers:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs.' });
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, role } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'Le nom et le rôle sont requis.' });
    }

    // Valider le rôle
    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide.' });
    }

    // Empêcher un admin de modifier son propre rôle pour ne pas perdre l'accès admin par accident
    if (id === (req as any).user?.id && role !== UserRole.ADMIN) {
      return res.status(400).json({ error: 'Vous ne pouvez pas rétrograder votre propre rôle administrateur.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { name, role },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        enabled: true,
      },
    });

    // Loguer l'activité
    await prisma.activityLog.create({
      data: {
        userId: (req as any).user?.id,
        action: 'EDITION_UTILISATEUR',
        details: `Modification du compte ${updatedUser.username} par ${(req as any).user?.username}. Nouveau rôle : ${updatedUser.role}.`,
      },
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Erreur updateUser:', error);
    return res.status(500).json({ error: 'Erreur lors de la modification de l\'utilisateur.' });
  }
}

export async function toggleUserStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    // Empêcher de se désactiver soi-même
    if (id === (req as any).user?.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas désactiver votre propre compte.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { enabled: !user.enabled },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        enabled: true,
      },
    });

    const statusStr = updatedUser.enabled ? 'activé' : 'désactivé';

    // Loguer l'activité
    await prisma.activityLog.create({
      data: {
        userId: (req as any).user?.id,
        action: 'STATUT_UTILISATEUR',
        details: `Le compte ${updatedUser.username} a été ${statusStr} par ${(req as any).user?.username}.`,
      },
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Erreur toggleUserStatus:', error);
    return res.status(500).json({ error: 'Erreur lors du changement de statut de l\'utilisateur.' });
  }
}

export async function getStats(req: Request, res: Response) {
  try {
    const [totalPatients, totalSessions, appointments] = await Promise.all([
      prisma.patient.count(),
      prisma.session.count(),
      prisma.appointment.findMany({
        select: {
          service: true,
          status: true,
          dateTime: true,
          practitioner: { select: { name: true } },
        },
      }),
    ]);

    const byService: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byPractitioner: Record<string, number> = {};
    const byMonth: Record<string, number> = {};

    appointments.forEach(a => {
      byService[a.service] = (byService[a.service] || 0) + 1;
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
      const pName = a.practitioner?.name ?? 'Non assigné';
      byPractitioner[pName] = (byPractitioner[pName] || 0) + 1;
      const month = a.dateTime.toISOString().slice(0, 7);
      byMonth[month] = (byMonth[month] || 0) + 1;
    });

    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return d.toISOString().slice(0, 7);
    });

    return res.status(200).json({
      totals: { appointments: appointments.length, patients: totalPatients, sessions: totalSessions },
      byService: Object.entries(byService).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, count: v })),
      byStatus: Object.entries(byStatus).map(([k, v]) => ({ label: k, count: v })),
      byPractitioner: Object.entries(byPractitioner).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, count: v })),
      byMonth: last6Months.map(m => ({ month: m, count: byMonth[m] || 0 })),
    });
  } catch (error) {
    console.error('Erreur getStats:', error);
    return res.status(500).json({ error: 'Erreur lors du calcul des statistiques.' });
  }
}

export async function resetUserPassword(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé.' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { password_hash: passwordHash } });

    await prisma.activityLog.create({
      data: {
        userId: (req as any).user?.id,
        action: 'RESET_MOT_DE_PASSE',
        details: `Mot de passe réinitialisé pour ${user.username} par ${(req as any).user?.username}.`,
      },
    });

    return res.status(200).json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (error) {
    console.error('Erreur resetUserPassword:', error);
    return res.status(500).json({ error: 'Erreur lors de la réinitialisation.' });
  }
}

export async function getActivityLogs(req: Request, res: Response) {
  try {
    const logs = await prisma.activityLog.findMany({
      include: {
        user: {
          select: {
            username: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limite à 100 logs pour la lisibilité
    });

    return res.status(200).json(logs);
  } catch (error) {
    console.error('Erreur getActivityLogs:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des logs d\'activité.' });
  }
}
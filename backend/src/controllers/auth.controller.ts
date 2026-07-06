import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma';
import { withDbRetry } from '../utils/dbRetry';

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Veuillez saisir votre identifiant et votre mot de passe.' });
    }

    // Recherche de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() },
    });

    if (!user) {
      return res.status(401).json({ error: 'Identifiants de connexion incorrects.' });
    }

    if (!user.enabled) {
      return res.status(403).json({ error: 'Ce compte utilisateur a été désactivé par l\'administrateur.' });
    }

    // Vérification du mot de passe
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Identifiants de connexion incorrects.' });
    }

    // Création de la session (utilisation de 'any' pour éviter les soucis de type express-session)
    const session = req.session as any;
    session.user = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      patientId: user.patientId, // Inclus pour le rôle PATIENT
    };

    // Logger l'activité
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'CONNEXION',
        details: `L'utilisateur ${user.username} s'est connecté avec le rôle ${user.role}.`,
      },
    });

    return res.status(200).json({
      message: 'Connexion réussie.',
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        patientId: user.patientId,
      },
    });
  } catch (error) {
    console.error('Erreur login:', error);
    return res.status(500).json({ error: 'Une erreur interne est survenue lors de la connexion.' });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const session = req.session as any;
    const user = session?.user;

    if (user) {
      // Logger l'activité
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'DECONNEXION',
          details: `L'utilisateur ${user.username} s'est déconnecté.`,
        },
      });
    }

    req.session.destroy((err) => {
      if (err) {
        console.error('Erreur lors de la destruction de la session:', err);
        return res.status(500).json({ error: 'Erreur lors de la déconnexion.' });
      }

      res.clearCookie('connect.sid'); // nom du cookie par défaut d'express-session
      return res.status(200).json({ message: 'Déconnexion réussie.' });
    });
  } catch (error) {
    console.error('Erreur logout:', error);
    return res.status(500).json({ error: 'Une erreur interne est survenue lors de la déconnexion.' });
  }
}

export async function me(req: Request, res: Response) {
  try {
    const session = req.session as any;
    if (!session || !session.user) {
      return res.status(200).json({ user: null });
    }

    // Récupérer des infos fraîches de la DB pour vérifier que l'utilisateur est toujours actif
    // (1 réessai en cas de connexion froide à la base après veille/inactivité)
    const user = await withDbRetry(() =>
      prisma.user.findUnique({ where: { id: session.user.id } })
    );

    if (!user || !user.enabled) {
      req.session.destroy(() => {});
      res.clearCookie('connect.sid');
      return res.status(401).json({ error: 'Compte désactivé ou inexistant.' });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        patientId: user.patientId,
      },
    });
  } catch (error) {
    console.error('Erreur profil /me:', error);
    return res.status(500).json({ error: 'Une erreur interne est survenue lors de la récupération du profil.' });
  }
}
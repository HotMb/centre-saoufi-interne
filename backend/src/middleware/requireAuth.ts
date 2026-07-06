import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  if (!session || !session.user) {
    return res.status(401).json({
      error: 'Non authentifié. Veuillez vous connecter.',
    });
  }

  // Assigner l'utilisateur de la session à la requête en bypassant les vérifications de type strictes d'Express
  (req as any).user = session.user;
  next();
}
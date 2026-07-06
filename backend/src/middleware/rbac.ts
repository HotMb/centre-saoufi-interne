import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Non authentifié. Veuillez vous connecter.' });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        error: `Accès interdit. Rôle '${user.role}' non autorisé pour cette action.`,
      });
    }

    next();
  };
}
import express from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { prisma } from '../config/prisma';

const router = express.Router();
router.use(requireAuth);

// GET /api/users/practitioners — Liste des praticiens actifs
// Accès : tous les rôles authentifiés (ADMIN, SECRETAIRE, PRATICIEN, PATIENT)
router.get('/practitioners', async (req, res) => {
  try {
    const practitioners = await prisma.user.findMany({
      where: { role: 'PRATICIEN', enabled: true },
      select: { id: true, name: true, role: true, enabled: true },
      orderBy: { name: 'asc' },
    });
    return res.status(200).json(practitioners);
  } catch {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;

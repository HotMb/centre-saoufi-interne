import express from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRoles } from '../middleware/rbac';
import { UserRole } from '@prisma/client';
import {
  listSuivis,
  getSuivi,
  createSuivi,
  updateSuivi,
  deleteSuivi,
  listSuiviNotes,
  createSuiviNote,
  deleteSuiviNote,
} from '../controllers/suivi.controller';

const router = express.Router();

router.use(requireAuth);

router.get('/', requireRoles(UserRole.ADMIN, UserRole.SECRETAIRE, UserRole.PRATICIEN, UserRole.PATIENT), listSuivis);
router.post('/', requireRoles(UserRole.ADMIN, UserRole.PRATICIEN), createSuivi);

// Notes — déclarer AVANT /:id pour éviter le conflit de route
router.get('/:id/notes', requireRoles(UserRole.ADMIN, UserRole.PRATICIEN), listSuiviNotes);
router.post('/:id/notes', requireRoles(UserRole.ADMIN, UserRole.PRATICIEN), createSuiviNote);
router.delete('/:id/notes/:noteId', requireRoles(UserRole.ADMIN, UserRole.PRATICIEN), deleteSuiviNote);

router.get('/:id', requireRoles(UserRole.ADMIN, UserRole.SECRETAIRE, UserRole.PRATICIEN, UserRole.PATIENT), getSuivi);
router.patch('/:id', requireRoles(UserRole.ADMIN, UserRole.PRATICIEN), updateSuivi);
router.delete('/:id', requireRoles(UserRole.ADMIN), deleteSuivi);

export default router;

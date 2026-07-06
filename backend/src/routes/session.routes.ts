import express from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRoles } from '../middleware/rbac';
import { UserRole } from '@prisma/client';
import {
  listSessions,
  getSession,
  createSession,
  updateSession,
  listSessionNotes,
  createSessionNote,
  deleteSessionNote,
} from '../controllers/session.controller';

const router = express.Router();

router.use(requireAuth);

// Lecture : ADMIN, SECRETAIRE, PRATICIEN, PATIENT
router.get('/', requireRoles(UserRole.ADMIN, UserRole.SECRETAIRE, UserRole.PRATICIEN, UserRole.PATIENT), listSessions);
router.get('/:id', requireRoles(UserRole.ADMIN, UserRole.SECRETAIRE, UserRole.PRATICIEN, UserRole.PATIENT), getSession);

// Création : PRATICIEN (auteur automatique) et ADMIN (peut choisir le praticien)
router.post('/', requireRoles(UserRole.PRATICIEN, UserRole.ADMIN), createSession);

// Modification : PRATICIEN (la sienne) et ADMIN
router.patch('/:id', requireRoles(UserRole.ADMIN, UserRole.PRATICIEN), updateSession);

// Consignes — IMPORTANT : déclarer AVANT /:id pour éviter le conflit de route
router.get('/:id/notes', requireRoles(UserRole.ADMIN, UserRole.PRATICIEN), listSessionNotes);
router.post('/:id/notes', requireRoles(UserRole.ADMIN, UserRole.PRATICIEN), createSessionNote);
router.delete('/:id/notes/:noteId', requireRoles(UserRole.ADMIN, UserRole.PRATICIEN), deleteSessionNote);

export default router;

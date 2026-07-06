import express from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRoles } from '../middleware/rbac';
import { UserRole } from '@prisma/client';
import {
  listPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
  bulkImportPatients,
} from '../controllers/patient.controller';
import {
  listPatientNotes,
  createPatientNote,
  deletePatientNote,
} from '../controllers/note.controller';

const router = express.Router();

// Toutes les routes requièrent une session active
router.use(requireAuth);

// Lecture : ADMIN, SECRETAIRE, PRATICIEN
router.get('/', requireRoles(UserRole.ADMIN, UserRole.SECRETAIRE, UserRole.PRATICIEN), listPatients);
router.get('/:id', requireRoles(UserRole.ADMIN, UserRole.SECRETAIRE, UserRole.PRATICIEN), getPatient);

// Écriture : ADMIN, SECRETAIRE
router.post('/bulk-import', requireRoles(UserRole.ADMIN, UserRole.SECRETAIRE), bulkImportPatients);
router.post('/', requireRoles(UserRole.ADMIN, UserRole.SECRETAIRE), createPatient);
router.patch('/:id', requireRoles(UserRole.ADMIN, UserRole.SECRETAIRE), updatePatient);

// Suppression : ADMIN uniquement (droit d'effacement CNIL)
router.delete('/:id', requireRoles(UserRole.ADMIN), deletePatient);

// Notes du dossier patient : ADMIN et PRATICIEN uniquement (données médicales — SECRETAIRE exclu)
router.get('/:id/notes', requireRoles(UserRole.ADMIN, UserRole.PRATICIEN), listPatientNotes);
router.post('/:id/notes', requireRoles(UserRole.ADMIN, UserRole.PRATICIEN), createPatientNote);
router.delete('/:id/notes/:noteId', requireRoles(UserRole.ADMIN, UserRole.PRATICIEN), deletePatientNote);

export default router;

import express from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRoles } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { AppointmentSchema, AppointmentUpdateSchema } from '../validation/schemas';
import { UserRole } from '@prisma/client';
import {
  listAppointments,
  getAppointment,
  createAppointment,
  createBulkAppointments,
  updateAppointment,
  deleteAppointment,
} from '../controllers/appointment.controller';

const router = express.Router();

router.use(requireAuth);

// Lecture : ADMIN, SECRETAIRE, PRATICIEN, PATIENT (filtrage interne par rôle)
router.get('/', requireRoles(UserRole.ADMIN, UserRole.SECRETAIRE, UserRole.PRATICIEN, UserRole.PATIENT), listAppointments);
router.get('/:id', requireRoles(UserRole.ADMIN, UserRole.SECRETAIRE, UserRole.PRATICIEN, UserRole.PATIENT), getAppointment);

// Écriture : ADMIN, SECRETAIRE, PATIENT (seulement pour la prise de RDV)
router.post('/', requireRoles(UserRole.ADMIN, UserRole.SECRETAIRE, UserRole.PATIENT, UserRole.PRATICIEN), validate(AppointmentSchema), createAppointment);
router.post('/bulk', requireRoles(UserRole.ADMIN, UserRole.SECRETAIRE), createBulkAppointments);
router.patch('/:id', requireRoles(UserRole.ADMIN, UserRole.SECRETAIRE), validate(AppointmentUpdateSchema), updateAppointment);

// Suppression : ADMIN, SECRETAIRE
router.delete('/:id', requireRoles(UserRole.ADMIN, UserRole.SECRETAIRE), deleteAppointment);

export default router;

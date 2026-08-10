import express from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRoles } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { CreateUserSchema, UpdatePasswordSchema } from '../validation/schemas';
import { UserRole } from '@prisma/client';
import {
  createUser,
  listUsers,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
  getActivityLogs,
  getStats,
  triggerReminders,
} from '../controllers/admin.controller';

const router = express.Router();

// Protection de toutes les routes admin
router.use(requireAuth);
router.use(requireRoles(UserRole.ADMIN));

// Routes de gestion des comptes
router.get('/users', listUsers);
router.post('/users', validate(CreateUserSchema), createUser);
router.patch('/users/:id', updateUser);
router.post('/users/:id/toggle', toggleUserStatus);
router.patch('/users/:id/password', validate(UpdatePasswordSchema), resetUserPassword);

// Statistiques globales
router.get('/stats', getStats);

// Route du journal d'activité
router.get('/logs', getActivityLogs);

// Déclenchement manuel des rappels email (test / rattrapage)
router.post('/trigger-reminders', triggerReminders);

export default router;
import { z } from 'zod';

export const PatientSchema = z.object({
  name: z.string().min(1, 'Le nom est requis.').max(100),
  firstName: z.string().min(1, 'Le prénom est requis.').max(100),
  phone: z.string().min(1, 'Le téléphone est requis.').max(20),
  birthDate: z.string().refine(d => !isNaN(Date.parse(d)), { message: 'Date de naissance invalide.' }),
  email: z.string().email('Email invalide.').max(150).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  medecinTraitant: z.string().max(100).optional().nullable(),
  pathologie: z.string().max(500).optional().nullable(),
});

export const PatientUpdateSchema = PatientSchema.partial().extend({
  name: z.string().min(1).max(100).optional(),
});

export const AppointmentSchema = z.object({
  dateTime: z.string().refine(d => !isNaN(Date.parse(d)), { message: 'Date/heure invalide.' }),
  service: z.string().min(1, 'Le service est requis.').max(100),
  durationMinutes: z.number().int().min(15).max(240).optional(),
  patientId: z.string().uuid('ID patient invalide.').optional().nullable(),
  patientName: z.string().min(1).max(100).optional().nullable(),
  practitionerId: z.string().uuid('ID praticien invalide.').optional().nullable(),
}).refine(d => d.patientId || d.patientName, {
  message: 'Un patient (inscrit ou nom libre) est requis.',
  path: ['patientId'],
});

export const AppointmentUpdateSchema = z.object({
  status: z.enum(['PLANIFIE', 'ANNULE', 'REPORTE', 'REALISE']).optional(),
  dateTime: z.string().refine(d => !isNaN(Date.parse(d)), { message: 'Date/heure invalide.' }).optional(),
  service: z.string().min(1).max(100).optional(),
  durationMinutes: z.number().int().min(15).max(240).optional(),
  practitionerId: z.string().uuid().optional().nullable(),
});

export const SessionSchema = z.object({
  patientId: z.string().uuid('ID patient invalide.'),
  dateTime: z.string().refine(d => !isNaN(Date.parse(d)), { message: 'Date/heure invalide.' }),
  service: z.string().min(1, 'Le service est requis.').max(100),
  notes: z.string().min(1, 'Les notes sont requises.').max(5000),
  practitionerId: z.string().uuid().optional().nullable(),
});

export const CreateUserSchema = z.object({
  name: z.string().min(1, 'Le nom est requis.').max(100),
  username: z.string()
    .min(3, "L'identifiant doit contenir au moins 3 caractères.")
    .max(50)
    .regex(/^[a-z0-9._-]+$/, 'Identifiant invalide (lettres minuscules, chiffres, . _ - uniquement).'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères.'),
  role: z.enum(['ADMIN', 'SECRETAIRE', 'PRATICIEN', 'PATIENT'], { message: 'Rôle invalide.' }),
});

export const UpdatePasswordSchema = z.object({
  newPassword: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères.'),
});

export const SuiviSchema = z.object({
  patientId: z.string().uuid('ID patient invalide.'),
  practitionerId: z.string().uuid('ID praticien invalide.').optional(),
  pathologie: z.string().min(1, 'La pathologie est requise.').max(200),
  objectifs: z.string().max(1000).optional().nullable(),
  seancesPrevues: z.number().int().min(1, 'Nombre de séances invalide.').max(500),
  dateDebut: z.string().refine(d => !isNaN(Date.parse(d))).optional(),
  dateFin: z.string().refine(d => !isNaN(Date.parse(d))).optional().nullable(),
  statut: z.enum(['EN_COURS', 'EN_PAUSE', 'TERMINE', 'INTERROMPU']).optional(),
});

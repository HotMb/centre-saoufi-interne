export type UserRole = 'ADMIN' | 'SECRETAIRE' | 'PRATICIEN' | 'PATIENT';

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  enabled?: boolean;
  patientId?: string | null;
}

export interface Patient {
  id: string;
  name: string;
  firstName: string;
  phone: string;
  email?: string | null;
  birthDate: string;
  address?: string;
  medecinTraitant?: string | null;
  pathologie?: string | null;
  createdAt?: string;
  appointments?: { id: string; dateTime: string; service: string; status: string }[];
  sessions?: { id: string; dateTime: string; service: string; notes: string }[];
}

export interface SessionNote {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
  author?: { id: string; name: string };
}

export interface Session {
  id: string;
  dateTime: string;
  service: string;
  notes: string;
  patientId: string;
  practitionerId: string;
  patient?: { id: string; name: string; firstName: string };
  practitioner?: { id: string; name: string };
  createdAt?: string;
}

export interface Appointment {
  id: string;
  dateTime: string;
  service: string;
  status: string;
  patientId?: string | null;
  patientName?: string | null;
  durationMinutes?: number;
  patient?: { id: string; name: string; firstName: string; phone?: string } | null;
  practitioner?: { id: string; name: string } | null;
}

export interface Practitioner {
  id: string;
  name: string;
  role: string;
  enabled: boolean;
}

export interface PatientNote {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
  author?: { name: string };
}

export type StatutSuivi = 'EN_COURS' | 'EN_PAUSE' | 'TERMINE' | 'INTERROMPU';

export interface SuiviNote {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
  author?: { id: string; name: string };
}

export interface SuiviPatient {
  id: string;
  patientId: string;
  practitionerId: string;
  pathologie: string;
  objectifs?: string | null;
  seancesPrevues: number;
  dateDebut: string;
  dateFin?: string | null;
  statut: StatutSuivi;
  patient?: { id: string; name: string; firstName: string };
  practitioner?: { id: string; name: string };
  notes?: SuiviNote[];
  _count?: { notes: number };
  createdAt: string;
  updatedAt: string;
}

export const SERVICES = [
  // Kinésithérapie
  'Kinésithérapie motrice',
  'Kinésithérapie respiratoire',
  'Kinésithérapie neurologique',
  'Kinésithérapie périnéale',
  'Kinésithérapie maxillo-faciale',
  // Hijjama / Cupping
  'Hijjama médicale',
  'Hijjama nabawiyya',
  'Hijjama sportive',
  // Soins visage
  'Soin visage basique',
  'Soin visage profond',
  'Soin visage hydratation',
  'Microneedling',
  'Dermabrasion à pointe de diamant',
  // Beauté
  'Lifting colombien',
] as const;

export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PLANIFIE: { label: 'Planifié',  color: 'var(--color-primary-dark)' },
  REALISE:  { label: 'Réalisé',   color: 'var(--color-success)' },
  ANNULE:   { label: 'Annulé',    color: 'var(--color-error)' },
  REPORTE:  { label: 'Reporté',   color: 'var(--color-warning)' },
};

export const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  ADMIN:      { bg: '#fef3c7', color: '#b45309' },
  SECRETAIRE: { bg: '#ede9fe', color: '#7c3aed' },
  PRATICIEN:  { bg: '#d1fae5', color: '#065f46' },
  PATIENT:    { bg: '#e0f2fe', color: '#0369a1' },
};

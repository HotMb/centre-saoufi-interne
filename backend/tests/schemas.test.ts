import { PatientSchema, CreateUserSchema, AppointmentSchema, SessionSchema } from '../src/validation/schemas';

describe('PatientSchema', () => {
  const valid = { name: 'ALAOUI', firstName: 'Youssef', phone: '0661234567', birthDate: '1985-03-15' };

  test('valide un patient minimal', () => {
    expect(PatientSchema.safeParse(valid).success).toBe(true);
  });

  test('valide un patient complet', () => {
    expect(PatientSchema.safeParse({ ...valid, email: 'y@email.ma', address: '14 rue Ibn Khaldoun', medecinTraitant: 'Dr. Benali', pathologie: 'Lombalgie' }).success).toBe(true);
  });

  test('rejette si nom manquant', () => {
    const { name, ...rest } = valid;
    expect(PatientSchema.safeParse(rest).success).toBe(false);
  });

  test('rejette si téléphone manquant', () => {
    const { phone, ...rest } = valid;
    expect(PatientSchema.safeParse(rest).success).toBe(false);
  });

  test('rejette une date de naissance invalide', () => {
    expect(PatientSchema.safeParse({ ...valid, birthDate: 'pas-une-date' }).success).toBe(false);
  });

  test('rejette un email mal formé', () => {
    expect(PatientSchema.safeParse({ ...valid, email: 'pasunmail' }).success).toBe(false);
  });
});

describe('CreateUserSchema', () => {
  const valid = { name: 'MABROUK Manal', username: 'mabrouk', password: 'Secret123', role: 'PRATICIEN' };

  test('valide un compte praticien', () => {
    expect(CreateUserSchema.safeParse(valid).success).toBe(true);
  });

  test('rejette un rôle inexistant', () => {
    expect(CreateUserSchema.safeParse({ ...valid, role: 'CHEF' }).success).toBe(false);
  });

  test('rejette un mot de passe trop court (< 6 car.)', () => {
    expect(CreateUserSchema.safeParse({ ...valid, password: '123' }).success).toBe(false);
  });

  test('rejette un identifiant trop court (< 3 car.)', () => {
    expect(CreateUserSchema.safeParse({ ...valid, username: 'ab' }).success).toBe(false);
  });

  test('rejette un identifiant avec majuscules', () => {
    expect(CreateUserSchema.safeParse({ ...valid, username: 'Mabrouk' }).success).toBe(false);
  });
});

describe('AppointmentSchema', () => {
  const valid = { dateTime: '2026-08-12T08:30:00.000Z', service: 'Kinésithérapie', patientId: '00000000-0000-0000-0000-000000000001' };

  test('valide un RDV avec patient inscrit', () => {
    expect(AppointmentSchema.safeParse(valid).success).toBe(true);
  });

  test('valide un RDV avec patient libre', () => {
    const { patientId, ...rest } = valid;
    expect(AppointmentSchema.safeParse({ ...rest, patientName: 'EL FASSI Mohamed' }).success).toBe(true);
  });

  test('rejette si ni patientId ni patientName', () => {
    const { patientId, ...rest } = valid;
    expect(AppointmentSchema.safeParse(rest).success).toBe(false);
  });

  test('rejette une date invalide', () => {
    expect(AppointmentSchema.safeParse({ ...valid, dateTime: 'pas-une-date' }).success).toBe(false);
  });
});

describe('SessionSchema', () => {
  const valid = {
    patientId: '00000000-0000-0000-0000-000000000001',
    dateTime: '2026-08-12T08:30:00.000Z',
    service: 'Kinésithérapie',
    notes: 'Séance de rééducation lombaire.',
  };

  test('valide une séance correcte', () => {
    expect(SessionSchema.safeParse(valid).success).toBe(true);
  });

  test('rejette si notes vides', () => {
    expect(SessionSchema.safeParse({ ...valid, notes: '' }).success).toBe(false);
  });

  test('rejette un patientId non-UUID', () => {
    expect(SessionSchema.safeParse({ ...valid, patientId: 'abc123' }).success).toBe(false);
  });
});

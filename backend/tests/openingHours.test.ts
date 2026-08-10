import { isWithinOpeningHours } from '../src/utils/openingHours';

// Construit une date UTC à partir d'un horaire Maroc (UTC+1).
// On force le parsing en UTC avec Z, puis on soustrait 1h (Maroc = UTC+1).
function marocDate(isoLocal: string): Date {
  return new Date(new Date(`${isoLocal}Z`).getTime() - 60 * 60 * 1000);
}

describe('isWithinOpeningHours — Lundi-Vendredi', () => {
  // Lundi 10 août 2026
  test('09:30 accepté (premier créneau matin)', () => {
    expect(isWithinOpeningHours(marocDate('2026-08-10T09:30:00'))).toEqual({ valid: true });
  });

  test('12:30 accepté (dernier créneau matin)', () => {
    expect(isWithinOpeningHours(marocDate('2026-08-10T12:30:00'))).toEqual({ valid: true });
  });

  test('13:00 rejeté (pause méridienne)', () => {
    const r = isWithinOpeningHours(marocDate('2026-08-10T13:00:00'));
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('09:30-12:30');
  });

  test('15:30 accepté (premier créneau après-midi)', () => {
    expect(isWithinOpeningHours(marocDate('2026-08-10T15:30:00'))).toEqual({ valid: true });
  });

  test('18:30 accepté (dernier créneau après-midi)', () => {
    expect(isWithinOpeningHours(marocDate('2026-08-10T18:30:00'))).toEqual({ valid: true });
  });

  test('19:00 rejeté (après fermeture)', () => {
    expect(isWithinOpeningHours(marocDate('2026-08-10T19:00:00')).valid).toBe(false);
  });

  test('09:00 rejeté (avant ouverture)', () => {
    expect(isWithinOpeningHours(marocDate('2026-08-10T09:00:00')).valid).toBe(false);
  });
});

describe('isWithinOpeningHours — Dimanche', () => {
  test('dimanche rejeté quelle que soit l\'heure', () => {
    const r = isWithinOpeningHours(marocDate('2026-08-09T10:00:00'));
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('dimanche');
  });
});

describe('isWithinOpeningHours — Samedi', () => {
  // Samedi 15 août 2026
  test('09:00 accepté (ouverture samedi)', () => {
    expect(isWithinOpeningHours(marocDate('2026-08-15T09:00:00'))).toEqual({ valid: true });
  });

  test('14:00 accepté (dernier créneau samedi)', () => {
    expect(isWithinOpeningHours(marocDate('2026-08-15T14:00:00'))).toEqual({ valid: true });
  });

  test('14:30 rejeté (hors horaires samedi)', () => {
    const r = isWithinOpeningHours(marocDate('2026-08-15T14:30:00'));
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('samedi');
  });

  test('08:30 rejeté (avant ouverture samedi)', () => {
    expect(isWithinOpeningHours(marocDate('2026-08-15T08:30:00')).valid).toBe(false);
  });
});

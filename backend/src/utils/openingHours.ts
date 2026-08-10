// Africa/Casablanca = UTC+1 permanent depuis octobre 2018 (pas de DST)
const CASABLANCA_OFFSET_MS = 60 * 60 * 1000;

export function isWithinOpeningHours(date: Date): { valid: boolean; reason?: string } {
  const casablanca = new Date(date.getTime() + CASABLANCA_OFFSET_MS);
  const day = casablanca.getUTCDay();
  const hours = casablanca.getUTCHours();
  const minutes = casablanca.getUTCMinutes();
  const time = hours + minutes / 60;

  if (day === 0) {
    return { valid: false, reason: 'Le centre est fermé le dimanche.' };
  }

  if (day >= 1 && day <= 5) {
    const isMatin = time >= 9.5 && time <= 12.5;
    const isAprem = time >= 15.5 && time <= 18.5;
    if (!isMatin && !isAprem) {
      return {
        valid: false,
        reason: 'Horaires en semaine : 09:30-12:30 et 15:30-18:30 (dernier créneau 1h avant la fermeture).',
      };
    }
  }

  if (day === 6) {
    if (time < 9.0 || time > 14.0) {
      return {
        valid: false,
        reason: 'Horaires le samedi : 09:00-14:00 (dernier créneau 1h avant la fermeture).',
      };
    }
  }

  return { valid: true };
}

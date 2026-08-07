import { Appointment } from '../types';

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR');
}

export function calcAge(birthDateIso: string) {
  const birth = new Date(birthDateIso);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age--;
  return age;
}

export function getStartOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

export function exportToICS(appointments: Appointment[]) {
  const toICSDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Centre Saoufi//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Centre Saoufi – Agenda',
    'X-WR-TIMEZONE:Africa/Casablanca',
  ];

  appointments.forEach(a => {
    const start = new Date(a.dateTime);
    const end = new Date(start.getTime() + (a.durationMinutes || 30) * 60 * 1000);
    const displayName = a.patient
      ? `${a.patient.firstName} ${a.patient.name}`
      : (a.patientName || 'Patient');

    lines.push(
      'BEGIN:VEVENT',
      `UID:${a.id}@centresaoufi`,
      `DTSTART:${toICSDate(start)}`,
      `DTEND:${toICSDate(end)}`,
      `SUMMARY:${displayName} – ${a.service}`,
      `DESCRIPTION:Service: ${a.service}\\nStatut: ${a.status}\\nDurée: ${a.durationMinutes || 30} min`,
      `STATUS:${a.status === 'ANNULE' ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT',
    );
  });

  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `saoufi-agenda-${new Date().toISOString().split('T')[0]}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

export function getValidTimeSlots(dateStr: string): string[] {
  if (!dateStr) return [];
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay();
  if (day === 0) return [];
  const all: string[] = [];
  for (let h = 8; h <= 18; h++) {
    all.push(`${String(h).padStart(2, '0')}:00`);
    all.push(`${String(h).padStart(2, '0')}:30`);
  }
  return all.filter(t => {
    const [hh, mm] = t.split(':').map(Number);
    const time = hh + mm / 60;
    if (day >= 1 && day <= 5) return (time >= 9.5 && time <= 12.5) || (time >= 15.5 && time <= 18.5);
    if (day === 6) return time >= 9.0 && time <= 14.0;
    return false;
  });
}

export function checkHoursWarning(date: string, heure: string): string | null {
  if (!date || !heure) return null;
  const d = new Date(`${date}T${heure}:00`);
  if (isNaN(d.getTime())) return null;
  const day = d.getDay();
  const [h, m] = heure.split(':').map(Number);
  const time = h + m / 60;
  if (day === 0) return 'Dimanche — centre fermé';
  if (day >= 1 && day <= 5) {
    const ok = (time >= 9.5 && time <= 12.5) || (time >= 15.5 && time <= 18.5);
    if (!ok) return 'Hors horaires (Lun-Ven : 09:30-12:30 · 15:30-18:30)';
  }
  if (day === 6 && (time < 9.0 || time > 14.0)) {
    return 'Hors horaires (Sam : 09:00-14:00)';
  }
  return null;
}

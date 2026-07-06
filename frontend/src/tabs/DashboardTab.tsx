import { useState, useEffect } from 'react';
import { Users, Calendar, Activity, CheckCircle, ClipboardList } from 'lucide-react';
import { api } from '../api/client';
import { User } from '../types';
import { STATUS_LABELS } from '../constants';
import { getStartOfWeek } from '../utils/helpers';

export function DashboardTab({ currentUser }: { currentUser: User }) {
  const [stats, setStats] = useState({ patientsCount: 0, todayCount: 0, weekCount: 0 });
  const [todayRdv, setTodayRdv] = useState<any[]>([]);
  const [upcomingRdv, setUpcomingRdv] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const canSeeAllPlanning = currentUser.role === 'ADMIN' || currentUser.role === 'SECRETAIRE';

  useEffect(() => {
    async function load() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const weekStart = getStartOfWeek(new Date());
        const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);
        const ws = weekStart.toISOString().split('T')[0];
        const we = weekEnd.toISOString().split('T')[0];
        const in30d = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

        const pracFilter = currentUser.role === 'PRATICIEN' ? `&practitionerId=${currentUser.id}` : '';
        const promises: Promise<any>[] = [
          api.get('/api/patients').catch(() => []),
          api.get(`/api/appointments?startDate=${today}&endDate=${today}${pracFilter}`).catch(() => []),
          api.get(`/api/appointments?startDate=${ws}&endDate=${we}${pracFilter}`).catch(() => []),
        ];
        if (canSeeAllPlanning) {
          promises.push(api.get(`/api/appointments?startDate=${today}&endDate=${in30d}&status=PLANIFIE`).catch(() => []));
        }
        const [patients, todayList, weekList, upcoming] = await Promise.all(promises);
        setStats({ patientsCount: patients.length, todayCount: todayList.length, weekCount: weekList.length });
        setTodayRdv(todayList);
        if (canSeeAllPlanning) setUpcomingRdv(upcoming ?? []);
      } catch { }
      finally { setIsLoading(false); }
    }
    load();
  }, [canSeeAllPlanning, currentUser.id, currentUser.role]);

  const now = new Date();
  const h = now.getHours();
  const greeting = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: 0 }}>{greeting}, {currentUser.name}</h1>
        <p style={{ margin: '6px 0 0', color: 'var(--color-text-sub)', fontSize: '0.92rem' }}>
          {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary-dark)', lineHeight: 1 }}>
              {isLoading ? '—' : stats.patientsCount}
            </div>
            <div style={{ color: 'var(--color-text-sub)', fontSize: '0.85rem', marginTop: '4px' }}>Patients enregistrés</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#b45309', lineHeight: 1 }}>
              {isLoading ? '—' : stats.todayCount}
            </div>
            <div style={{ color: 'var(--color-text-sub)', fontSize: '0.85rem', marginTop: '4px' }}>RDV aujourd'hui</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-dark)' }}>
            <Activity size={24} />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-accent-dark)', lineHeight: 1 }}>
              {isLoading ? '—' : stats.weekCount}
            </div>
            <div style={{ color: 'var(--color-text-sub)', fontSize: '0.85rem', marginTop: '4px' }}>RDV cette semaine</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={17} style={{ color: 'var(--color-primary)' }} />
          Rendez-vous d'aujourd'hui
        </h3>
        {isLoading ? (
          <p style={{ color: 'var(--color-text-sub)', padding: '16px 0' }}>Chargement...</p>
        ) : todayRdv.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-sub)' }}>
            <CheckCircle size={30} style={{ opacity: 0.25, marginBottom: '8px' }} />
            <p>Aucun rendez-vous prévu aujourd'hui.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {todayRdv
              .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
              .map((a: any) => {
                const timeStr = new Date(a.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                const displayName = a.patient ? `${a.patient.firstName} ${a.patient.name}` : a.patientName;
                const stat = STATUS_LABELS[a.status];
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${stat?.color}` }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary-dark)', minWidth: '48px' }}>{timeStr}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{displayName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)' }}>{a.service} · {a.durationMinutes || 30} min</div>
                    </div>
                    <span style={{ fontWeight: 600, color: stat?.color, fontSize: '0.82rem' }}>{stat?.label}</span>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {canSeeAllPlanning && (
        <div className="card" style={{ marginTop: '24px' }}>
          <h3 style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardList size={17} style={{ color: 'var(--color-accent)' }} />
            Planning confirmé — 30 prochains jours
            <span style={{ marginLeft: 'auto', background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', borderRadius: '20px', padding: '2px 12px', fontSize: '0.8rem', fontWeight: 700 }}>
              {isLoading ? '…' : upcomingRdv.length} RDV
            </span>
          </h3>
          {isLoading ? (
            <p style={{ color: 'var(--color-text-sub)', padding: '16px 0' }}>Chargement...</p>
          ) : upcomingRdv.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-sub)' }}>
              <Calendar size={30} style={{ opacity: 0.2, marginBottom: '8px' }} />
              <p>Aucun rendez-vous confirmé dans les 30 prochains jours.</p>
            </div>
          ) : (() => {
            const byDay: Record<string, any[]> = {};
            upcomingRdv.forEach(a => {
              const dayKey = new Date(a.dateTime).toISOString().split('T')[0];
              if (!byDay[dayKey]) byDay[dayKey] = [];
              byDay[dayKey].push(a);
            });
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.entries(byDay).map(([dayKey, rdvs]) => {
                  const dayDate = new Date(dayKey);
                  const dayLabel = dayDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
                  const isToday = dayKey === new Date().toISOString().split('T')[0];
                  return (
                    <div key={dayKey}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: isToday ? 'var(--color-primary)' : 'var(--color-text-sub)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', paddingBottom: '4px', borderBottom: '1px solid var(--color-border)' }}>
                        {isToday ? '● Aujourd\'hui — ' : ''}{dayLabel}
                        <span style={{ marginLeft: '8px', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>({rdvs.length} RDV)</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {rdvs.map((a: any) => {
                          const timeStr = new Date(a.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                          const displayName = a.patient ? `${a.patient.firstName} ${a.patient.name}` : (a.patientName ?? '—');
                          const praticien = a.practitioner?.name ?? '—';
                          return (
                            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', backgroundColor: 'var(--color-bg-global)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-primary)' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-primary-dark)', minWidth: '44px' }}>{timeStr}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-sub)' }}>{a.service} · {a.durationMinutes || 30} min</div>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)', whiteSpace: 'nowrap' }}>Dr. {praticien}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

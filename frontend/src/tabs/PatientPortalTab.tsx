import { useState, useEffect } from 'react';
import { HeartPulse, Calendar, ClipboardList, LogOut } from 'lucide-react';
import { api } from '../api/client';
import { User, Appointment } from '../types';
import { STATUS_LABELS } from '../constants';

export function PatientPortalTab({ currentUser, onLogout }: { currentUser: User; onLogout: () => void }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'rdv' | 'seances'>('rdv');

  useEffect(() => {
    async function load() {
      try {
        const [appts, sess] = await Promise.all([
          api.get('/api/appointments').catch(() => []),
          api.get('/api/sessions').catch(() => []),
        ]);
        setAppointments(appts);
        setSessions(sess);
      } catch { }
      finally { setIsLoading(false); }
    }
    load();
  }, []);

  const now = new Date();
  const upcoming = appointments
    .filter(a => new Date(a.dateTime) >= now && a.status === 'PLANIFIE')
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  const past = appointments
    .filter(a => new Date(a.dateTime) < now || a.status !== 'PLANIFIE')
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

  const rdvRow = (a: Appointment, highlight = false) => {
    const dt = new Date(a.dateTime);
    const stat = STATUS_LABELS[a.status];
    return (
      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', borderBottom: '1px solid var(--color-border)', backgroundColor: highlight ? '#f0fdf4' : 'white', flexWrap: 'wrap' }}>
        <div style={{ minWidth: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: highlight ? '#065f46' : 'var(--color-primary-dark)', lineHeight: 1 }}>{dt.getDate()}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-sub)', textTransform: 'uppercase', fontWeight: 600 }}>
            {dt.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-sub)', marginTop: '3px' }}>
            {dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{a.service}</div>
          {a.practitioner && (
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-sub)', marginTop: '3px' }}>
              Dr. {a.practitioner.name}
            </div>
          )}
        </div>
        <span style={{ fontWeight: 700, color: stat?.color, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{stat?.label}</span>
      </div>
    );
  };

  const sessionRow = (s: any) => {
    const dt = new Date(s.dateTime);
    return (
      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'white', flexWrap: 'wrap' }}>
        <div style={{ minWidth: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-accent-dark)', lineHeight: 1 }}>{dt.getDate()}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-sub)', textTransform: 'uppercase', fontWeight: 600 }}>
            {dt.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{s.service}</div>
          {s.practitioner && (
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-sub)', marginTop: '3px' }}>
              Dr. {s.practitioner.name}
            </div>
          )}
        </div>
        <span style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-dark)', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700 }}>
          Réalisée
        </span>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-global)' }}>
      {/* Barre de navigation */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid var(--color-border)', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <HeartPulse size={19} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.1 }}>Centre Saoufi</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-sub)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Portail Patient</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 600 }} className="hide-mobile">{currentUser.name}</span>
          <button onClick={onLogout} className="btn btn-secondary" style={{ padding: '7px 14px', fontSize: '0.83rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogOut size={14} /> <span className="hide-mobile">Déconnexion</span>
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '36px 16px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ margin: 0 }}>Bonjour, {currentUser.name}</h1>
          <p style={{ color: 'var(--color-text-sub)', margin: '6px 0 0', fontSize: '0.9rem' }}>
            {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="form-grid-2" style={{ marginBottom: '28px' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
              <Calendar size={22} />
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#b45309', lineHeight: 1 }}>{isLoading ? '—' : upcoming.length}</div>
              <div style={{ color: 'var(--color-text-sub)', fontSize: '0.85rem', marginTop: '4px' }}>RDV à venir</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-dark)' }}>
              <ClipboardList size={22} />
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-accent-dark)', lineHeight: 1 }}>{isLoading ? '—' : sessions.length}</div>
              <div style={{ color: 'var(--color-text-sub)', fontSize: '0.85rem', marginTop: '4px' }}>Séances réalisées</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', marginBottom: '18px', borderBottom: '2px solid var(--color-border)' }}>
          {(['rdv', 'seances'] as const).map(section => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              style={{
                border: 'none', background: 'none', cursor: 'pointer',
                padding: '10px 20px',
                fontWeight: activeSection === section ? 700 : 500,
                color: activeSection === section ? 'var(--color-primary-dark)' : 'var(--color-text-sub)',
                borderBottom: activeSection === section ? '2px solid var(--color-primary-dark)' : '2px solid transparent',
                marginBottom: '-2px', fontSize: '0.92rem',
              }}
            >
              {section === 'rdv'
                ? `Mes Rendez-vous (${isLoading ? '…' : appointments.length})`
                : `Mes Séances (${isLoading ? '…' : sessions.length})`
              }
            </button>
          ))}
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-sub)' }}>
            Chargement de vos données...
          </div>
        ) : activeSection === 'rdv' ? (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {appointments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--color-text-sub)' }}>
                <Calendar size={38} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
                <p style={{ margin: 0 }}>Aucun rendez-vous enregistré.</p>
              </div>
            ) : (
              <>
                {upcoming.length > 0 && (
                  <>
                    <div style={{ padding: '10px 20px', backgroundColor: '#f0fdf4', borderBottom: '1px solid #bbf7d0', fontSize: '0.78rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      À venir · {upcoming.length}
                    </div>
                    {upcoming.map(a => rdvRow(a, true))}
                  </>
                )}
                {past.length > 0 && (
                  <>
                    <div style={{ padding: '10px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-sub)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Historique · {past.length}
                    </div>
                    {past.map(a => rdvRow(a))}
                  </>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--color-text-sub)' }}>
                <ClipboardList size={38} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
                <p style={{ margin: 0 }}>Aucune séance enregistrée.</p>
              </div>
            ) : (
              sessions.map(s => sessionRow(s))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

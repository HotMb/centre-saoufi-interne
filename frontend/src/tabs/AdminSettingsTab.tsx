import React, { useState, useEffect, useCallback } from 'react';
import { Users, Shield, Activity, Plus, ArrowLeft, X } from 'lucide-react';
import { api } from '../api/client';
import { Alert } from '../components/Alert';
import { User, UserRole } from '../types';
import { ROLE_COLORS } from '../constants';

export function AdminSettingsTab({ currentUser }: { currentUser: User }) {
  const [view, setView] = useState<'users' | 'create' | 'logs' | 'stats'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [fName, setFName] = useState('');
  const [fUsername, setFUsername] = useState('');
  const [fPassword, setFPassword] = useState('');
  const [fRole, setFRole] = useState<UserRole>('SECRETAIRE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetTargetName, setResetTargetName] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try { setUsers(await api.get('/api/admin/users')); }
    catch (err: any) { setError(err.message ?? 'Erreur de chargement.'); }
    finally { setIsLoading(false); }
  }, []);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try { setLogs(await api.get('/api/admin/logs')); }
    catch (err: any) { setError(err.message ?? 'Erreur de chargement.'); }
    finally { setIsLoading(false); }
  }, []);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try { setStats(await api.get('/api/admin/stats')); }
    catch (err: any) { setError(err.message ?? 'Erreur de chargement.'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    if (view === 'users' || view === 'create') fetchUsers();
    if (view === 'logs') fetchLogs();
    if (view === 'stats') fetchStats();
  }, [view]);

  const handleToggle = async (userId: string, userName: string, enabled: boolean) => {
    setError(null);
    try {
      await api.post(`/api/admin/users/${userId}/toggle`, {});
      setSuccess(`${userName} ${enabled ? 'désactivé' : 'réactivé'}.`);
      fetchUsers();
    } catch (err: any) { setError(err.message ?? 'Erreur.'); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetId) return;
    setIsResetting(true); setError(null);
    try {
      await api.patch(`/api/admin/users/${resetTargetId}/password`, { newPassword: resetNewPassword });
      setSuccess(`Mot de passe de ${resetTargetName} réinitialisé.`);
      setResetTargetId(null); setResetTargetName(''); setResetNewPassword('');
    } catch (err: any) { setError(err.message ?? 'Erreur lors de la réinitialisation.'); }
    finally { setIsResetting(false); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true); setError(null);
    try {
      await api.post('/api/admin/users', { name: fName, username: fUsername, password: fPassword, role: fRole });
      setSuccess(`Utilisateur "${fName}" créé avec succès.`);
      setFName(''); setFUsername(''); setFPassword(''); setFRole('SECRETAIRE');
      setView('users');
    } catch (err: any) { setError(err.message ?? 'Erreur de création.'); }
    finally { setIsSubmitting(false); }
  };

  const thStyle: React.CSSProperties = {
    padding: '12px 18px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600,
    color: 'var(--color-text-sub)', textTransform: 'uppercase', letterSpacing: '0.06em',
    background: '#f8fafc', borderBottom: '1px solid var(--color-border)',
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Administration</h1>
          <p style={{ color: 'var(--color-text-sub)', marginTop: '6px', fontSize: '0.9rem' }}>
            Gestion des utilisateurs et journal d'activité (RGPD).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => { setView('users'); setError(null); }} className={`btn ${view === 'users' || view === 'create' ? 'btn-primary' : 'btn-secondary'}`}>
            <Users size={16} /> Utilisateurs
          </button>
          <button onClick={() => { setView('stats'); setError(null); }} className={`btn ${view === 'stats' ? 'btn-primary' : 'btn-secondary'}`}>
            <Activity size={16} /> Statistiques
          </button>
          <button onClick={() => { setView('logs'); setError(null); }} className={`btn ${view === 'logs' ? 'btn-primary' : 'btn-secondary'}`}>
            <Shield size={16} /> Journal CNIL
          </button>
        </div>
      </div>

      {error && <Alert type="error" msg={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" msg={success} onClose={() => setSuccess(null)} />}

      {view === 'users' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button onClick={() => { setView('create'); setError(null); }} className="btn btn-primary">
              <Plus size={17} /> Nouvel utilisateur
            </button>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {isLoading ? (
              <p style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-sub)' }}>Chargement...</p>
            ) : users.length === 0 ? (
              <p style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-sub)' }}>Aucun utilisateur.</p>
            ) : (
              <div className="table-container" style={{ margin: 0, borderRadius: 0, border: 'none' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Nom</th>
                      <th style={{ ...thStyle }} className="hide-mobile">Identifiant</th>
                      <th style={thStyle}>Rôle</th>
                      <th style={{ ...thStyle }} className="hide-mobile">Statut</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => {
                      const rc = ROLE_COLORS[u.role] ?? { bg: '#f1f5f9', color: '#475569' };
                      return (
                        <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                          <td style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.9rem' }}>
                            {u.name}
                            <div className="show-mobile" style={{ fontSize: '0.75rem', color: 'var(--color-text-sub)', fontWeight: 400 }}>
                              @{u.username} · <span className={u.enabled ? 'badge-active' : 'badge-inactive'} style={{ fontSize: '0.7rem' }}>{u.enabled ? 'Actif' : 'Inactif'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px', color: 'var(--color-text-sub)', fontFamily: 'monospace', fontSize: '0.88rem' }} className="hide-mobile">@{u.username}</td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{ background: rc.bg, color: rc.color, padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px' }} className="hide-mobile">
                            <span className={u.enabled ? 'badge-active' : 'badge-inactive'}>{u.enabled ? 'Actif' : 'Inactif'}</span>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              {u.id !== currentUser.id && (
                                <button onClick={() => handleToggle(u.id, u.name, u.enabled)} className={`btn ${u.enabled ? 'btn-secondary' : 'btn-accent'}`} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                                  {u.enabled ? 'Désactiver' : 'Réactiver'}
                                </button>
                              )}
                              <button onClick={() => { setResetTargetId(u.id); setResetTargetName(u.name); setResetNewPassword(''); }} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                                Changer mdp
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'create' && (
        <div className="card animate-fade-in" style={{ maxWidth: '580px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <button onClick={() => setView('users')} className="btn btn-secondary" style={{ padding: '7px 11px' }}>
              <ArrowLeft size={15} />
            </button>
            <h2 style={{ margin: 0 }}>Créer un utilisateur</h2>
          </div>
          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div className="form-grid-2">
              <div className="form-field">
                <label>Nom complet <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input value={fName} onChange={e => setFName(e.target.value)} placeholder="Ex: Dr. Saoufi" required />
              </div>
              <div className="form-field">
                <label>Identifiant <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input value={fUsername} onChange={e => setFUsername(e.target.value)} placeholder="Ex: saoufi" required />
              </div>
            </div>
            <div className="form-grid-2">
              <div className="form-field">
                <label>Mot de passe <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input type="password" value={fPassword} onChange={e => setFPassword(e.target.value)} placeholder="Min. 6 caractères" required />
              </div>
              <div className="form-field">
                <label>Rôle <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <select value={fRole} onChange={e => setFRole(e.target.value as UserRole)}>
                  <option value="SECRETAIRE">Secrétaire</option>
                  <option value="PRATICIEN">Praticien</option>
                  <option value="ADMIN">Administrateur</option>
                  <option value="PATIENT">Patient</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '18px' }}>
              <button type="button" onClick={() => setView('users')} className="btn btn-secondary">Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Création...' : 'Créer l\'utilisateur'}
              </button>
            </div>
          </form>
        </div>
      )}

      {view === 'stats' && (
        <div className="animate-fade-in">
          {isLoading || !stats ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-sub)', padding: '40px' }}>Chargement...</p>
          ) : (
            <>
              <div className="stats-grid" style={{ marginBottom: '28px' }}>
                {[
                  { label: 'Rendez-vous', value: stats.totals.appointments, color: 'var(--color-primary-dark)', bg: 'var(--color-primary-light)' },
                  { label: 'Patients', value: stats.totals.patients, color: '#065f46', bg: '#d1fae5' },
                  { label: 'Séances', value: stats.totals.sessions, color: 'var(--color-accent-dark)', bg: 'var(--color-accent-light)' },
                ].map(s => (
                  <div key={s.label} className="stat-card">
                    <div className="stat-icon" style={{ background: s.bg, color: s.color }}><Activity size={22} /></div>
                    <div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                      <div style={{ color: 'var(--color-text-sub)', fontSize: '0.85rem', marginTop: '4px' }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-grid-2" style={{ marginBottom: '18px' }}>
                <div className="card">
                  <h3 style={{ marginBottom: '18px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-sub)' }}>RDV par service</h3>
                  {stats.byService.map((s: any) => {
                    const pct = Math.round((s.count / stats.totals.appointments) * 100);
                    return (
                      <div key={s.label} style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 500 }}>{s.label}</span>
                          <span style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>{s.count}</span>
                        </div>
                        <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gradient-primary)', borderRadius: '3px', transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="card">
                  <h3 style={{ marginBottom: '18px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-sub)' }}>RDV par praticien</h3>
                  {stats.byPractitioner.map((s: any) => {
                    const pct = Math.round((s.count / stats.totals.appointments) * 100);
                    return (
                      <div key={s.label} style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 500 }}>Dr. {s.label}</span>
                          <span style={{ fontWeight: 700, color: '#065f46' }}>{s.count}</span>
                        </div>
                        <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gradient-accent)', borderRadius: '3px', transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: '22px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-sub)' }}>
                  Activité mensuelle — 6 derniers mois
                </h3>
                {(() => {
                  const max = Math.max(...stats.byMonth.map((m: any) => m.count), 1);
                  return (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', height: '120px' }}>
                      {stats.byMonth.map((m: any) => {
                        const pct = (m.count / max) * 100;
                        const [y, mo] = m.month.split('-');
                        const label = new Date(Number(y), Number(mo) - 1).toLocaleDateString('fr-FR', { month: 'short' });
                        return (
                          <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>{m.count || ''}</span>
                            <div style={{ width: '100%', height: `${Math.max(pct, 4)}%`, background: 'var(--gradient-primary)', borderRadius: '4px 4px 0 0', transition: 'height 0.4s ease' }} />
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-sub)', textTransform: 'capitalize' }}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      )}

      {resetTargetId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Changer le mot de passe</h3>
              <button onClick={() => setResetTargetId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-sub)' }}>
                <X size={22} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--color-text-sub)', fontSize: '0.88rem', marginBottom: '18px' }}>
                Définir un nouveau mot de passe pour <strong>{resetTargetName}</strong>.
              </p>
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-field">
                  <label>Nouveau mot de passe <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input
                    type="password"
                    value={resetNewPassword}
                    onChange={e => setResetNewPassword(e.target.value)}
                    placeholder="Min. 6 caractères"
                    minLength={6}
                    required
                    autoFocus
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                  <button type="button" onClick={() => setResetTargetId(null)} className="btn btn-secondary">Annuler</button>
                  <button type="submit" className="btn btn-primary" disabled={isResetting}>
                    {isResetting ? 'Enregistrement...' : 'Confirmer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {view === 'logs' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {isLoading ? (
            <p style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-sub)' }}>Chargement...</p>
          ) : logs.length === 0 ? (
            <div style={{ padding: '50px', textAlign: 'center', color: 'var(--color-text-sub)' }}>
              <Activity size={36} style={{ opacity: 0.25, marginBottom: '10px' }} />
              <p>Aucune activité enregistrée.</p>
            </div>
          ) : (
            <div className="table-container" style={{ margin: 0, borderRadius: 0, border: 'none' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Date & Heure', 'Utilisateur', 'Action', 'Détails'].map(col => (
                      <th key={col} style={{ padding: '12px 18px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-sub)', textTransform: 'uppercase', letterSpacing: '0.06em', background: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 150).map((log: any, i: number) => {
                    const ts = new Date(log.timestamp);
                    return (
                      <tr key={log.id} style={{ borderBottom: i < Math.min(logs.length, 150) - 1 ? '1px solid var(--color-border)' : 'none' }}>
                        <td style={{ padding: '12px 18px', fontSize: '0.83rem', whiteSpace: 'nowrap', color: 'var(--color-text-sub)' }}>
                          {ts.toLocaleDateString('fr-FR')} {ts.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: 600, fontSize: '0.88rem' }}>{log.user?.name ?? '—'}</td>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '5px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', color: 'var(--color-text-sub)', fontSize: '0.85rem', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.details}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

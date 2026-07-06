import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Plus, X, CheckCircle, Trash2, Eye, Send } from 'lucide-react';
import { api } from '../api/client';
import { Alert } from '../components/Alert';
import { ConfirmModal } from '../components/ConfirmModal';
import { User, Session, SessionNote, Patient, Practitioner } from '../types';
import { SERVICES } from '../constants';
import { getStartOfWeek } from '../utils/helpers';

export function SessionsTab({ currentUser }: { currentUser: User }) {
  const isPraticien = currentUser.role === 'PRATICIEN';
  const isAdmin = currentUser.role === 'ADMIN';
  const canCreate = isPraticien || isAdmin;

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getStartOfWeek(new Date()));
  const [sessions, setSessions] = useState<Session[]>([]);
  const [realiseRdv, setRealiseRdv] = useState<any[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterPractitionerId, setFilterPractitionerId] = useState(isPraticien ? currentUser.id : '');

  const [expandedSession, setExpandedSession] = useState<Session | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<SessionNote[]>([]);
  const [expandedNotesLoading, setExpandedNotesLoading] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; label: string } | null>(null);
  const [fPatientId, setFPatientId] = useState('');
  const [fDate, setFDate] = useState(new Date().toISOString().split('T')[0]);
  const [fTime, setFTime] = useState('09:30');
  const [fService, setFService] = useState<string>(SERVICES[0]);
  const [fNotes, setFNotes] = useState('');
  const [fPractitionerId, setFPractitionerId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openExpandedSession = async (session: Session) => {
    setExpandedSession(session);
    setExpandedNotes([]);
    setNewNoteContent('');
    setExpandedNotesLoading(true);
    try {
      const notes = await api.get(`/api/sessions/${session.id}/notes`);
      setExpandedNotes(notes);
    } catch {}
    finally { setExpandedNotesLoading(false); }
  };

  const handleAddNote = async () => {
    if (!expandedSession || !newNoteContent.trim()) return;
    setIsSavingNote(true);
    try {
      const note = await api.post(`/api/sessions/${expandedSession.id}/notes`, { content: newNoteContent.trim() });
      setExpandedNotes(prev => [...prev, note]);
      setNewNoteContent('');
    } catch (err: any) { setError(err.message ?? 'Erreur lors de l\'ajout de la consigne.'); }
    finally { setIsSavingNote(false); }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!expandedSession) return;
    try {
      await api.delete(`/api/sessions/${expandedSession.id}/notes/${noteId}`);
      setExpandedNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err: any) { setError(err.message ?? 'Erreur lors de la suppression.'); }
  };

  const fetchSessions = useCallback(async (start: Date, pracId: string) => {
    setIsLoading(true); setError(null);
    try {
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      let url = `/api/sessions?startDate=${startStr}&endDate=${endStr}`;
      if (pracId) url += `&practitionerId=${pracId}`;
      const pracFilter = isPraticien ? `&practitionerId=${currentUser.id}` : '';
      const [sess, rdvRealise] = await Promise.all([
        api.get(url),
        api.get(`/api/appointments?startDate=${startStr}&endDate=${endStr}&status=REALISE${pracFilter}`).catch(() => []),
      ]);
      setSessions(sess);
      setRealiseRdv(rdvRealise);
    } catch (err: any) { setError(err.message ?? 'Erreur de chargement.'); }
    finally { setIsLoading(false); }
  }, [isPraticien, currentUser.id]);

  useEffect(() => { fetchSessions(currentWeekStart, filterPractitionerId); }, [currentWeekStart, filterPractitionerId]);

  useEffect(() => {
    if (canCreate) api.get('/api/patients').then(setPatients).catch(() => {});
    if (!isPraticien) api.get('/api/users/practitioners').then((data: any) => setPractitioners(data)).catch(() => {});
  }, [canCreate, isPraticien]);

  const openFormFromRdv = (rdv: any) => {
    const dt = new Date(rdv.dateTime);
    setFPatientId(rdv.patientId ?? '');
    setFDate(dt.toISOString().split('T')[0]);
    setFTime(`${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`);
    setFService(rdv.service ?? SERVICES[0]);
    setFNotes('');
    setFPractitionerId(rdv.practitionerId ?? '');
    setShowForm(true);
    setError(null);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fPatientId) { setError('Veuillez sélectionner un patient.'); return; }
    if (isAdmin && !fPractitionerId) { setError('Veuillez sélectionner le praticien.'); return; }
    setIsSubmitting(true); setError(null);
    try {
      await api.post('/api/sessions', {
        patientId: fPatientId,
        dateTime: new Date(`${fDate}T${fTime}:00`).toISOString(),
        service: fService,
        notes: fNotes,
        ...(isAdmin && { practitionerId: fPractitionerId }),
      });
      setSuccess('Séance consignée avec succès.');
      setShowForm(false);
      setFPatientId(''); setFTime('09:30'); setFService(SERVICES[0]); setFNotes(''); setFPractitionerId('');
      fetchSessions(currentWeekStart, filterPractitionerId);
    } catch (err: any) { setError(err.message ?? 'Erreur lors de la création.'); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm(null);
    try {
      await api.delete(`/api/sessions/${id}`);
      setSuccess('Séance supprimée.');
      fetchSessions(currentWeekStart, filterPractitionerId);
    } catch (err: any) { setError(err.message ?? 'Erreur lors de la suppression.'); }
  };

  const navWeek = (offset: number) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + offset * 7);
    setCurrentWeekStart(d);
  };

  const weekDays = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(currentWeekStart.getDate() + i);
    return d;
  });

  const hours = Array.from({ length: 11 }, (_, i) => i + 8);
  const timeSlots: string[] = [];
  for (let h = 8; h <= 18; h++) {
    timeSlots.push(`${String(h).padStart(2, '0')}:00`);
    timeSlots.push(`${String(h).padStart(2, '0')}:30`);
  }

  const byDay = sessions.reduce((acc, a) => {
    const d = new Date(a.dateTime).toISOString().split('T')[0];
    if (!acc[d]) acc[d] = [];
    acc[d].push(a);
    return acc;
  }, {} as Record<string, Session[]>);

  const openFormForSlot = (dateObj: Date, hourStr: string) => {
    if (!canCreate) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const clickDateStr = dateObj.toISOString().split('T')[0];
    if (clickDateStr > todayStr) { setError('Impossible de consigner une séance dans le futur.'); return; }
    setFDate(clickDateStr); setFTime(hourStr); setShowForm(true); setError(null);
  };

  const weekLabel = `${currentWeekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} – ${weekDays[5].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Comptes-Rendus de Séances</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-sub)', fontSize: '0.88rem' }}>Consignation des soins prodigués</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {!isPraticien && (
            <select value={filterPractitionerId} onChange={e => setFilterPractitionerId(e.target.value)} style={{ width: '200px' }}>
              <option value="">Tous les praticiens</option>
              {practitioners.map(p => <option key={p.id} value={p.id}>Dr. {p.name}</option>)}
            </select>
          )}
          {canCreate && (
            <button onClick={() => { setShowForm(true); setError(null); }} className="btn btn-primary">
              <Plus size={17} /> Consigner Séance
            </button>
          )}
        </div>
      </div>

      {error && <Alert type="error" msg={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" msg={success} onClose={() => setSuccess(null)} />}

      {canCreate && realiseRdv.length > 0 && (
        <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid var(--color-accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <CheckCircle size={17} style={{ color: 'var(--color-accent-dark)' }} />
            <h3 style={{ margin: 0, color: 'var(--color-accent-dark)' }}>RDV réalisés — à consigner ({realiseRdv.length})</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {realiseRdv.map((rdv: any) => {
              const dt = new Date(rdv.dateTime);
              const displayName = rdv.patient ? `${rdv.patient.firstName} ${rdv.patient.name}` : (rdv.patientName ?? '—');
              return (
                <div key={rdv.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 14px', background: 'var(--color-bg-global)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: '50px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-accent-dark)', lineHeight: 1 }}>{dt.getDate()}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-text-sub)', textTransform: 'uppercase' }}>
                      {dt.toLocaleDateString('fr-FR', { month: 'short' })}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{displayName}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-sub)' }}>
                      {rdv.service} · {dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {rdv.practitioner && ` · Dr. ${rdv.practitioner.name}`}
                    </div>
                  </div>
                  {rdv.patientId ? (
                    <button onClick={() => openFormFromRdv(rdv)} className="btn btn-accent" style={{ padding: '7px 14px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      <Plus size={14} /> Ajouter notes
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-sub)', fontStyle: 'italic' }}>Patient non inscrit</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showForm && canCreate && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList size={18} /> Consigner une séance
              </h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-sub)' }}>
                <X size={22} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateSession}>
                <div className="form-grid-2" style={{ marginBottom: '18px' }}>
                  <div className="form-field">
                    <label>Patient <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <select value={fPatientId} onChange={e => setFPatientId(e.target.value)} required>
                      <option value="">-- Sélectionner --</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Service / Soin <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <select value={fService} onChange={e => setFService(e.target.value)}>
                      {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Date <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} required max={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div className="form-field">
                    <label>Heure <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <select value={fTime} onChange={e => setFTime(e.target.value)} required>
                      {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-field" style={{ gridColumn: 'span 2' }}>
                    <label>Praticien {isAdmin && <span style={{ color: 'var(--color-error)' }}>*</span>}</label>
                    {isAdmin ? (
                      <select value={fPractitionerId} onChange={e => setFPractitionerId(e.target.value)} required>
                        <option value="">-- Sélectionner le praticien --</option>
                        {practitioners.map(p => <option key={p.id} value={p.id}>Dr. {p.name}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={`Dr. ${currentUser.name}`} disabled />
                    )}
                  </div>
                </div>
                <div className="form-field" style={{ marginBottom: '20px' }}>
                  <label>Notes / Observations cliniques <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <textarea
                    value={fNotes}
                    onChange={e => setFNotes(e.target.value)}
                    required
                    placeholder="Ex: Le patient a bien réagi à l'exercice d'étirement..."
                    rows={4}
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '18px' }}>
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Annuler</button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Enregistrement...' : 'Enregistrer la séance'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '18px', padding: '14px 20px' }}>
        <div className="flex-between">
          <button onClick={() => navWeek(-1)} className="btn btn-secondary" style={{ padding: '8px 14px' }}>← Préc.</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-primary-dark)' }}>{weekLabel}</div>
            <button onClick={() => setCurrentWeekStart(getStartOfWeek(new Date()))} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.82rem', marginTop: '2px' }}>
              Aujourd'hui
            </button>
          </div>
          <button onClick={() => navWeek(1)} className="btn btn-secondary" style={{ padding: '8px 14px' }}>Suiv. →</button>
        </div>
      </div>

      {!isLoading && sessions.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', marginBottom: '14px', background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-sm)', color: 'var(--color-primary-dark)', fontSize: '0.86rem' }}>
          <ClipboardList size={16} />
          Aucune séance consignée cette semaine.{canCreate ? ' Cliquez sur un créneau dans la grille ci-dessous, ou sur « Consigner Séance », pour en ajouter une.' : ''}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflowX: 'auto', backgroundColor: '#f8fafc' }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-sub)' }}>Chargement...</div>
        ) : (
          <div style={{ minWidth: '700px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff', position: 'sticky', top: 0, zIndex: 10 }}>
              <div style={{ width: '50px', borderRight: '1px solid #e2e8f0' }} />
              {weekDays.map((d, i) => {
                const isToday = d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                return (
                  <div key={i} style={{ flex: 1, padding: '10px 4px', textAlign: 'center', borderRight: '1px solid #e2e8f0', backgroundColor: isToday ? '#eff6ff' : 'transparent' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.72rem', color: isToday ? 'var(--color-primary-dark)' : '#64748b', textTransform: 'uppercase' }}>
                      {d.toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: isToday ? 'var(--color-primary-dark)' : '#1e293b', lineHeight: 1.2, marginTop: '2px' }}>
                      {d.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
            {hours.map(h => (
              <div key={h} style={{ display: 'flex', minHeight: '100px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ width: '50px', padding: '6px 4px', textAlign: 'center', fontSize: '0.7rem', color: '#94a3b8', borderRight: '1px solid #e2e8f0', backgroundColor: '#ffffff', position: 'sticky', left: 0, flexShrink: 0 }}>
                  {h}h00
                </div>
                {weekDays.map((day, idx) => {
                  const dayStr = day.toISOString().split('T')[0];
                  const cellSessions = (byDay[dayStr] || []).filter((a: any) => new Date(a.dateTime).getHours() === h);
                  return (
                    <div
                      key={idx}
                      onClick={() => openFormForSlot(day, `${String(h).padStart(2, '0')}:00`)}
                      style={{ flex: 1, borderRight: '1px solid #e2e8f0', padding: '3px', cursor: canCreate ? 'pointer' : 'default', position: 'relative', transition: 'background-color 0.15s' }}
                      onMouseEnter={e => { if (canCreate) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {cellSessions.map((a: any) => {
                        const timeStr = new Date(a.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                        const topPx = new Date(a.dateTime).getMinutes() >= 30 ? 50 : 2;
                        return (
                          <div
                            key={a.id}
                            onClick={e => { e.stopPropagation(); openExpandedSession(a); }}
                            style={{ position: 'absolute', top: `${topPx}px`, left: '3px', right: '3px', height: '90px', backgroundColor: '#ffffff', borderLeft: '3px solid var(--color-success)', borderRadius: '5px', padding: '6px 8px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', zIndex: 5, overflow: 'hidden', cursor: 'pointer' }}
                            title="Cliquer pour voir les consignes"
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.72rem' }}>
                                {timeStr}<br />
                                {a.patient?.firstName} {a.patient?.name}
                              </span>
                              <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                                <Eye size={11} style={{ color: '#94a3b8', marginTop: '1px' }} />
                                {canCreate && (
                                  <button
                                    onClick={e => { e.stopPropagation(); setDeleteConfirm({ id: a.id, label: `${a.patient?.firstName ?? ''} ${a.patient?.name ?? ''}`.trim() || 'cette séance' }); }}
                                    style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b', fontStyle: 'italic', marginTop: '4px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                              {a.notes}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {expandedSession && (
        <div className="modal-overlay" onClick={() => setExpandedSession(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList size={18} />
                {expandedSession.patient?.firstName} {expandedSession.patient?.name}
              </h3>
              <button onClick={() => setExpandedSession(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-sub)' }}>
                <X size={22} />
              </button>
            </div>
            <div className="modal-body" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Infos séance */}
              <div style={{ display: 'flex', gap: '20px', fontSize: '0.88rem', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ color: 'var(--color-text-sub)', fontSize: '0.75rem', display: 'block', marginBottom: '2px' }}>Date & heure</span>
                  <span style={{ fontWeight: 600 }}>
                    {new Date(expandedSession.dateTime).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    {' à '}
                    {new Date(expandedSession.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-sub)', fontSize: '0.75rem', display: 'block', marginBottom: '2px' }}>Service</span>
                  <span style={{ fontWeight: 600 }}>{expandedSession.service}</span>
                </div>
                {expandedSession.practitioner && (
                  <div>
                    <span style={{ color: 'var(--color-text-sub)', fontSize: '0.75rem', display: 'block', marginBottom: '2px' }}>Praticien</span>
                    <span style={{ fontWeight: 600 }}>Dr. {expandedSession.practitioner.name}</span>
                  </div>
                )}
              </div>

              {/* Compte-rendu initial */}
              <div>
                <span style={{ color: 'var(--color-text-sub)', fontSize: '0.75rem', display: 'block', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Compte-rendu initial
                </span>
                <div style={{ padding: '10px 14px', background: 'var(--color-bg-global)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {expandedSession.notes}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-sub)', marginTop: '4px' }}>
                  Par Dr. {expandedSession.practitioner?.name ?? '—'}
                  {expandedSession.createdAt && ` · ${new Date(expandedSession.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                </div>
              </div>

              {/* Liste des consignes */}
              <div>
                <span style={{ color: 'var(--color-text-sub)', fontSize: '0.75rem', display: 'block', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Consignes ({expandedNotes.length})
                </span>
                {expandedNotesLoading ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-sub)', padding: '8px 0' }}>Chargement...</div>
                ) : expandedNotes.length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-sub)', fontStyle: 'italic', padding: '8px 0' }}>
                    Aucune consigne ajoutée pour cette séance.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {expandedNotes.map(note => (
                      <div key={note.id} style={{ padding: '10px 14px', background: 'var(--color-bg-global)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', borderLeft: '3px solid var(--color-accent)' }}>
                        <div style={{ fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '6px' }}>{note.content}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-sub)' }}>
                            Dr. {note.author?.name ?? '—'} · {new Date(note.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {' '}
                            {new Date(note.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {canCreate && (
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              style={{ border: 'none', background: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
                              title="Supprimer cette consigne"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Formulaire ajout consigne */}
              {canCreate && (
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                    Ajouter une consigne
                  </span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <textarea
                      value={newNoteContent}
                      onChange={e => setNewNoteContent(e.target.value)}
                      placeholder="Ex : Exercices à faire à domicile, repos recommandé..."
                      rows={2}
                      style={{ flex: 1, resize: 'vertical', fontSize: '0.88rem' }}
                      onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddNote(); }}
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={isSavingNote || !newNoteContent.trim()}
                      className="btn btn-primary"
                      style={{ padding: '8px 14px', flexShrink: 0 }}
                      title="Envoyer (Ctrl+Entrée)"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-sub)', marginTop: '4px', display: 'block' }}>Ctrl+Entrée pour envoyer</span>
                </div>
              )}

              {canCreate && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
                  <button
                    onClick={() => { setDeleteConfirm({ id: expandedSession.id, label: `${expandedSession.patient?.firstName ?? ''} ${expandedSession.patient?.name ?? ''}`.trim() || 'cette séance' }); setExpandedSession(null); }}
                    className="btn btn-secondary"
                    style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)', fontSize: '0.82rem' }}
                  >
                    <Trash2 size={14} /> Supprimer la séance
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <ConfirmModal
          title="Supprimer la séance"
          message={`Supprimer la séance de ${deleteConfirm.label} ?`}
          onConfirm={() => handleDelete(deleteConfirm.id)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

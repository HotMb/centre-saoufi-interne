import React, { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Calendar, Plus, X, Download, Search, Trash2, Printer } from 'lucide-react';
import { api } from '../api/client';
import { Alert } from '../components/Alert';
import { ConfirmModal } from '../components/ConfirmModal';
import { User, Appointment, Patient, Practitioner } from '../types';
import { SERVICES, STATUS_LABELS } from '../constants';
import { getStartOfWeek, exportToICS, formatDate, getValidTimeSlots, checkHoursWarning } from '../utils/helpers';

export function AppointmentsTab({ currentUser }: { currentUser: User }) {
  const canWrite = currentUser.role === 'ADMIN' || currentUser.role === 'SECRETAIRE';
  const isPractitioner = currentUser.role === 'PRATICIEN';

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getStartOfWeek(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterPractitionerId, setFilterPractitionerId] = useState(isPractitioner ? currentUser.id : '');

  const [showForm, setShowForm] = useState(false);
  const [fPatientId, setFPatientId] = useState('');
  const [fPatientName, setFPatientName] = useState('');
  const [fDate, setFDate] = useState(new Date().toISOString().split('T')[0]);
  const [fTime, setFTime] = useState('09:30');
  const [fDuration, setFDuration] = useState('30');
  const [fService, setFService] = useState<string>(SERVICES[0]);
  const [fPractitionerId, setFPractitionerId] = useState(isPractitioner ? currentUser.id : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; label: string } | null>(null);
  const [calSearch, setCalSearch] = useState('');

  const fetchAppointments = useCallback(async (start: Date, pracId: string) => {
    setIsLoading(true); setError(null);
    try {
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      let url = `/api/appointments?startDate=${startStr}&endDate=${endStr}`;
      if (pracId) url += `&practitionerId=${pracId}`;
      setAppointments(await api.get(url));
    } catch (err: any) { setError(err.message ?? 'Erreur de chargement.'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchAppointments(currentWeekStart, filterPractitionerId); }, [currentWeekStart, filterPractitionerId]);
  useEffect(() => {
    if (canWrite || isPractitioner) api.get('/api/patients').then(setPatients).catch(() => {});
    if (canWrite) api.get('/api/users/practitioners').then((data: any) => setPractitioners(data)).catch(() => {});
  }, [canWrite, isPractitioner]);

  const printPlanningPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pw = doc.internal.pageSize.width;
    const weekEnd = new Date(currentWeekStart.getTime() + 5 * 86400000);
    doc.setFontSize(16);
    doc.text('Centre Saoufi — Planning hebdomadaire', pw / 2, 16, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Semaine du ${formatDate(currentWeekStart.toISOString())} au ${formatDate(weekEnd.toISOString())}`, pw / 2, 23, { align: 'center' });
    const rows = appointments
      .filter(a => !calSearch || `${a.patient?.firstName ?? ''} ${a.patient?.name ?? ''} ${a.patientName ?? ''}`.toLowerCase().includes(calSearch.toLowerCase()))
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
      .map(a => {
        const d = new Date(a.dateTime);
        return [
          d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
          `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
          a.patient ? `${a.patient.firstName} ${a.patient.name}` : (a.patientName ?? '—'),
          a.service,
          a.practitioner?.name ?? '—',
          a.status,
          `${a.durationMinutes ?? 30} min`,
        ];
      });
    autoTable(doc, {
      startY: 28,
      head: [['Jour', 'Heure', 'Patient', 'Service', 'Praticien', 'Statut', 'Durée']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [56, 189, 248] },
      styles: { fontSize: 9, overflow: 'ellipsize', cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 32 }, 1: { cellWidth: 16 }, 2: { cellWidth: 52 },
        3: { cellWidth: 55 }, 4: { cellWidth: 44 }, 5: { cellWidth: 26 }, 6: { cellWidth: 18 },
      },
    });
    doc.save(`Planning_${currentWeekStart.toISOString().slice(0, 10)}.pdf`);
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fPatientId === 'LIBRE' && !fPatientName.trim()) { setError('Veuillez entrer le nom du patient.'); return; }
    if (!fPatientId && !fPatientName) { setError('Veuillez sélectionner ou entrer un patient.'); return; }
    if (isSundaySelected) { setError('Le centre est fermé le dimanche. Veuillez choisir un autre jour.'); return; }
    const slotWarn = checkHoursWarning(fDate, fTime);
    if (slotWarn) { setError(slotWarn); return; }
    setIsSubmitting(true); setError(null);
    try {
      const dateTime = new Date(`${fDate}T${fTime}:00`).toISOString();
      await api.post('/api/appointments', {
        patientId: fPatientId === 'LIBRE' ? null : fPatientId,
        patientName: fPatientId === 'LIBRE' ? fPatientName : null,
        dateTime,
        durationMinutes: parseInt(fDuration, 10),
        service: fService,
        practitionerId: fPractitionerId || null,
      });
      setSuccess('Rendez-vous créé avec succès.');
      setShowForm(false);
      setFPatientId(''); setFPatientName(''); setFTime('09:30'); setFService(SERVICES[0]);
      fetchAppointments(currentWeekStart, filterPractitionerId);
    } catch (err: any) { setError(err.message ?? 'Erreur lors de la création.'); }
    finally { setIsSubmitting(false); }
  };

  const handleChangeStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/api/appointments/${id}`, { status });
      setSuccess('Statut mis à jour.');
      fetchAppointments(currentWeekStart, filterPractitionerId);
    } catch (err: any) { setError(err.message ?? 'Erreur de mise à jour.'); }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm(null);
    try {
      await api.delete(`/api/appointments/${id}`);
      setSuccess('Rendez-vous supprimé.');
      fetchAppointments(currentWeekStart, filterPractitionerId);
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

  const validSlotsForDate = getValidTimeSlots(fDate);
  const isSundaySelected = fDate ? new Date(`${fDate}T00:00:00`).getDay() === 0 : false;

  const displayedAppts = calSearch
    ? appointments.filter(a => {
        const name = a.patient ? `${a.patient.firstName} ${a.patient.name}` : (a.patientName || '');
        return name.toLowerCase().includes(calSearch.toLowerCase());
      })
    : appointments;

  const byDay = displayedAppts.reduce((acc, a) => {
    const d = new Date(a.dateTime).toISOString().split('T')[0];
    if (!acc[d]) acc[d] = [];
    acc[d].push(a);
    return acc;
  }, {} as Record<string, Appointment[]>);

  const openFormForSlot = (dateObj: Date, hourStr: string) => {
    if (!canWrite && !isPractitioner) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const clickDateStr = dateObj.toISOString().split('T')[0];
    if (clickDateStr < todayStr) { setError('Impossible de créer un rendez-vous dans le passé.'); return; }
    if (dateObj.getDay() === 0) { setError('Le centre est fermé le dimanche.'); return; }
    const slots = getValidTimeSlots(clickDateStr);
    const selectedTime = slots.includes(hourStr) ? hourStr : (slots[0] ?? '09:30');
    setFDate(clickDateStr);
    setFTime(selectedTime);
    if (filterPractitionerId) setFPractitionerId(filterPractitionerId);
    setShowForm(true); setError(null);
  };

  const weekLabel = `${currentWeekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} – ${weekDays[5].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Agenda des Rendez-vous</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-sub)', fontSize: '0.88rem' }}>Vue hebdomadaire</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {!isPractitioner && (
            <select value={filterPractitionerId} onChange={e => setFilterPractitionerId(e.target.value)} style={{ width: '180px' }}>
              <option value="">Tous les praticiens</option>
              {practitioners.map(p => <option key={p.id} value={p.id}>Dr. {p.name}</option>)}
            </select>
          )}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-sub)', pointerEvents: 'none' }} />
            <input type="text" value={calSearch} onChange={e => setCalSearch(e.target.value)} placeholder="Filtrer patient..." style={{ paddingLeft: '30px', width: '150px' }} />
          </div>
          <button onClick={() => exportToICS(appointments)} className="btn btn-secondary" title="Télécharger .ics">
            <Download size={16} /> <span className="hide-mobile">Export .ics</span>
          </button>
          <button onClick={printPlanningPDF} className="btn btn-secondary" title="PDF">
            <Printer size={16} /> <span className="hide-mobile">PDF</span>
          </button>
          {(canWrite || isPractitioner) && (
            <button onClick={() => { setShowForm(true); setError(null); }} className="btn btn-primary">
              <Plus size={17} /> <span className="hide-mobile">Nouveau RDV</span>
            </button>
          )}
        </div>
      </div>

      {error && <Alert type="error" msg={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" msg={success} onClose={() => setSuccess(null)} />}

      {/* Modal ajout RDV */}
      {showForm && (canWrite || isPractitioner) && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} /> Créer un rendez-vous
              </h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-sub)' }}>
                <X size={22} />
              </button>
            </div>
            <div className="modal-body">
              {error && <Alert type="error" msg={error} onClose={() => setError(null)} />}
              <form onSubmit={handleCreateAppointment} style={{ marginTop: error ? '12px' : 0 }}>
                <div className="form-grid-2" style={{ marginBottom: '20px' }}>
                  <div className="form-field">
                    <label>Patient <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <select value={fPatientId} onChange={e => setFPatientId(e.target.value)} required>
                      <option value="">-- Sélectionner --</option>
                      <option value="LIBRE">Patient non inscrit (saisie libre)</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.name}</option>)}
                    </select>
                  </div>
                  {fPatientId === 'LIBRE' && (
                    <div className="form-field">
                      <label>Nom complet <span style={{ color: 'var(--color-error)' }}>*</span></label>
                      <input type="text" value={fPatientName} onChange={e => setFPatientName(e.target.value)} required placeholder="Ex: Jean Dupont" />
                    </div>
                  )}
                  <div className="form-field">
                    <label>Service <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <select value={fService} onChange={e => setFService(e.target.value)}>
                      {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Date <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input
                      type="date"
                      value={fDate}
                      onChange={e => {
                        const newDate = e.target.value;
                        setFDate(newDate);
                        const slots = getValidTimeSlots(newDate);
                        if (slots.length > 0 && !slots.includes(fTime)) setFTime(slots[0]);
                      }}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {isSundaySelected && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>
                        Le centre est fermé le dimanche.
                      </span>
                    )}
                  </div>
                  <div className="form-field">
                    <label>Heure de début <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    {isSundaySelected ? (
                      <div style={{ padding: '8px 12px', color: 'var(--color-error)', fontSize: '0.85rem', background: '#fff1f2', borderRadius: 'var(--radius-sm)', border: '1px solid #fecdd3' }}>
                        Fermé
                      </div>
                    ) : (
                      <select value={fTime} onChange={e => setFTime(e.target.value)} required>
                        {validSlotsForDate.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="form-field">
                    <label>Durée <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <select value={fDuration} onChange={e => setFDuration(e.target.value)}>
                      <option value="30">30 min</option>
                      <option value="60">1 heure</option>
                      <option value="90">1h 30 min</option>
                      <option value="120">2 heures</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Praticien assigné</label>
                    {isPractitioner ? (
                      <input type="text" value={`Dr. ${currentUser.name}`} disabled />
                    ) : (
                      <select value={fPractitionerId} onChange={e => setFPractitionerId(e.target.value)}>
                        <option value="">-- Non assigné --</option>
                        {practitioners.map(p => <option key={p.id} value={p.id}>Dr. {p.name}</option>)}
                      </select>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '18px' }}>
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Annuler</button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting || isSundaySelected}>
                    {isSubmitting ? 'Création...' : 'Confirmer le RDV'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Navigation semaine */}
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

      {/* Grille calendrier */}
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
                  const cellRdv = (byDay[dayStr] || []).filter((a: any) => new Date(a.dateTime).getHours() === h);
                  return (
                    <div
                      key={idx}
                      onClick={() => openFormForSlot(day, `${String(h).padStart(2, '0')}:00`)}
                      style={{ flex: 1, borderRight: '1px solid #e2e8f0', padding: '3px', cursor: (canWrite || isPractitioner) ? 'pointer' : 'default', position: 'relative', transition: 'background-color 0.15s' }}
                      onMouseEnter={e => { if (canWrite || isPractitioner) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {cellRdv.map((a: any) => {
                        const displayName = a.patient ? `${a.patient.firstName} ${a.patient.name}` : a.patientName;
                        const timeStr = new Date(a.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                        const stat = STATUS_LABELS[a.status];
                        const duration = a.durationMinutes || 30;
                        const heightPx = Math.max(52, (duration / 60) * 100 - 4);
                        const topPx = new Date(a.dateTime).getMinutes() >= 30 ? 50 : 2;
                        return (
                          <div
                            key={a.id}
                            onClick={e => e.stopPropagation()}
                            style={{ position: 'absolute', top: `${topPx}px`, left: '3px', right: '3px', height: `${heightPx}px`, backgroundColor: '#ffffff', borderLeft: `3px solid ${stat?.color}`, borderRadius: '5px', padding: '5px 6px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', zIndex: 5, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '2px' }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.72rem', lineHeight: 1.2 }}>{timeStr}<br />{displayName}</span>
                              {canWrite && (
                                <button onClick={() => setDeleteConfirm({ id: a.id, label: displayName || 'Inconnu' })} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                            <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{duration} min</span>
                            {heightPx > 70 && (
                              <select
                                value={a.status}
                                onChange={e => handleChangeStatus(a.id, e.target.value)}
                                onClick={e => e.stopPropagation()}
                                style={{ padding: '2px 4px', fontSize: '0.65rem', width: '100%', marginTop: 'auto' }}
                                disabled={!canWrite}
                              >
                                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                              </select>
                            )}
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

      {deleteConfirm && (
        <ConfirmModal
          title="Supprimer le rendez-vous"
          message={`Supprimer le rendez-vous de ${deleteConfirm.label} ?`}
          onConfirm={() => handleDelete(deleteConfirm.id)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      <div style={{ marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', padding: '10px 14px', backgroundColor: 'var(--color-primary-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.81rem', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={13} style={{ flexShrink: 0 }} />
          <span><strong>Export .ics</strong> — téléchargez le planning de la semaine pour l'importer dans n'importe quel calendrier.</span>
        </div>
      </div>
    </div>
  );
}

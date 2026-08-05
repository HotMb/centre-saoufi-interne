import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Plus, X, Send, Trash2, ChevronDown } from 'lucide-react';
import { api } from '../api/client';
import { Alert } from '../components/Alert';
import { ConfirmModal } from '../components/ConfirmModal';
import { User, Patient, Practitioner, SuiviPatient, SuiviNote, StatutSuivi } from '../types';

const STATUT_LABELS: Record<StatutSuivi, string> = {
  EN_COURS:   'En cours',
  EN_PAUSE:   'En pause',
  TERMINE:    'Terminé',
  INTERROMPU: 'Interrompu',
};

const STATUT_COLORS: Record<StatutSuivi, { bg: string; color: string }> = {
  EN_COURS:   { bg: '#dcfce7', color: '#166534' },
  EN_PAUSE:   { bg: '#fef9c3', color: '#854d0e' },
  TERMINE:    { bg: '#dbeafe', color: '#1e40af' },
  INTERROMPU: { bg: '#fee2e2', color: '#991b1b' },
};

export function SuiviTab({ currentUser }: { currentUser: User }) {
  const isPraticien = currentUser.role === 'PRATICIEN';
  const isAdmin = currentUser.role === 'ADMIN';
  const canCreate = isPraticien || isAdmin;
  const canDelete = isAdmin;

  const [suivis, setSuivis] = useState<SuiviPatient[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterStatut, setFilterStatut] = useState<StatutSuivi | ''>('EN_COURS');

  const [selectedSuivi, setSelectedSuivi] = useState<SuiviPatient | null>(null);
  const [notes, setNotes] = useState<SuiviNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isUpdatingStatut, setIsUpdatingStatut] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [fPatientId, setFPatientId] = useState('');
  const [fPractitionerId, setFPractitionerId] = useState('');
  const [fPathologie, setFPathologie] = useState('');
  const [fObjectifs, setFObjectifs] = useState('');
  const [fSeances, setFSeances] = useState(10);
  const [fDateDebut, setFDateDebut] = useState(new Date().toISOString().split('T')[0]);
  const [fDateFin, setFDateFin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; label: string } | null>(null);

  const fetchSuivis = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const url = filterStatut ? `/api/suivis?statut=${filterStatut}` : '/api/suivis';
      const data = await api.get(url);
      setSuivis(data);
    } catch (err: any) { setError(err.message ?? 'Erreur de chargement.'); }
    finally { setIsLoading(false); }
  }, [filterStatut]);

  useEffect(() => { fetchSuivis(); }, [fetchSuivis]);

  useEffect(() => {
    if (canCreate) api.get('/api/patients').then(setPatients).catch(() => {});
    if (!isPraticien) api.get('/api/users/practitioners').then((d: any) => setPractitioners(d)).catch(() => {});
  }, [canCreate, isPraticien]);

  const openDetail = async (suivi: SuiviPatient) => {
    setSelectedSuivi(suivi);
    setNotes([]);
    setNewNote('');
    setNotesLoading(true);
    try {
      const n = await api.get(`/api/suivis/${suivi.id}/notes`);
      setNotes(n);
    } catch {}
    finally { setNotesLoading(false); }
  };

  const handleAddNote = async () => {
    if (!selectedSuivi || !newNote.trim()) return;
    setIsSavingNote(true);
    try {
      const note = await api.post(`/api/suivis/${selectedSuivi.id}/notes`, { content: newNote.trim() });
      setNotes(prev => [...prev, note]);
      setNewNote('');
    } catch (err: any) { setError(err.message ?? 'Erreur lors de l\'ajout.'); }
    finally { setIsSavingNote(false); }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!selectedSuivi) return;
    try {
      await api.delete(`/api/suivis/${selectedSuivi.id}/notes/${noteId}`);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err: any) { setError(err.message ?? 'Erreur suppression.'); }
  };

  const handleUpdateStatut = async (statut: StatutSuivi) => {
    if (!selectedSuivi) return;
    setIsUpdatingStatut(true);
    try {
      await api.patch(`/api/suivis/${selectedSuivi.id}`, { statut });
      setSelectedSuivi(prev => prev ? { ...prev, statut } : prev);
      setSuivis(prev => prev.map(s => s.id === selectedSuivi.id ? { ...s, statut } : s));
    } catch (err: any) { setError(err.message ?? 'Erreur mise à jour.'); }
    finally { setIsUpdatingStatut(false); }
  };

  const resetForm = () => {
    setFPatientId(''); setFPractitionerId(''); setFPathologie('');
    setFObjectifs(''); setFSeances(10); setFDateFin('');
    setFDateDebut(new Date().toISOString().split('T')[0]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fPatientId || !fPathologie.trim()) { setError('Patient et pathologie requis.'); return; }
    if (isAdmin && !fPractitionerId) { setError('Veuillez sélectionner un praticien.'); return; }
    setIsSubmitting(true); setError(null);
    try {
      await api.post('/api/suivis', {
        patientId: fPatientId,
        pathologie: fPathologie.trim(),
        ...(fObjectifs.trim() && { objectifs: fObjectifs.trim() }),
        seancesPrevues: fSeances,
        dateDebut: fDateDebut,
        ...(fDateFin && { dateFin: fDateFin }),
        ...(isAdmin && fPractitionerId && { practitionerId: fPractitionerId }),
      });
      setSuccess('Suivi créé avec succès.');
      setShowForm(false);
      resetForm();
      fetchSuivis();
    } catch (err: any) { setError(err.message ?? 'Erreur lors de la création.'); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm(null);
    try {
      await api.delete(`/api/suivis/${id}`);
      setSuccess('Suivi supprimé.');
      setSelectedSuivi(null);
      fetchSuivis();
    } catch (err: any) { setError(err.message ?? 'Erreur suppression.'); }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Suivis de Traitement</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-sub)', fontSize: '0.88rem' }}>Protocoles de rééducation et évolution des patients</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={filterStatut} onChange={e => setFilterStatut(e.target.value as StatutSuivi | '')}>
            <option value="">Tous les statuts</option>
            {(Object.keys(STATUT_LABELS) as StatutSuivi[]).map(s => (
              <option key={s} value={s}>{STATUT_LABELS[s]}</option>
            ))}
          </select>
          {canCreate && (
            <button onClick={() => { setShowForm(true); setError(null); }} className="btn btn-primary">
              <Plus size={17} /> Nouveau suivi
            </button>
          )}
        </div>
      </div>

      {error && <Alert type="error" msg={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" msg={success} onClose={() => setSuccess(null)} />}

      {/* Formulaire création */}
      {showForm && canCreate && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} /> Nouveau suivi de traitement
              </h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-sub)' }}>
                <X size={22} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreate}>
                <div className="form-grid-2" style={{ marginBottom: '18px' }}>
                  <div className="form-field">
                    <label>Patient <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <select value={fPatientId} onChange={e => setFPatientId(e.target.value)} required>
                      <option value="">-- Sélectionner --</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Praticien {isAdmin && <span style={{ color: 'var(--color-error)' }}>*</span>}</label>
                    {isAdmin ? (
                      <select value={fPractitionerId} onChange={e => setFPractitionerId(e.target.value)} required>
                        <option value="">-- Sélectionner --</option>
                        {practitioners.map(p => <option key={p.id} value={p.id}>Dr. {p.name}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={`Dr. ${currentUser.name}`} disabled />
                    )}
                  </div>
                  <div className="form-field" style={{ gridColumn: 'span 2' }}>
                    <label>Pathologie <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input type="text" value={fPathologie} onChange={e => setFPathologie(e.target.value)} required placeholder="Ex: Lombalgie chronique L4-L5" />
                  </div>
                  <div className="form-field" style={{ gridColumn: 'span 2' }}>
                    <label>Objectifs thérapeutiques</label>
                    <textarea value={fObjectifs} onChange={e => setFObjectifs(e.target.value)} rows={2} placeholder="Ex: Réduire la douleur à EVA < 2, restaurer la mobilité..." style={{ resize: 'vertical' }} />
                  </div>
                  <div className="form-field">
                    <label>Séances prévues <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input type="number" value={fSeances} onChange={e => setFSeances(Number(e.target.value))} min={1} max={200} required />
                  </div>
                  <div className="form-field">
                    <label>Date de début <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input type="date" value={fDateDebut} onChange={e => setFDateDebut(e.target.value)} required />
                  </div>
                  <div className="form-field">
                    <label>Date de fin prévue</label>
                    <input type="date" value={fDateFin} onChange={e => setFDateFin(e.target.value)} min={fDateDebut} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '18px' }}>
                  <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn btn-secondary">Annuler</button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Enregistrement...' : 'Créer le suivi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-sub)' }}>Chargement...</div>
      ) : suivis.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-sub)' }}>
          <Activity size={40} style={{ marginBottom: '14px', opacity: 0.3 }} />
          <p style={{ margin: 0 }}>
            Aucun suivi{filterStatut ? ` avec le statut « ${STATUT_LABELS[filterStatut as StatutSuivi]} »` : ''}.
          </p>
          {canCreate && <p style={{ margin: '8px 0 0', fontSize: '0.85rem' }}>Cliquez sur « Nouveau suivi » pour en créer un.</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {suivis.map(suivi => {
            const sc = STATUT_COLORS[suivi.statut];
            return (
              <div
                key={suivi.id}
                className="card"
                onClick={() => openDetail(suivi)}
                style={{ cursor: 'pointer', transition: 'box-shadow 0.15s', borderLeft: `4px solid ${sc.color}` }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                        {suivi.patient ? `${suivi.patient.firstName} ${suivi.patient.name}` : '—'}
                      </span>
                      <span style={{ background: sc.bg, color: sc.color, padding: '2px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {STATUT_LABELS[suivi.statut]}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.88rem', marginBottom: '4px', fontWeight: 600 }}>{suivi.pathologie}</div>
                    {suivi.objectifs && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)', fontStyle: 'italic', marginBottom: '6px', maxWidth: '600px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {suivi.objectifs}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '18px', fontSize: '0.78rem', color: 'var(--color-text-sub)', flexWrap: 'wrap' }}>
                      <span>
                        Début : {new Date(suivi.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {suivi.dateFin && ` · Fin : ${new Date(suivi.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                      </span>
                      <span>{suivi.seancesPrevues} séances prévues</span>
                      {suivi.practitioner && <span>Dr. {suivi.practitioner.name}</span>}
                      {suivi._count !== undefined && <span>{suivi._count.notes} note{suivi._count.notes !== 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  <ChevronDown size={18} style={{ color: 'var(--color-text-sub)', flexShrink: 0, marginTop: '4px' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Détail / modal */}
      {selectedSuivi && (
        <div className="modal-overlay" onClick={() => setSelectedSuivi(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} />
                {selectedSuivi.patient ? `${selectedSuivi.patient.firstName} ${selectedSuivi.patient.name}` : 'Suivi'}
              </h3>
              <button onClick={() => setSelectedSuivi(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-sub)' }}>
                <X size={22} />
              </button>
            </div>
            <div className="modal-body" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Infos */}
              <div>
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ color: 'var(--color-text-sub)', fontSize: '0.75rem', display: 'block', marginBottom: '2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pathologie</span>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{selectedSuivi.pathologie}</span>
                </div>
                {selectedSuivi.objectifs && (
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ color: 'var(--color-text-sub)', fontSize: '0.75rem', display: 'block', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Objectifs</span>
                    <div style={{ padding: '8px 12px', background: 'var(--color-bg-global)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '0.86rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {selectedSuivi.objectifs}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-sub)', fontSize: '0.75rem', display: 'block', marginBottom: '2px' }}>Début</span>
                    <span style={{ fontWeight: 600 }}>{new Date(selectedSuivi.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  </div>
                  {selectedSuivi.dateFin && (
                    <div>
                      <span style={{ color: 'var(--color-text-sub)', fontSize: '0.75rem', display: 'block', marginBottom: '2px' }}>Fin prévue</span>
                      <span style={{ fontWeight: 600 }}>{new Date(selectedSuivi.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    </div>
                  )}
                  <div>
                    <span style={{ color: 'var(--color-text-sub)', fontSize: '0.75rem', display: 'block', marginBottom: '2px' }}>Séances prévues</span>
                    <span style={{ fontWeight: 600 }}>{selectedSuivi.seancesPrevues}</span>
                  </div>
                  {selectedSuivi.practitioner && (
                    <div>
                      <span style={{ color: 'var(--color-text-sub)', fontSize: '0.75rem', display: 'block', marginBottom: '2px' }}>Praticien</span>
                      <span style={{ fontWeight: 600 }}>Dr. {selectedSuivi.practitioner.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Changer statut */}
              {canCreate && (
                <div>
                  <span style={{ color: 'var(--color-text-sub)', fontSize: '0.75rem', display: 'block', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Statut du suivi
                  </span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(Object.keys(STATUT_LABELS) as StatutSuivi[]).map(s => {
                      const sc = STATUT_COLORS[s];
                      const isActive = selectedSuivi.statut === s;
                      return (
                        <button
                          key={s}
                          onClick={() => handleUpdateStatut(s)}
                          disabled={isUpdatingStatut || isActive}
                          style={{
                            padding: '5px 14px',
                            borderRadius: '20px',
                            border: `2px solid ${isActive ? sc.color : 'var(--color-border)'}`,
                            background: isActive ? sc.bg : 'transparent',
                            color: isActive ? sc.color : 'var(--color-text-sub)',
                            fontWeight: isActive ? 700 : 500,
                            fontSize: '0.78rem',
                            cursor: isActive ? 'default' : 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          {STATUT_LABELS[s]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <span style={{ color: 'var(--color-text-sub)', fontSize: '0.75rem', display: 'block', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Notes de suivi ({notes.length})
                </span>
                {notesLoading ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-sub)', padding: '8px 0' }}>Chargement...</div>
                ) : notes.length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-sub)', fontStyle: 'italic', padding: '8px 0' }}>
                    Aucune note pour ce suivi.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {notes.map(note => (
                      <div key={note.id} style={{ padding: '10px 14px', background: 'var(--color-bg-global)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', borderLeft: '3px solid var(--color-primary)' }}>
                        <div style={{ fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '6px' }}>{note.content}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-sub)' }}>
                            Dr. {note.author?.name ?? '—'} · {new Date(note.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          {canCreate && (
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              style={{ border: 'none', background: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {canCreate && (
                  <div style={{ marginTop: '14px', borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                      <textarea
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        placeholder="Ajouter une note de suivi..."
                        rows={2}
                        style={{ flex: 1, resize: 'vertical', fontSize: '0.88rem' }}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddNote(); }}
                      />
                      <button
                        onClick={handleAddNote}
                        disabled={isSavingNote || !newNote.trim()}
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
              </div>

              {canDelete && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
                  <button
                    onClick={() => {
                      const label = selectedSuivi.patient
                        ? `${selectedSuivi.patient.firstName} ${selectedSuivi.patient.name}`
                        : 'ce suivi';
                      setDeleteConfirm({ id: selectedSuivi.id, label });
                      setSelectedSuivi(null);
                    }}
                    className="btn btn-secondary"
                    style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)', fontSize: '0.82rem' }}
                  >
                    <Trash2 size={14} /> Supprimer le suivi
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <ConfirmModal
          title="Supprimer le suivi"
          message={`Supprimer le suivi de ${deleteConfirm.label} ? Toutes les notes associées seront également supprimées.`}
          onConfirm={() => handleDelete(deleteConfirm.id)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

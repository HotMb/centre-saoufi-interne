import React, { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  UserRound, Search, X, Plus, ArrowLeft, Download,
  ChevronRight, Upload,
} from 'lucide-react';
import { api } from '../api/client';
import { Alert } from '../components/Alert';
import { ConfirmModal } from '../components/ConfirmModal';
import { PatientForm } from '../components/PatientForm';
import { User, Patient, PatientNote } from '../types';
import { STATUS_LABELS } from '../constants';
import { formatDate, calcAge } from '../utils/helpers';

// ─── Détail Patient ───────────────────────────────────────────────────────────
function PatientDetail({
  patient, canEdit, canDelete, onEdit, onDelete, onBack, currentUser,
}: {
  patient: Patient; canEdit: boolean; canDelete: boolean;
  onEdit: () => void; onDelete: () => void; onBack: () => void;
  currentUser: User;
}) {
  const canSeeNotes = currentUser.role === 'ADMIN' || currentUser.role === 'PRATICIEN';
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [noteContent, setNoteContent] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  useEffect(() => {
    if (!canSeeNotes) return;
    api.get(`/api/patients/${patient.id}/notes`).then(setNotes).catch(() => {});
  }, [patient.id, canSeeNotes]);

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    setNoteLoading(true); setNoteError(null);
    try {
      const created = await api.post(`/api/patients/${patient.id}/notes`, { content: noteContent });
      setNotes(n => [created, ...n]);
      setNoteContent('');
    } catch (e: any) {
      setNoteError(e.message || 'Erreur lors de l\'ajout de la note.');
    } finally { setNoteLoading(false); }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await api.delete(`/api/patients/${patient.id}/notes/${noteId}`);
      setNotes(n => n.filter(x => x.id !== noteId));
    } catch { }
  };

  const downloadBilanPDF = () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.width;
    doc.setFontSize(18);
    doc.text('Centre Saoufi – Bilan Patient', pw / 2, 20, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`Patient : ${patient.firstName} ${patient.name}`, 14, 36);
    doc.text(`Date de naissance : ${formatDate(patient.birthDate)} (${calcAge(patient.birthDate)} ans)`, 14, 44);
    doc.text(`Téléphone : ${patient.phone}`, 14, 52);
    doc.text(`Email : ${patient.email || 'Non renseigné'}`, 14, 60);
    doc.setFontSize(13);
    doc.text('Historique des Rendez-vous', 14, 74);
    if (patient.appointments && patient.appointments.length > 0) {
      autoTable(doc, {
        startY: 78,
        head: [['Date', 'Service', 'Statut']],
        body: patient.appointments.map(a => [formatDate(a.dateTime), a.service, a.status]),
        theme: 'grid',
      });
    }
    doc.save(`Bilan_${patient.name}_${patient.firstName}.pdf`);
  };

  const infoRow = (icon: string, label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '1rem', minWidth: '20px' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-sub)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontWeight: 500, marginTop: '2px' }}>{value || <span style={{ color: 'var(--color-text-sub)' }}>Non renseigné</span>}</div>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={onBack} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ margin: 0 }}>{patient.firstName} {patient.name}</h1>
            <p style={{ color: 'var(--color-text-sub)', margin: '4px 0 0', fontSize: '0.88rem' }}>
              {calcAge(patient.birthDate)} ans · Né(e) le {formatDate(patient.birthDate)}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {canEdit && <button onClick={onEdit} className="btn btn-secondary">Modifier</button>}
          {canDelete && <button onClick={onDelete} className="btn btn-danger">Supprimer</button>}
          <button onClick={downloadBilanPDF} className="btn btn-accent" style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Download size={16} /> Bilan PDF
          </button>
        </div>
      </div>

      <div className="form-grid-2" style={{ marginBottom: '20px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '18px', color: 'var(--color-text-sub)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Coordonnées</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {infoRow('📞', 'Téléphone', patient.phone)}
            {infoRow('📧', 'Email', patient.email)}
            {infoRow('📍', 'Adresse', patient.address)}
            {infoRow('🩺', 'Médecin traitant', patient.medecinTraitant)}
            {infoRow('🏥', 'Pathologie', patient.pathologie)}
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '18px', color: 'var(--color-text-sub)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Récapitulatif</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {infoRow('📅', 'RDV enregistrés', `${patient.appointments?.length ?? 0}`)}
            {infoRow('🩺', 'Séances enregistrées', `${patient.sessions?.length ?? 0}`)}
            {infoRow('🗓️', 'Dossier créé le', patient.createdAt ? formatDate(patient.createdAt) : '—')}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '18px' }}>
        <h3 style={{ marginBottom: '16px' }}>Derniers Rendez-vous</h3>
        {(!patient.appointments || patient.appointments.length === 0) ? (
          <p style={{ color: 'var(--color-text-sub)', textAlign: 'center', padding: '20px' }}>Aucun rendez-vous enregistré.</p>
        ) : (
          <div className="table-container" style={{ marginTop: 0 }}>
            <table>
              <thead><tr><th>Date</th><th>Service</th><th>Statut</th></tr></thead>
              <tbody>
                {patient.appointments.map(a => {
                  const s = STATUS_LABELS[a.status];
                  return (
                    <tr key={a.id}>
                      <td>{formatDate(a.dateTime)}</td>
                      <td>{a.service}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: s?.color ?? 'inherit', fontSize: '0.83rem' }}>
                          {s?.label ?? a.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>Historique des Séances</h3>
        {(!patient.sessions || patient.sessions.length === 0) ? (
          <p style={{ color: 'var(--color-text-sub)', textAlign: 'center', padding: '20px' }}>Aucune séance enregistrée.</p>
        ) : (
          <div className="table-container" style={{ marginTop: 0 }}>
            <table>
              <thead><tr><th>Date</th><th>Service</th><th>Notes</th></tr></thead>
              <tbody>
                {patient.sessions.map(s => (
                  <tr key={s.id}>
                    <td>{formatDate(s.dateTime)}</td>
                    <td>{s.service}</td>
                    <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-sub)' }}>
                      {s.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canSeeNotes && (
        <div className="card" style={{ marginTop: '18px' }}>
          <h3 style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Notes du dossier</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: 'rgba(99,102,241,0.12)', color: 'var(--color-accent)' }}>
              Confidentiel — praticiens & admin
            </span>
          </h3>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <textarea
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)}
              placeholder="Ajouter une note clinique ou observation..."
              rows={3}
              style={{ flex: 1, resize: 'vertical', fontFamily: 'inherit', fontSize: '0.9rem' }}
            />
            <button
              className="btn btn-accent"
              onClick={handleAddNote}
              disabled={noteLoading || !noteContent.trim()}
              style={{ alignSelf: 'flex-end', whiteSpace: 'nowrap' }}
            >
              {noteLoading ? '...' : '+ Ajouter'}
            </button>
          </div>
          {noteError && <Alert type="error" msg={noteError} onClose={() => setNoteError(null)} />}

          {notes.length === 0 ? (
            <p style={{ color: 'var(--color-text-sub)', textAlign: 'center', padding: '12px' }}>Aucune note pour ce dossier.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notes.map(note => (
                <div key={note.id} style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--color-bg-page)', border: '1px solid var(--color-border)', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <p style={{ margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', flex: 1 }}>{note.content}</p>
                    {(currentUser.role === 'ADMIN' || note.authorId === currentUser.id) && (
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', padding: '2px 6px', fontSize: '1rem', flexShrink: 0 }}
                        title="Supprimer cette note"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--color-text-sub)' }}>
                    Dr. {note.author?.name} · {new Date(note.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Onglet Patients ──────────────────────────────────────────────────────────
export function PatientsTab({ currentUser }: { currentUser: User }) {
  const [view, setView] = useState<'list' | 'create' | 'detail' | 'edit'>('list');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [csvResult, setCsvResult] = useState<{ created: number; errors: string[] } | null>(null);

  const canWrite = currentUser.role === 'ADMIN' || currentUser.role === 'SECRETAIRE';
  const canDelete = currentUser.role === 'ADMIN';

  const fetchPatients = useCallback(async (q?: string) => {
    setIsLoading(true); setError(null);
    try {
      const url = q ? `/api/patients?search=${encodeURIComponent(q)}` : '/api/patients';
      setPatients(await api.get(url));
    } catch (err: any) {
      setError(err.message ?? 'Impossible de charger les patients.');
    } finally { setIsLoading(false); }
  }, []);

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { setError('Fichier CSV vide ou invalide.'); return; }
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      const idx = (name: string) => header.findIndex(h => h.includes(name));
      const iNom = idx('nom'); const iPrenom = idx('prénom') >= 0 ? idx('prénom') : idx('prenom');
      const iTel = idx('tél') >= 0 ? idx('tél') : idx('tel') >= 0 ? idx('tel') : idx('phone');
      const iEmail = idx('email'); const iDate = idx('naiss') >= 0 ? idx('naiss') : idx('birth') >= 0 ? idx('birth') : idx('date');
      const iAdresse = idx('adresse') >= 0 ? idx('adresse') : idx('address');
      const iMedecin = idx('médecin') >= 0 ? idx('médecin') : idx('medecin');
      const iPatho = idx('pathol');
      if (iNom < 0 || iPrenom < 0) { setError('Le CSV doit avoir des colonnes "Nom" et "Prénom".'); return; }
      const rows = lines.slice(1).map(l => {
        const cols = l.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        return {
          name: cols[iNom] ?? '',
          firstName: cols[iPrenom] ?? '',
          phone: iTel >= 0 ? cols[iTel] : undefined,
          email: iEmail >= 0 ? cols[iEmail] : undefined,
          birthDate: iDate >= 0 ? cols[iDate] : undefined,
          address: iAdresse >= 0 ? cols[iAdresse] : undefined,
          medecinTraitant: iMedecin >= 0 ? cols[iMedecin] : undefined,
          pathologie: iPatho >= 0 ? cols[iPatho] : undefined,
        };
      }).filter(r => r.name && r.firstName);
      if (rows.length === 0) { setError('Aucune ligne valide trouvée dans le CSV.'); return; }
      setIsLoading(true);
      try {
        const result = await api.post('/api/patients/bulk-import', { patients: rows });
        setCsvResult(result);
        fetchPatients(search);
      } catch (err: any) { setError(err.message ?? "Erreur lors de l'import."); }
      finally { setIsLoading(false); }
    };
    reader.readAsText(file, 'UTF-8');
  };

  useEffect(() => { if (view === 'list') fetchPatients(search); }, [view]);

  const openDetail = async (id: string) => {
    setError(null); setIsLoading(true);
    try {
      setSelectedPatient(await api.get(`/api/patients/${id}`));
      setView('detail');
    } catch (err: any) {
      setError(err.message ?? 'Impossible de charger le dossier.');
    } finally { setIsLoading(false); }
  };

  const handleCreate = async (data: Omit<Patient, 'id' | 'createdAt' | 'appointments' | 'sessions'>) => {
    setIsLoading(true); setError(null);
    try {
      await api.post('/api/patients', data);
      setSuccess('Dossier patient créé avec succès.');
      setView('list');
    } catch (err: any) { setError(err.message ?? 'Erreur lors de la création.'); }
    finally { setIsLoading(false); }
  };

  const handleUpdate = async (data: Omit<Patient, 'id' | 'createdAt' | 'appointments' | 'sessions'>) => {
    if (!selectedPatient) return;
    setIsLoading(true); setError(null);
    try {
      await api.patch(`/api/patients/${selectedPatient.id}`, data);
      setSuccess('Dossier mis à jour.');
      setSelectedPatient(await api.get(`/api/patients/${selectedPatient.id}`));
      setView('detail');
    } catch (err: any) { setError(err.message ?? 'Erreur de mise à jour.'); }
    finally { setIsLoading(false); }
  };

  const handleDelete = async () => {
    if (!selectedPatient) return;
    setConfirmDelete(false);
    setIsLoading(true); setError(null);
    try {
      await api.delete(`/api/patients/${selectedPatient.id}`);
      setSuccess(`Dossier de ${selectedPatient.firstName} ${selectedPatient.name} supprimé.`);
      setSelectedPatient(null); setView('list');
    } catch (err: any) { setError(err.message ?? 'Erreur lors de la suppression.'); }
    finally { setIsLoading(false); }
  };

  if (view === 'list') {
    const PAGE_SIZE = 20;
    const totalPages = Math.ceil(patients.length / PAGE_SIZE);
    const paginated = patients.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ margin: 0 }}>Dossiers Patients</h1>
            <p style={{ color: 'var(--color-text-sub)', marginTop: '6px', fontSize: '0.9rem' }}>
              Registre centralisé — accès restreint selon votre rôle (RGPD).
            </p>
          </div>
          {canWrite && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Upload size={16} /> Importer CSV
                <input type="file" accept=".csv" onChange={handleCsvImport} style={{ display: 'none' }} />
              </label>
              <button onClick={() => setView('create')} className="btn btn-primary">
                <Plus size={17} /> Nouveau Patient
              </button>
            </div>
          )}
        </div>

        {error && <Alert type="error" msg={error} onClose={() => setError(null)} />}
        {success && <Alert type="success" msg={success} onClose={() => setSuccess(null)} />}

        <div className="card" style={{ marginBottom: '18px' }}>
          <form onSubmit={e => { e.preventDefault(); fetchPatients(search); }} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-sub)' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher par nom, prénom ou téléphone..."
                style={{ paddingLeft: '36px' }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 18px' }}>Rechercher</button>
            {search && (
              <button type="button" className="btn btn-secondary" onClick={() => { setSearch(''); fetchPatients(); }} style={{ padding: '10px 14px' }}>
                <X size={15} />
              </button>
            )}
          </form>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, color: 'var(--color-text-sub)', fontSize: '0.85rem', fontWeight: 600 }}>
              {isLoading ? 'Chargement...' : `${patients.length} patient(s) trouvé(s)`}
            </h3>
            {totalPages > 1 && (
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-sub)' }}>
                Page {page} / {totalPages}
              </span>
            )}
          </div>
          {isLoading ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-sub)', padding: '40px' }}>Chargement...</p>
          ) : patients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--color-text-sub)' }}>
              <UserRound size={38} style={{ opacity: 0.25, marginBottom: '10px' }} />
              <p>{search ? 'Aucun patient ne correspond à cette recherche.' : 'Aucun patient enregistré.'}</p>
            </div>
          ) : (
            <>
              <div className="table-container" style={{ marginTop: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Nom / Prénom</th>
                      <th className="hide-mobile">Téléphone</th>
                      <th className="hide-mobile">Email</th>
                      <th className="hide-mobile">Âge</th>
                      <th className="hide-mobile">Dossier créé</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(p => (
                      <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(p.id)}>
                        <td style={{ fontWeight: 600 }}>
                          {p.firstName} {p.name}
                          <div className="show-mobile" style={{ fontSize: '0.78rem', color: 'var(--color-text-sub)', fontWeight: 400 }}>{p.phone}</div>
                        </td>
                        <td className="hide-mobile">{p.phone}</td>
                        <td className="hide-mobile" style={{ color: p.email ? 'inherit' : 'var(--color-text-sub)' }}>{p.email ?? '—'}</td>
                        <td className="hide-mobile">{calcAge(p.birthDate)} ans</td>
                        <td className="hide-mobile" style={{ fontSize: '0.83rem', color: 'var(--color-text-sub)' }}>{p.createdAt ? formatDate(p.createdAt) : '—'}</td>
                        <td><ChevronRight size={17} style={{ color: 'var(--color-primary)', opacity: 0.7 }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary" style={{ padding: '6px 14px' }}>← Préc.</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setPage(n)} className={`btn ${n === page ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 12px', minWidth: '36px' }}>{n}</button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-secondary" style={{ padding: '6px 14px' }}>Suiv. →</button>
                </div>
              )}
            </>
          )}
        </div>

        {csvResult && (
          <div className="modal-overlay" onClick={() => setCsvResult(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
              <div className="modal-header">
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Import CSV terminé</h2>
                <button onClick={() => setCsvResult(null)} className="btn btn-secondary" style={{ padding: '6px 10px' }}><X size={16} /></button>
              </div>
              <div className="modal-body">
                <div style={{ display: 'flex', gap: '18px', marginBottom: '18px' }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: '18px', background: '#d1fae5', borderRadius: '12px' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#065f46' }}>{csvResult.created}</div>
                    <div style={{ fontSize: '0.82rem', color: '#065f46', marginTop: '4px' }}>patients créés</div>
                  </div>
                  {csvResult.errors.length > 0 && (
                    <div style={{ flex: 1, textAlign: 'center', padding: '18px', background: '#fee2e2', borderRadius: '12px' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#991b1b' }}>{csvResult.errors.length}</div>
                      <div style={{ fontSize: '0.82rem', color: '#991b1b', marginTop: '4px' }}>erreur(s)</div>
                    </div>
                  )}
                </div>
                {csvResult.errors.length > 0 && (
                  <div style={{ background: '#fef2f2', borderRadius: '8px', padding: '12px', fontSize: '0.82rem' }}>
                    <strong style={{ color: '#991b1b' }}>Lignes ignorées :</strong>
                    <ul style={{ marginTop: '6px', paddingLeft: '16px', color: '#7f1d1d' }}>
                      {csvResult.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                      {csvResult.errors.length > 10 && <li>... et {csvResult.errors.length - 10} autres</li>}
                    </ul>
                  </div>
                )}
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)', marginTop: '14px' }}>
                  Format attendu : <code>Nom,Prénom,Téléphone,Email,DateNaissance,Adresse</code>
                </p>
              </div>
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)' }}>
                <button onClick={() => setCsvResult(null)} className="btn btn-primary">Fermer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'create') return (
    <div>
      {error && <Alert type="error" msg={error} onClose={() => setError(null)} />}
      <PatientForm title="Nouveau Dossier Patient" onSubmit={handleCreate} onCancel={() => setView('list')} isLoading={isLoading} />
    </div>
  );

  if (view === 'edit' && selectedPatient) return (
    <div>
      {error && <Alert type="error" msg={error} onClose={() => setError(null)} />}
      <PatientForm
        title={`Modifier — ${selectedPatient.firstName} ${selectedPatient.name}`}
        initial={selectedPatient}
        onSubmit={handleUpdate}
        onCancel={() => setView('detail')}
        isLoading={isLoading}
      />
    </div>
  );

  if (view === 'detail' && selectedPatient) return (
    <div>
      {error && <Alert type="error" msg={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" msg={success} onClose={() => setSuccess(null)} />}
      {confirmDelete && (
        <ConfirmModal
          title="Supprimer le dossier patient"
          message={`Supprimer définitivement le dossier de ${selectedPatient.firstName} ${selectedPatient.name} ? Cette action est irréversible.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      <PatientDetail
        patient={selectedPatient}
        canEdit={canWrite}
        canDelete={canDelete}
        currentUser={currentUser}
        onEdit={() => setView('edit')}
        onDelete={() => setConfirmDelete(true)}
        onBack={() => { setSelectedPatient(null); setView('list'); }}
      />
    </div>
  );

  return null;
}

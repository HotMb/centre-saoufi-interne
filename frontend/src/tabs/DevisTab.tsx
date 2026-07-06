import { useState, useEffect } from 'react';
import { FileText, Plus, Minus, CheckCircle } from 'lucide-react';
import { api } from '../api/client';
import { Alert } from '../components/Alert';
import { generateDevisPDF } from '../utils/devisGenerator';
import { Patient, Practitioner } from '../types';
import { SERVICES } from '../constants';
import { checkHoursWarning } from '../utils/helpers';

export function DevisTab() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientFullName, setPatientFullName] = useState('');
  const [medecinTraitant, setMedecinTraitant] = useState('');
  const [pathologie, setPathologie] = useState('');
  const [practitionerId, setPractitionerId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [service, setService] = useState<string>(SERVICES[0]);
  const [numeroDevis, setNumeroDevis] = useState(() => {
    const y = new Date().getFullYear();
    const n = String(Date.now()).slice(-4);
    return `DEVIS-${y}-${n}`;
  });
  const [prixUnitaire, setPrixUnitaire] = useState(150);
  const [seances, setSeances] = useState<{ date: string; heure: string }[]>([
    { date: new Date().toISOString().split('T')[0], heure: '09:00' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    api.get('/api/patients').then(setPatients).catch(() => {});
    api.get('/api/users/practitioners').then((data: any) => setPractitioners(data)).catch(() => {});
  }, []);

  const handlePatientChange = async (id: string) => {
    setSelectedPatientId(id);
    if (!id) { setPatientFullName(''); setMedecinTraitant(''); setPathologie(''); return; }
    try {
      const p = await api.get(`/api/patients/${id}`);
      setPatientFullName(`${p.firstName} ${p.name}`);
      setMedecinTraitant(p.medecinTraitant ?? '');
      setPathologie(p.pathologie ?? '');
    } catch { }
  };

  const today = new Date().toISOString().split('T')[0];
  const addSeance = () => setSeances(s => {
    const last = s[s.length - 1];
    return [...s, { date: last?.date ?? today, heure: last?.heure ?? '09:00' }];
  });
  const removeSeance = (i: number) => setSeances(s => s.filter((_, idx) => idx !== i));
  const updateSeance = (i: number, field: 'date' | 'heure', val: string) =>
    setSeances(s => s.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const handleGenerate = () => {
    if (!patientFullName.trim()) { setError('Veuillez renseigner le nom du patient.'); return; }
    if (seances.length === 0) { setError('Ajoutez au moins une séance.'); return; }
    setError(null);
    try {
      generateDevisPDF({
        patientFullName,
        medecinTraitant: medecinTraitant || '—',
        pathologie: pathologie || '—',
        numeroDevis,
        prixUnitaire,
        seances: seances.map((s, i) => ({
          numero: i + 1,
          dateHeureStr: `${new Date(s.date).toLocaleDateString('fr-FR')} à ${s.heure}`,
        })),
      });
    } catch (err: any) { setError(err.message ?? 'Erreur lors de la génération du PDF.'); }
  };

  const handleConfirmRdv = async () => {
    if (!selectedPatientId && !patientFullName.trim()) { setError('Veuillez renseigner le nom du patient avant de créer les rendez-vous.'); return; }
    if (seances.length === 0) { setError('Ajoutez au moins une séance.'); return; }
    setIsConfirming(true); setError(null); setConfirmSuccess(null);
    try {
      const dates = seances.map(s => new Date(`${s.date}T${s.heure}:00`).toISOString());
      await api.post('/api/appointments/bulk', {
        ...(selectedPatientId ? { patientId: selectedPatientId } : { patientName: patientFullName.trim() }),
        service,
        dates,
        practitionerId: practitionerId || null,
        durationMinutes,
      });
      setConfirmSuccess(`✓ ${seances.length} rendez-vous créé(s) dans le planning avec statut PLANIFIÉ.`);
    } catch (err: any) { setError(err.message ?? 'Erreur lors de la création des RDV.'); }
    finally { setIsConfirming(false); }
  };

  const totalTTC = seances.length * prixUnitaire;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={22} /> Devis
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--color-text-sub)', fontSize: '0.88rem' }}>
          Créer et exporter un devis PDF pour le Centre Saoufi
        </p>
      </div>

      {error && <Alert type="error" msg={error} onClose={() => setError(null)} />}
      {confirmSuccess && <Alert type="success" msg={confirmSuccess} onClose={() => setConfirmSuccess(null)} />}

      <div className="devis-layout">
        {/* Formulaire principal */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ margin: 0 }}>Informations du devis</h3>

          <div className="form-grid-2">
            <div className="form-field">
              <label>Patient (dossier)</label>
              <select value={selectedPatientId} onChange={e => handlePatientChange(e.target.value)}>
                <option value="">— Saisie manuelle —</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.name}</option>)}
              </select>
              {!selectedPatientId && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-sub)', marginTop: '3px' }}>
                  Patient non inscrit ? Saisissez le nom ci-dessous.
                </span>
              )}
            </div>
            <div className="form-field">
              <label>Nom complet sur le PDF <span style={{ color: 'var(--color-error)' }}>*</span></label>
              <input
                type="text"
                value={patientFullName}
                onChange={e => setPatientFullName(e.target.value)}
                placeholder="Ex : DUPONT Jean"
                style={{ borderColor: !patientFullName.trim() ? 'var(--color-warning)' : undefined }}
              />
            </div>
            <div className="form-field">
              <label>Médecin traitant</label>
              <input type="text" value={medecinTraitant} onChange={e => setMedecinTraitant(e.target.value)} placeholder="Ex : Dr. Martin" />
            </div>
            <div className="form-field">
              <label>Pathologie</label>
              <input type="text" value={pathologie} onChange={e => setPathologie(e.target.value)} placeholder="Ex : Rééducation genou" />
            </div>
          </div>

          <div style={{ padding: '14px 16px', background: 'var(--color-bg-global)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              Paramètres des rendez-vous générés
            </div>
            <div className="form-grid-3">
              <div className="form-field">
                <label>Praticien assigné</label>
                <select value={practitionerId} onChange={e => setPractitionerId(e.target.value)}>
                  <option value="">— Non assigné —</option>
                  {practitioners.map(p => <option key={p.id} value={p.id}>Dr. {p.name}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Service</label>
                <select value={service} onChange={e => setService(e.target.value)}>
                  {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Durée (min)</label>
                <input type="number" min={15} step={15} value={durationMinutes} onChange={e => setDurationMinutes(parseInt(e.target.value) || 30)} />
              </div>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label>Numéro de devis <span style={{ color: 'var(--color-error)' }}>*</span></label>
              <input type="text" value={numeroDevis} onChange={e => setNumeroDevis(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Prix unitaire par séance (DH TTC) <span style={{ color: 'var(--color-error)' }}>*</span></label>
              <input type="number" min={0} step={10} value={prixUnitaire} onChange={e => setPrixUnitaire(parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ margin: 0 }}>Séances ({seances.length})</label>
              <button type="button" onClick={addSeance} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
                <Plus size={14} /> Ajouter séance
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {seances.map((s, i) => {
                const warn = checkHoursWarning(s.date, s.heure);
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr auto', gap: '10px', alignItems: 'center', padding: '10px 14px', background: 'var(--color-bg-global)', borderRadius: 'var(--radius-sm)', border: `1px solid ${warn ? '#f59e0b' : 'var(--color-border)'}` }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-text-sub)', fontSize: '0.82rem', minWidth: '24px' }}>#{i + 1}</span>
                      <input type="date" value={s.date} min={today} onChange={e => updateSeance(i, 'date', e.target.value)} />
                      <select value={s.heure} onChange={e => updateSeance(i, 'heure', e.target.value)}>
                        {Array.from({ length: 22 }, (_, j) => {
                          const h = Math.floor(j / 2) + 8;
                          const m = j % 2 === 0 ? '00' : '30';
                          return `${String(h).padStart(2, '0')}:${m}`;
                        }).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      {seances.length > 1 && (
                        <button type="button" onClick={() => removeSeance(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', padding: '4px', display: 'flex' }}>
                          <Minus size={16} />
                        </button>
                      )}
                    </div>
                    {warn && (
                      <span style={{ fontSize: '0.73rem', color: '#f59e0b', paddingLeft: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ⚠ {warn} — incluse dans le devis mais hors planning standard
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Résumé + actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <h3 style={{ margin: '0 0 16px' }}>Résumé</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-sub)' }}>Patient</span>
                <span style={{ fontWeight: 600 }}>{patientFullName || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-sub)' }}>Numéro</span>
                <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.82rem' }}>{numeroDevis}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-sub)' }}>Nombre de séances</span>
                <span style={{ fontWeight: 600 }}>{seances.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-sub)' }}>Prix unitaire</span>
                <span style={{ fontWeight: 600 }}>{prixUnitaire.toFixed(2)} DH</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '2px solid var(--color-border)', fontSize: '1.05rem' }}>
                <span style={{ fontWeight: 700 }}>Total TTC</span>
                <span style={{ fontWeight: 800, color: 'var(--color-primary-dark)', fontSize: '1.2rem' }}>{totalTTC.toFixed(2)} DH</span>
              </div>
            </div>
          </div>

          <button onClick={handleGenerate} className="btn btn-primary" style={{ width: '100%', padding: '13px', fontSize: '0.95rem', justifyContent: 'center' }}>
            <FileText size={17} /> Générer le PDF
          </button>
          <p style={{ fontSize: '0.77rem', color: 'var(--color-text-sub)', textAlign: 'center', margin: 0 }}>
            Le PDF s'ouvre dans un nouvel onglet pour impression.
          </p>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
            <button
              onClick={handleConfirmRdv}
              disabled={isConfirming}
              className="btn btn-accent"
              style={{ width: '100%', padding: '13px', fontSize: '0.95rem', justifyContent: 'center' }}
            >
              <CheckCircle size={17} />
              {isConfirming ? 'Création en cours...' : `Confirmer & créer ${seances.length} RDV`}
            </button>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-sub)', textAlign: 'center', margin: '8px 0 0' }}>
              Crée les séances dans le planning (statut : Planifié).
            </p>
          </div>

          <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-bg-global)', fontSize: '0.82rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--color-text-sub)', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.06em', marginBottom: '10px' }}>
              Horaires d'ouverture
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-sub)' }}>Lun – Ven</span>
                <span style={{ fontWeight: 600 }}>09:30–13:30 · 15:30–19:30</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-sub)' }}>Samedi</span>
                <span style={{ fontWeight: 600 }}>09:00–15:00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-sub)' }}>Dimanche</span>
                <span style={{ fontWeight: 600, color: 'var(--color-error)' }}>Fermé</span>
              </div>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: '0.72rem', color: 'var(--color-text-sub)', lineHeight: 1.4 }}>
              Les séances hors horaires sont permises dans un devis. Un avertissement apparaît sur chaque séance concernée.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { UserRound } from 'lucide-react';
import { Patient } from '../types';

interface PatientFormProps {
  initial?: Partial<Patient>;
  onSubmit: (data: Omit<Patient, 'id' | 'createdAt' | 'appointments' | 'sessions'>) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  title: string;
}

export function PatientForm({ initial, onSubmit, onCancel, isLoading, title }: PatientFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [firstName, setFirstName] = useState(initial?.firstName ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [birthDate, setBirthDate] = useState(
    initial?.birthDate ? new Date(initial.birthDate).toISOString().split('T')[0] : ''
  );
  const [address, setAddress] = useState(initial?.address ?? '');
  const [medecinTraitant, setMedecinTraitant] = useState(initial?.medecinTraitant ?? '');
  const [pathologie, setPathologie] = useState(initial?.pathologie ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name, firstName, phone,
      email: email || null,
      birthDate, address,
      medecinTraitant: medecinTraitant || null,
      pathologie: pathologie || null,
    });
  };

  return (
    <div className="card animate-fade-in" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <UserRound size={20} /> {title}
      </h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div className="form-grid-2">
          <div className="form-field">
            <label>Nom de famille <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex : Martin" required />
          </div>
          <div className="form-field">
            <label>Prénom <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Ex : Sophie" required />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-field">
            <label>Téléphone <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ex : 06 12 34 56 78" required />
          </div>
          <div className="form-field">
            <label>Email <span style={{ color: 'var(--color-text-sub)', fontWeight: 400 }}>(optionnel)</span></label>
            <input type="email" value={email ?? ''} onChange={e => setEmail(e.target.value)} placeholder="Ex : patient@email.ma" />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-field">
            <label>Date de naissance <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} required />
          </div>
          <div className="form-field">
            <label>Adresse <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Ex : 12 Rue Al Amal, Casablanca" required />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-field">
            <label>Médecin traitant <span style={{ color: 'var(--color-text-sub)', fontWeight: 400 }}>(optionnel)</span></label>
            <input type="text" value={medecinTraitant} onChange={e => setMedecinTraitant(e.target.value)} placeholder="Ex : Dr. Martin" />
          </div>
          <div className="form-field">
            <label>Pathologie <span style={{ color: 'var(--color-text-sub)', fontWeight: 400 }}>(optionnel)</span></label>
            <input type="text" value={pathologie} onChange={e => setPathologie(e.target.value)} placeholder="Ex : Rééducation genou" />
          </div>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-sub)', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
          Données collectées uniquement pour la prise en charge médicale (conformité RGPD / CNIL).
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} className="btn btn-secondary">Annuler</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}

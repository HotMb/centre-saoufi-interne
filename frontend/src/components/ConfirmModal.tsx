import { X } from 'lucide-react';

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ title, message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-sub)' }}>
            <X size={22} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--color-text-sub)', margin: '0 0 24px' }}>{message}</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={onCancel} className="btn btn-secondary">Annuler</button>
            <button onClick={onConfirm} className="btn btn-danger">Supprimer</button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { AlertCircle, CheckCircle, X } from 'lucide-react';

interface AlertProps {
  type: 'error' | 'success';
  msg: string;
  onClose: () => void;
}

export function Alert({ type, msg, onClose }: AlertProps) {
  return (
    <div
      className={`alert alert-${type} animate-fade-in`}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
        {msg}
      </span>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', opacity: 0.7 }}
      >
        <X size={15} />
      </button>
    </div>
  );
}

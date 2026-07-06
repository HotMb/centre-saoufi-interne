import React, { useState } from 'react';
import { api } from '../api/client';
import { LogIn, Key, User, ShieldAlert } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!username.trim() || !password) {
      setError('Veuillez renseigner tous les champs.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.post('/api/auth/login', {
        username: username.trim(),
        password,
      });

      onLoginSuccess(response.user);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la connexion.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #eaf6f7 0%, #d4ebed 100%)',
      padding: '20px'
    }}>
      <div className="card glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '420px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-premium)',
        padding: '40px 30px'
      }}>
        {/* En-tête de la carte */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary)',
            color: '#FFFFFF',
            marginBottom: '16px',
            boxShadow: '0 4px 10px rgba(15, 109, 119, 0.3)'
          }}>
            <LogIn size={28} />
          </div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--color-primary-dark)', marginBottom: '8px' }}>
            Centre Saoufi
          </h2>
          <p style={{ color: 'var(--color-text-sub)', fontSize: '0.9rem' }}>
            Portail de Rééducation Fonctionnelle
          </p>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="alert alert-error animate-fade-in" style={{ marginBottom: '20px' }}>
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Formulaire de connexion */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label htmlFor="username">Identifiant de connexion</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-sub)',
                display: 'flex',
                alignItems: 'center'
              }}>
                <User size={18} />
              </span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: secretaire, admin"
                style={{ paddingLeft: '44px' }}
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password">Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-sub)',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Key size={18} />
              </span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ paddingLeft: '44px' }}
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', marginTop: '10px' }}
            disabled={isLoading}
          >
            {isLoading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        {/* Pied de page informatif (CNIL / Sécurité) */}
        <div style={{
          marginTop: '30px',
          textAlign: 'center',
          fontSize: '0.78rem',
          color: 'var(--color-text-sub)',
          borderTop: '1px solid var(--color-border)',
          paddingTop: '20px'
        }}>
          Accès strictement réservé au personnel et aux patients du centre. Les accès sont tracés conformément au RGPD.
        </div>
      </div>
    </div>
  );
}

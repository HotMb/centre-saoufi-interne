import {
  HeartPulse, LayoutDashboard, Users, Calendar,
  ClipboardList, FileText, Shield, Moon, Sun, LogOut, X, Activity,
} from 'lucide-react';
import { User } from '../types';
import { ROLE_COLORS } from '../constants';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (t: string) => void;
  currentUser: User;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const TABS = [
  { id: 'dashboard',    label: 'Tableau de bord', icon: <LayoutDashboard size={19} />, roles: ['ADMIN', 'SECRETAIRE', 'PRATICIEN'] },
  { id: 'patients',     label: 'Patients',         icon: <Users size={19} />,           roles: ['ADMIN', 'SECRETAIRE', 'PRATICIEN'] },
  { id: 'appointments', label: 'Rendez-vous',      icon: <Calendar size={19} />,        roles: ['ADMIN', 'SECRETAIRE', 'PRATICIEN'] },
  { id: 'sessions',     label: 'Séances',          icon: <ClipboardList size={19} />,   roles: ['ADMIN', 'SECRETAIRE', 'PRATICIEN'] },
  { id: 'suivis',       label: 'Suivis',           icon: <Activity size={19} />,        roles: ['ADMIN', 'SECRETAIRE', 'PRATICIEN'] },
  { id: 'devis',        label: 'Devis',            icon: <FileText size={19} />,        roles: ['ADMIN', 'SECRETAIRE'] },
  { id: 'admin',        label: 'Administration',   icon: <Shield size={19} />,          roles: ['ADMIN'] },
];

export function Sidebar({ activeTab, setActiveTab, currentUser, onLogout, darkMode, onToggleDark, isOpen, onClose }: SidebarProps) {
  const visibleTabs = TABS.filter(t => t.roles.includes(currentUser.role));
  const rc = ROLE_COLORS[currentUser.role] ?? { bg: '#f1f5f9', color: '#475569' };

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    onClose();
  };

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
        {/* Logo + bouton fermeture mobile */}
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                <HeartPulse size={22} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-titles)', fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-main)', lineHeight: 1.2 }}>Centre Saoufi</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-sub)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rééducation</div>
              </div>
            </div>
            <button
              className="sidebar-close-btn"
              onClick={onClose}
              aria-label="Fermer le menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Utilisateur connecté */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--color-bg-global)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentUser.name}
            </span>
            <span style={{ background: rc.bg, color: rc.color, padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
              {currentUser.role}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {visibleTabs.map(t => (
            <button
              key={t.id}
              className={`nav-item${activeTab === t.id ? ' active' : ''}`}
              onClick={() => handleNavClick(t.id)}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '16px 10px', borderTop: '1px solid var(--color-border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            className="nav-item"
            onClick={onToggleDark}
            title={darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
            style={{ color: 'var(--color-text-sub)', width: '100%' }}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            {darkMode ? 'Mode clair' : 'Mode sombre'}
          </button>
          <button
            className="nav-item"
            onClick={onLogout}
            style={{ color: 'var(--color-error)', background: '#fff1f2', width: '100%' }}
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}

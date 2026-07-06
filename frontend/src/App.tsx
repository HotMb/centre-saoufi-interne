import { useState, useEffect, lazy, Suspense } from 'react';
import { HeartPulse, Menu } from 'lucide-react';
import { api } from './api/client';
import { LoginPage } from './pages/LoginPage';
import { Sidebar } from './layout/Sidebar';
import { User } from './types';

const DashboardTab     = lazy(() => import('./tabs/DashboardTab').then(m => ({ default: m.DashboardTab })));
const PatientsTab      = lazy(() => import('./tabs/PatientsTab').then(m => ({ default: m.PatientsTab })));
const AppointmentsTab  = lazy(() => import('./tabs/AppointmentsTab').then(m => ({ default: m.AppointmentsTab })));
const SessionsTab      = lazy(() => import('./tabs/SessionsTab').then(m => ({ default: m.SessionsTab })));
const DevisTab         = lazy(() => import('./tabs/DevisTab').then(m => ({ default: m.DevisTab })));
const AdminSettingsTab = lazy(() => import('./tabs/AdminSettingsTab').then(m => ({ default: m.AdminSettingsTab })));
const PatientPortalTab = lazy(() => import('./tabs/PatientPortalTab').then(m => ({ default: m.PatientPortalTab })));

function TabLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--color-text-sub)' }}>
      Chargement...
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : '';
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    api.get('/api/auth/me')
      .then(res => {
        if (res.user) {
          setCurrentUser(res.user);
          setActiveTab((res.user.role === 'ADMIN' || res.user.role === 'SECRETAIRE') ? 'dashboard' : 'patients');
        }
      })
      .catch(() => {})
      .finally(() => setIsInitializing(false));
  }, []);

  const handleLogout = async () => {
    try { await api.post('/api/auth/logout'); } catch { }
    setCurrentUser(null);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveTab(user.role === 'PATIENT' ? 'portal' : (user.role === 'ADMIN' || user.role === 'SECRETAIRE') ? 'dashboard' : 'patients');
  };

  if (isInitializing) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--color-text-sub)' }}>
      Chargement...
    </div>
  );

  if (!currentUser) return <LoginPage onLoginSuccess={handleLoginSuccess} />;

  if (currentUser.role === 'PATIENT') return (
    <Suspense fallback={<TabLoader />}>
      <PatientPortalTab currentUser={currentUser} onLogout={handleLogout} />
    </Suspense>
  );

  return (
    <div className="layout">
      {/* En-tête mobile (visible uniquement sur mobile) */}
      <header className="mobile-header">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu">
          <Menu size={22} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <HeartPulse size={16} />
          </div>
          <span style={{ fontFamily: 'var(--font-titles)', fontWeight: 700, fontSize: '0.95rem' }}>Centre Saoufi</span>
        </div>
        <div style={{ width: '40px' }} />
      </header>

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="content">
        <Suspense fallback={<TabLoader />}>
          {activeTab === 'dashboard'    && <DashboardTab currentUser={currentUser} />}
          {activeTab === 'patients'     && <PatientsTab currentUser={currentUser} />}
          {activeTab === 'appointments' && <AppointmentsTab currentUser={currentUser} />}
          {activeTab === 'sessions'     && <SessionsTab currentUser={currentUser} />}
          {activeTab === 'devis'        && (currentUser.role === 'ADMIN' || currentUser.role === 'SECRETAIRE') && <DevisTab />}
          {activeTab === 'admin'        && currentUser.role === 'ADMIN' && <AdminSettingsTab currentUser={currentUser} />}
        </Suspense>
      </main>
    </div>
  );
}

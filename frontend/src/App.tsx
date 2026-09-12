import React, { useEffect, Suspense, lazy } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { RakshakCinematicLanding } from './components/cinematic/RakshakCinematicLanding';

// Code-split heavy views and analysis modals for instant application startup
const AuthorityCommandView = lazy(() => import('./components/AuthorityCommandView').then(m => ({ default: m.AuthorityCommandView })));
const CitizenView = lazy(() => import('./components/CitizenView').then(m => ({ default: m.CitizenView })));
const HistoricalAnalyticsModal = lazy(() => import('./components/HistoricalAnalyticsModal').then(m => ({ default: m.HistoricalAnalyticsModal })));
const ModelPerformanceModal = lazy(() => import('./components/ModelPerformanceModal').then(m => ({ default: m.ModelPerformanceModal })));
const DataHealthModal = lazy(() => import('./components/DataHealthModal').then(m => ({ default: m.DataHealthModal })));
const SatelliteSwipeModal = lazy(() => import('./components/SatelliteSwipeModal').then(m => ({ default: m.SatelliteSwipeModal })));
const WhatIfSimulatorModal = lazy(() => import('./components/WhatIfSimulatorModal').then(m => ({ default: m.WhatIfSimulatorModal })));
const CascadingHazardModal = lazy(() => import('./components/CascadingHazardModal').then(m => ({ default: m.CascadingHazardModal })));
const ModelTransparencyModal = lazy(() => import('./components/ModelTransparencyModal').then(m => ({ default: m.ModelTransparencyModal })));

const ViewSuspenseFallback: React.FC = () => (
  <div className="flex-1 flex items-center justify-center bg-[#0b0f19] text-slate-400 font-mono text-xs">
    <div className="flex items-center space-x-2">
      <div className="w-4 h-4 border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin" />
      <span className="tracking-wider">INITIALIZING COMMAND MATRIX...</span>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { personaMode, setPersonaMode } = useApp();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Automatically align persona mode when user authenticates
  useEffect(() => {
    if (user) {
      if (user.role === 'CITIZEN') {
        setPersonaMode('CITIZEN');
      } else if (user.role === 'AUTHORITY' || user.role === 'ADMIN') {
        setPersonaMode('AUTHORITY');
      }
    }
  }, [user, setPersonaMode]);

  // 1. Loading state while verifying token
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white font-mono">
        <div className="w-12 h-12 border-2 border-sky-500/20 border-t-sky-400 rounded-full animate-spin mb-4" />
        <div className="text-xs text-sky-400 tracking-widest animate-pulse">
          INITIALIZING SECURE SESSION TELEMETRY...
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Access: World-Class Cinematic Landing, RAKSHAK CORE & Login
  if (!isAuthenticated) {
    return <RakshakCinematicLanding />;
  }

  // 3. Authenticated Operational View with Lazy-Loaded Modules
  return (
    <div className="h-screen h-[100dvh] max-h-screen w-screen max-w-full flex flex-col bg-[#0b0f19] text-slate-100 overflow-hidden font-sans">
      <Header />

      <main className="flex-1 flex overflow-hidden min-h-0 min-w-0 w-full relative">
        <Suspense fallback={<ViewSuspenseFallback />}>
          {personaMode === 'AUTHORITY' ? <AuthorityCommandView /> : <CitizenView />}
        </Suspense>
      </main>

      {/* Global Analysis & Telemetry Modals (Code-Split & Rendered on Demand) */}
      <Suspense fallback={null}>
        <HistoricalAnalyticsModal />
        <ModelPerformanceModal />
        <DataHealthModal />
        <SatelliteSwipeModal />
        <WhatIfSimulatorModal />
        <CascadingHazardModal />
        <ModelTransparencyModal />
      </Suspense>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;


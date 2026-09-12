import React, { useState } from 'react';
import {
  Shield,
  Users,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  AlertCircle,
  CheckCircle2,
  Volume2,
  VolumeX,
  Radio,
  ArrowRight,
  Sparkles,
  Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { soundFx } from './soundFx';
import { GeospatialIntelligenceCanvas } from './GeospatialIntelligenceCanvas';

export const SecureAccessPortal: React.FC = () => {
  const { login, registerCitizen, error, clearError, isLoading } = useAuth();

  // Portal selection: 'CITIZEN' | 'AUTHORITY'
  const [selectedRole, setSelectedRole] = useState<'CITIZEN' | 'AUTHORITY'>('AUTHORITY');
  // Sub-mode for citizen: 'LOGIN' | 'REGISTER'
  const [citizenMode, setCitizenMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(soundFx.enabled);
  const [authStepMessage, setAuthStepMessage] = useState<string | null>(null);

  const toggleSound = () => {
    soundFx.enabled = !soundFx.enabled;
    setSoundEnabled(soundFx.enabled);
    if (soundFx.enabled) soundFx.playClick();
  };

  const handleRoleSelect = (role: 'CITIZEN' | 'AUTHORITY') => {
    soundFx.playClick();
    setSelectedRole(role);
    clearError();
    setLocalError(null);
  };

  // Quick evaluation logins
  const handleQuickEval = async (quickEmail: string, quickPass: string, role: 'CITIZEN' | 'AUTHORITY') => {
    soundFx.playClick();
    setSelectedRole(role);
    setEmail(quickEmail);
    setPassword(quickPass);
    clearError();
    setLocalError(null);

    try {
      setAuthStepMessage('Verifying credentials & establishing secure session...');
      await login({ email: quickEmail, password: quickPass, role_hint: role });
      soundFx.playAccessGranted();
    } catch (err: any) {
      soundFx.playAccessDenied();
    } finally {
      setAuthStepMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);
    soundFx.playClick();

    if (!email || !password) {
      setLocalError('Please fill in all required fields.');
      soundFx.playAccessDenied();
      return;
    }

    if (selectedRole === 'CITIZEN' && citizenMode === 'REGISTER') {
      if (!name) {
        setLocalError('Full name is required for citizen registration.');
        soundFx.playAccessDenied();
        return;
      }
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters long.');
        soundFx.playAccessDenied();
        return;
      }
      if (confirmPassword && password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        soundFx.playAccessDenied();
        return;
      }

      try {
        setAuthStepMessage('Encrypting citizen record & issuing token...');
        await registerCitizen({
          name,
          email,
          password,
          confirm_password: confirmPassword,
          phone: phone || undefined
        });
        soundFx.playAccessGranted();
      } catch (err: any) {
        soundFx.playAccessDenied();
      } finally {
        setAuthStepMessage(null);
      }
    } else {
      // Login mode (Citizen or Authority)
      try {
        setAuthStepMessage('Verifying digital clearance & cryptographic signature...');
        await login({ email, password, role_hint: selectedRole });
        soundFx.playAccessGranted();
      } catch (err: any) {
        soundFx.playAccessDenied();
      } finally {
        setAuthStepMessage(null);
      }
    }
  };

  const displayError = localError || error;

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden font-sans select-none">
      {/* Dynamic Animated Radar & Topography Canvas */}
      <GeospatialIntelligenceCanvas />

      {/* Top Header Bar */}
      <header className="relative z-20 w-full border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-500 border border-sky-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.3)]">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-wider bg-gradient-to-r from-white via-sky-100 to-sky-400 bg-clip-text text-transparent">
                RAKSHAK
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-sky-500/10 border border-sky-500/30 text-sky-400">
                v2.6 SECURE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
              LANDSLIDE EARLY WARNING & MULTI-AGENCY INCIDENT COMMAND PLATFORM
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            className={`p-2 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
              soundEnabled
                ? 'bg-sky-500/10 border-sky-500/40 text-sky-300'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
            title={soundEnabled ? 'Synthesized Audio Active' : 'Synthesized Audio Muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden md:inline">{soundEnabled ? 'AUDIO ON' : 'MUTED'}</span>
          </button>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>BREVO REAL EMAIL GATEWAY: ONLINE</span>
          </div>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
        {/* Portal Title & Subtitle */}
        <div className="text-center max-w-2xl mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-mono mb-3">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            SECURE ACCESS GATEWAY // ROLE-BASED ACCESS CONTROL
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mb-2">
            Select Your Operational Clearance
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Access real-time landslide risk telemetry, emergency evacuation channels, and incident command capabilities.
          </p>
        </div>

        {/* Role Selector Tabs (Citizen vs Commander / Authority) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl mb-6">
          {/* Authority / Commander Card */}
          <button
            type="button"
            onClick={() => handleRoleSelect('AUTHORITY')}
            className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden backdrop-blur-md ${
              selectedRole === 'AUTHORITY'
                ? 'bg-slate-900/95 border-sky-500 shadow-[0_0_25px_rgba(56,189,248,0.2)] ring-1 ring-sky-500/50'
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 text-slate-400'
            }`}
          >
            {selectedRole === 'AUTHORITY' && (
              <div className="absolute top-0 right-0 w-16 h-16 bg-sky-500/10 rounded-bl-full flex items-start justify-end p-2 pointer-events-none">
                <CheckCircle2 className="w-4 h-4 text-sky-400" />
              </div>
            )}
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`p-2.5 rounded-lg ${
                  selectedRole === 'AUTHORITY'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3
                  className={`font-semibold text-sm ${
                    selectedRole === 'AUTHORITY' ? 'text-white' : 'text-slate-300'
                  }`}
                >
                  Disaster Authority / Command
                </h3>
                <span className="text-[10px] font-mono text-sky-400 font-medium">
                  NDRF • SDRF • DDMA • ADMIN
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 line-clamp-2">
              Multi-agency GIS dashboard, what-if simulator, report triage, and emergency alert escalation.
            </p>
          </button>

          {/* Citizen Card */}
          <button
            type="button"
            onClick={() => handleRoleSelect('CITIZEN')}
            className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden backdrop-blur-md ${
              selectedRole === 'CITIZEN'
                ? 'bg-slate-900/95 border-teal-500 shadow-[0_0_25px_rgba(20,184,166,0.2)] ring-1 ring-teal-500/50'
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 text-slate-400'
            }`}
          >
            {selectedRole === 'CITIZEN' && (
              <div className="absolute top-0 right-0 w-16 h-16 bg-teal-500/10 rounded-bl-full flex items-start justify-end p-2 pointer-events-none">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
              </div>
            )}
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`p-2.5 rounded-lg ${
                  selectedRole === 'CITIZEN'
                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3
                  className={`font-semibold text-sm ${
                    selectedRole === 'CITIZEN' ? 'text-white' : 'text-slate-300'
                  }`}
                >
                  Citizen / Public Access
                </h3>
                <span className="text-[10px] font-mono text-teal-400 font-medium">
                  RESIDENT • TRAVELER • VOLUNTEER
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 line-clamp-2">
              Live hazard maps, offline SOS beacon, community incident reporting, and safe evacuation paths.
            </p>
          </button>
        </div>

        {/* Authentication Terminal Card */}
        <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          {/* Subtle top glow */}
          <div
            className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
              selectedRole === 'AUTHORITY'
                ? 'from-sky-500 via-blue-500 to-indigo-500'
                : 'from-teal-400 via-emerald-500 to-sky-500'
            }`}
          />

          {/* Citizen submode switch (Login vs Register) */}
          {selectedRole === 'CITIZEN' && (
            <div className="flex items-center p-1 bg-slate-950/80 border border-slate-800 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setCitizenMode('LOGIN');
                  clearError();
                  setLocalError(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  citizenMode === 'LOGIN'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In to Account
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setCitizenMode('REGISTER');
                  clearError();
                  setLocalError(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  citizenMode === 'REGISTER'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create New Citizen Account
              </button>
            </div>
          )}

          {/* Form Header */}
          <div className="mb-6">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              {selectedRole === 'AUTHORITY' ? (
                <>
                  <Lock className="w-4 h-4 text-sky-400" />
                  <span>Authority Clearance Login</span>
                </>
              ) : citizenMode === 'LOGIN' ? (
                <>
                  <Users className="w-4 h-4 text-teal-400" />
                  <span>Citizen Portal Login</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  <span>Citizen Registration</span>
                </>
              )}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              {selectedRole === 'AUTHORITY'
                ? 'Authorized officials of SDRF, NDRF, DDMA, or System Administration.'
                : citizenMode === 'LOGIN'
                ? 'Sign in to access your local warnings, emergency beacons, and alerts.'
                : 'Create a free citizen profile for localized landslide warnings & SOS protection.'}
            </p>
          </div>

          {/* Error Banner */}
          {displayError && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{displayError}</span>
            </div>
          )}

          {/* Dynamic Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name field (Register only) */}
            {selectedRole === 'CITIZEN' && citizenMode === 'REGISTER' && (
              <div>
                <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                  FULL NAME <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Arjun Sharma"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                EMAIL ADDRESS <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    selectedRole === 'AUTHORITY'
                      ? 'e.g. commander@sdrf.gov.in'
                      : 'e.g. citizen@rakshak.org'
                  }
                  className={`w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none transition-all ${
                    selectedRole === 'AUTHORITY'
                      ? 'focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                      : 'focus:border-teal-500 focus:ring-1 focus:ring-teal-500'
                  }`}
                />
              </div>
            </div>

            {/* Phone (Citizen Register optional) */}
            {selectedRole === 'CITIZEN' && citizenMode === 'REGISTER' && (
              <div>
                <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                  PHONE NUMBER <span className="text-slate-500">(Optional for SOS routing)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                PASSWORD <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={`w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none transition-all ${
                    selectedRole === 'AUTHORITY'
                      ? 'focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                      : 'focus:border-teal-500 focus:ring-1 focus:ring-teal-500'
                  }`}
                />
              </div>
            </div>

            {/* Confirm Password (Register only) */}
            {selectedRole === 'CITIZEN' && citizenMode === 'REGISTER' && (
              <div>
                <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                  CONFIRM PASSWORD <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 mt-6 ${
                isLoading
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : selectedRole === 'AUTHORITY'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-sky-500/20 active:scale-[0.99]'
                  : 'bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white shadow-teal-500/20 active:scale-[0.99]'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                  <span>{authStepMessage || 'Verifying digital credentials...'}</span>
                </>
              ) : (
                <>
                  <span>
                    {selectedRole === 'AUTHORITY'
                      ? 'ENTER COMMAND CENTER'
                      : citizenMode === 'LOGIN'
                      ? 'ENTER CITIZEN DASHBOARD'
                      : 'CREATE CITIZEN PROFILE & SIGN IN'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Evaluation Credentials Showcase */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-slate-400 font-semibold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                QUICK EVALUATION ACCOUNTS (1-CLICK FILL)
              </span>
              <span className="text-[10px] font-mono text-slate-500">PRE-SEEDED</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickEval('commander@sdrf.gov.in', 'Commander@SDRF2026', 'AUTHORITY')}
                className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-sky-400 group-hover:text-sky-300">
                    SDRF Commander
                  </span>
                  <span className="text-[9px] font-mono px-1 rounded bg-sky-500/10 text-sky-400">
                    AUTHORITY
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                  commander@sdrf.gov.in
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickEval('officer@ddma.gov.in', 'Officer@DDMA2026', 'AUTHORITY')}
                className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-400 group-hover:text-blue-300">
                    DDMA Officer
                  </span>
                  <span className="text-[9px] font-mono px-1 rounded bg-blue-500/10 text-blue-400">
                    AUTHORITY
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                  officer@ddma.gov.in
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickEval('admin@rakshak.gov.in', 'Admin@Rakshak2026', 'AUTHORITY')}
                className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-purple-500/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-400 group-hover:text-purple-300">
                    System Admin
                  </span>
                  <span className="text-[9px] font-mono px-1 rounded bg-purple-500/10 text-purple-400">
                    ADMIN
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                  admin@rakshak.gov.in
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickEval('citizen@rakshak.org', 'Citizen@Rakshak2026', 'CITIZEN')}
                className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-teal-500/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-teal-400 group-hover:text-teal-300">
                    Resident Citizen
                  </span>
                  <span className="text-[9px] font-mono px-1 rounded bg-teal-500/10 text-teal-400">
                    CITIZEN
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                  citizen@rakshak.org
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 w-full border-t border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-3 text-center text-slate-500 text-xs font-mono">
        RAKSHAK // CRYPTOGRAPHICALLY SECURED WITH PBKDF2-HMAC-SHA256 • REAL-TIME BREVO EMAIL NOTIFICATIONS
      </footer>
    </div>
  );
};

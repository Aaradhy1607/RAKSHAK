import React, { useState } from 'react';
import {
  Shield,
  Users,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  AlertCircle,
  Volume2,
  VolumeX,
  Radio,
  ArrowRight,
  Sparkles,
  Zap,
  Eye,
  EyeOff,
  ChevronLeft,
  Sliders
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { soundFx } from '../auth/soundFx';
import type { PortalRole } from './RakshakRoleSelector';

export interface RakshakLoginInterfaceProps {
  initialRole?: PortalRole;
  onBackToStory?: () => void;
  onBackToRoles?: () => void;
}

export const RakshakLoginInterface: React.FC<RakshakLoginInterfaceProps> = ({
  initialRole = 'AUTHORITY',
  onBackToStory,
  onBackToRoles
}) => {
  const { login, registerCitizen, error, clearError, isLoading } = useAuth();

  // Selected operational role: 'CITIZEN' | 'AUTHORITY' | 'ADMIN'
  const [selectedRole, setSelectedRole] = useState<PortalRole>(initialRole);
  // Citizen sub-mode: 'LOGIN' | 'REGISTER'
  const [citizenMode, setCitizenMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Form input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(soundFx.enabled);
  const [authStepMessage, setAuthStepMessage] = useState<string | null>(null);

  const toggleSound = () => {
    const isEnabled = soundFx.toggleSound();
    setSoundEnabled(isEnabled);
  };

  const handleRoleSelect = (role: PortalRole) => {
    soundFx.playClick();
    setSelectedRole(role);
    clearError();
    setLocalError(null);
  };

  // 1-Click Quick Evaluation Login
  const handleQuickEval = async (
    quickEmail: string,
    quickPass: string,
    role: PortalRole
  ) => {
    soundFx.playClick();
    setSelectedRole(role);
    setEmail(quickEmail);
    setPassword(quickPass);
    clearError();
    setLocalError(null);

    try {
      setAuthStepMessage('Verifying credentials & establishing secure session...');
      const roleHint = role === 'CITIZEN' ? 'CITIZEN' : 'AUTHORITY';
      await login({ email: quickEmail, password: quickPass, role_hint: roleHint });
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
      // Login mode
      try {
        setAuthStepMessage('Verifying clearance & establishing cryptographic token...');
        const roleHint = selectedRole === 'CITIZEN' ? 'CITIZEN' : 'AUTHORITY';
        await login({ email, password, role_hint: roleHint });
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
    <div className="relative min-h-screen text-slate-100 flex flex-col justify-between overflow-x-hidden font-sans select-none">
      {/* Top Header HUD */}
      <header className="relative z-20 w-full border-b border-slate-800/80 bg-slate-950/75 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBackToStory && (
            <button
              onClick={onBackToStory}
              className="px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/80 text-slate-400 hover:text-white text-xs font-mono flex items-center gap-1 transition-all mr-1"
              title="Return to Cinematic Landing Story"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">STORY</span>
            </button>
          )}

          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-500 border border-sky-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.3)]">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-wider bg-gradient-to-r from-white via-sky-100 to-sky-400 bg-clip-text text-transparent">
                RAKSHAK
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded bg-sky-500/10 border border-sky-500/30 text-sky-400">
                v2.6 SECURE
              </span>
            </div>
            <p className="text-[9px] text-slate-400 font-mono hidden md:block">
              LANDSLIDE RISK INTELLIGENCE & MULTI-AGENCY COMMAND MATRIX
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onBackToRoles && (
            <button
              onClick={onBackToRoles}
              className="px-3 py-1.5 rounded-lg border border-slate-800 hover:border-sky-500/40 bg-slate-900/80 text-sky-400 text-xs font-mono transition-all hidden sm:flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>CLEARANCE PORTALS</span>
            </button>
          )}

          <button
            onClick={toggleSound}
            className={`p-2 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
              soundEnabled
                ? 'bg-sky-500/10 border-sky-500/40 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
            title={soundEnabled ? 'Synthesized Audio Active' : 'Synthesized Audio Muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden md:inline">{soundEnabled ? 'AUDIO ON' : 'MUTED'}</span>
          </button>
        </div>
      </header>

      {/* Main Authentication Terminal */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
        {/* Terminal Header */}
        <div className="text-center max-w-xl mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-mono mb-3">
            <Radio className="w-3.5 h-3.5 animate-pulse text-sky-400" />
            SECURE ACCESS TERMINAL // PBKDF2-SHA256
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Disaster Command Access Portal
          </h2>
          <p className="text-xs text-slate-400 font-sans">
            Authenticate to synchronize with active landslide early warning telemetry and multi-agency response channels.
          </p>
        </div>

        {/* 3-Tier Operational Clearance Switcher */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-xl mb-5">
          {/* Authority Tab */}
          <button
            type="button"
            onClick={() => handleRoleSelect('AUTHORITY')}
            className={`p-3 rounded-xl border text-center sm:text-left transition-all relative overflow-hidden backdrop-blur-md ${
              selectedRole === 'AUTHORITY'
                ? 'bg-slate-900/95 border-sky-500 shadow-[0_0_20px_rgba(56,189,248,0.25)] ring-1 ring-sky-500/50'
                : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <Shield className={`w-4 h-4 ${selectedRole === 'AUTHORITY' ? 'text-sky-400' : 'text-slate-500'}`} />
              <span className={`text-xs font-bold ${selectedRole === 'AUTHORITY' ? 'text-white' : 'text-slate-300'}`}>
                Authority
              </span>
            </div>
            <p className="text-[10px] font-mono text-sky-400 hidden sm:block">SDRF • NDRF • DDMA</p>
          </button>

          {/* Citizen Tab */}
          <button
            type="button"
            onClick={() => handleRoleSelect('CITIZEN')}
            className={`p-3 rounded-xl border text-center sm:text-left transition-all relative overflow-hidden backdrop-blur-md ${
              selectedRole === 'CITIZEN'
                ? 'bg-slate-900/95 border-teal-500 shadow-[0_0_20px_rgba(20,184,166,0.25)] ring-1 ring-teal-500/50'
                : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <Users className={`w-4 h-4 ${selectedRole === 'CITIZEN' ? 'text-teal-400' : 'text-slate-500'}`} />
              <span className={`text-xs font-bold ${selectedRole === 'CITIZEN' ? 'text-white' : 'text-slate-300'}`}>
                Citizen
              </span>
            </div>
            <p className="text-[10px] font-mono text-teal-400 hidden sm:block">Public & SOS</p>
          </button>

          {/* Admin Tab */}
          <button
            type="button"
            onClick={() => handleRoleSelect('ADMIN')}
            className={`p-3 rounded-xl border text-center sm:text-left transition-all relative overflow-hidden backdrop-blur-md ${
              selectedRole === 'ADMIN'
                ? 'bg-slate-900/95 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.25)] ring-1 ring-purple-500/50'
                : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <Sliders className={`w-4 h-4 ${selectedRole === 'ADMIN' ? 'text-purple-400' : 'text-slate-500'}`} />
              <span className={`text-xs font-bold ${selectedRole === 'ADMIN' ? 'text-white' : 'text-slate-300'}`}>
                Admin
              </span>
            </div>
            <p className="text-[10px] font-mono text-purple-400 hidden sm:block">System & Email</p>
          </button>
        </div>

        {/* Authentication Terminal Card */}
        <div className="w-full max-w-xl bg-slate-900/95 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
          {/* Top Glowing Laser Accent */}
          <div
            className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
              selectedRole === 'AUTHORITY'
                ? 'from-sky-500 via-blue-500 to-indigo-500'
                : selectedRole === 'CITIZEN'
                ? 'from-teal-400 via-emerald-500 to-sky-500'
                : 'from-purple-500 via-indigo-500 to-pink-500'
            }`}
          />

          {/* Citizen sub-mode toggle (Login vs Register) */}
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
                Sign In to Citizen Account
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
                Create New Citizen Profile
              </button>
            </div>
          )}

          {/* Role Header Banner */}
          <div className="mb-5">
            <h4 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              {selectedRole === 'AUTHORITY' ? (
                <>
                  <Shield className="w-4 h-4 text-sky-400" />
                  <span>Authority Command Clearance</span>
                </>
              ) : selectedRole === 'ADMIN' ? (
                <>
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <span>System Administration Matrix</span>
                </>
              ) : citizenMode === 'LOGIN' ? (
                <>
                  <Users className="w-4 h-4 text-teal-400" />
                  <span>Citizen Portal Access</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  <span>Citizen Registration</span>
                </>
              )}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedRole === 'AUTHORITY'
                ? 'Authorized personnel of SDRF, NDRF, DDMA, and Incident Command.'
                : selectedRole === 'ADMIN'
                ? 'Supreme administrative clearance for Brevo email dispatch and telemetry controls.'
                : citizenMode === 'LOGIN'
                ? 'Sign in to access localized landslide hazard maps and SOS beacons.'
                : 'Create a free profile to receive hyper-local landslide alerts & SOS protection.'}
            </p>
          </div>

          {/* Error Banner */}
          {displayError && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{displayError}</span>
            </div>
          )}

          {/* Form */}
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-sans"
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
                      ? 'commander@sdrf.gov.in'
                      : selectedRole === 'ADMIN'
                      ? 'admin@rakshak.gov.in'
                      : 'citizen@rakshak.org'
                  }
                  className={`w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none transition-all font-sans ${
                    selectedRole === 'AUTHORITY'
                      ? 'focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                      : selectedRole === 'ADMIN'
                      ? 'focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-sans"
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
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={`w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none transition-all font-sans ${
                    selectedRole === 'AUTHORITY'
                      ? 'focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                      : selectedRole === 'ADMIN'
                      ? 'focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
                      : 'focus:border-teal-500 focus:ring-1 focus:ring-teal-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-sans"
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
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-sky-500/25 active:scale-[0.99]'
                  : selectedRole === 'ADMIN'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/25 active:scale-[0.99]'
                  : 'bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white shadow-teal-500/25 active:scale-[0.99]'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                  <span>{authStepMessage || 'Verifying credentials...'}</span>
                </>
              ) : (
                <>
                  <span>
                    {selectedRole === 'AUTHORITY'
                      ? 'ENTER COMMAND CENTER'
                      : selectedRole === 'ADMIN'
                      ? 'ENTER SYSTEM ADMIN MATRIX'
                      : citizenMode === 'LOGIN'
                      ? 'ENTER CITIZEN DASHBOARD'
                      : 'CREATE CITIZEN PROFILE & SIGN IN'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Evaluation Accounts (1-Click Fill) */}
          <div className="mt-7 pt-5 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono text-slate-400 font-semibold flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-400" />
                QUICK EVALUATION LOGINS (1-CLICK FILL)
              </span>
              <span className="text-[9px] font-mono text-slate-500">PRE-SEEDED</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickEval('commander@sdrf.gov.in', 'Commander@SDRF2026', 'AUTHORITY')}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-sky-400 group-hover:text-sky-300">
                    SDRF Commander
                  </span>
                  <span className="text-[8px] font-mono px-1 rounded bg-sky-500/10 text-sky-400">
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
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-400 group-hover:text-blue-300">
                    DDMA Officer
                  </span>
                  <span className="text-[8px] font-mono px-1 rounded bg-blue-500/10 text-blue-400">
                    AUTHORITY
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                  officer@ddma.gov.in
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickEval('admin@rakshak.gov.in', 'Admin@Rakshak2026', 'ADMIN')}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-purple-500/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-400 group-hover:text-purple-300">
                    System Admin
                  </span>
                  <span className="text-[8px] font-mono px-1 rounded bg-purple-500/10 text-purple-400">
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
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-teal-500/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-teal-400 group-hover:text-teal-300">
                    Resident Citizen
                  </span>
                  <span className="text-[8px] font-mono px-1 rounded bg-teal-500/10 text-teal-400">
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
      <footer className="relative z-20 w-full border-t border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-3 text-center text-slate-500 text-[10px] font-mono">
        RAKSHAK // CRYPTOGRAPHICALLY SECURED • REAL-TIME DISASTER INTELLIGENCE MATRIX
      </footer>
    </div>
  );
};

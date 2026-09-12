import React from 'react';
import {
  Users,
  Shield,
  Sliders,
  ArrowRight,
  Radio,
  ChevronRight,
  Lock
} from 'lucide-react';
import { soundFx } from '../auth/soundFx';

export type PortalRole = 'CITIZEN' | 'AUTHORITY' | 'ADMIN';

export interface RakshakRoleSelectorProps {
  onSelectRole: (role: PortalRole) => void;
  onDirectLogin?: () => void;
}

export const RakshakRoleSelector: React.FC<RakshakRoleSelectorProps> = ({
  onSelectRole,
  onDirectLogin
}) => {
  const handleRoleHover = () => {
    soundFx.playClick();
  };

  const handleRoleClick = (role: PortalRole) => {
    soundFx.playWhoosh();
    onSelectRole(role);
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col items-center">
      {/* Header telemetry badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-mono mb-4 backdrop-blur-md">
        <Radio className="w-3.5 h-3.5 animate-pulse text-sky-400" />
        OPERATIONAL ACCESS GATEWAY // SELECT CLEARANCE LEVEL
      </div>

      <h2 className="text-3xl sm:text-5xl font-extrabold text-white text-center tracking-tight mb-3">
        Enter the RAKSHAK Command Matrix
      </h2>
      <p className="text-xs sm:text-sm text-slate-400 text-center max-w-2xl mb-10 font-sans">
        Select your designated operational portal. Each clearance provides tailored telemetry, geospatial analytics, and response tooling.
      </p>

      {/* Three Futuristic Portals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-10">
        {/* 1. CITIZEN PORTAL */}
        <div
          onMouseEnter={handleRoleHover}
          onClick={() => handleRoleClick('CITIZEN')}
          className="group relative rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-950/90 to-slate-950 border border-teal-500/30 hover:border-teal-400/80 p-6 sm:p-7 transition-all duration-300 hover:shadow-[0_0_35px_rgba(20,184,166,0.25)] hover:-translate-y-1.5 cursor-pointer backdrop-blur-xl flex flex-col justify-between overflow-hidden"
        >
          {/* Top glowing accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-600 opacity-60 group-hover:opacity-100 transition-opacity" />

          {/* Background subtle watermark */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl group-hover:bg-teal-500/15 transition-all pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 group-hover:border-teal-400 flex items-center justify-center text-teal-400 transition-all shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/30 text-teal-400 font-semibold tracking-wider">
                TIER-1 CITIZEN
              </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-teal-300 transition-colors">
              Citizen Portal
            </h3>
            <div className="text-[11px] font-mono text-teal-400/90 mb-3 tracking-widest font-semibold">
              HUMAN SAFETY & RESILIENCE
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Accessible, human-focused intelligence. Real-time community warnings, live hazard radius mapping, and offline SOS beacon activation.
            </p>

            {/* Core Concepts */}
            <div className="space-y-2 mb-6 pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span className="font-semibold text-white">REPORT:</span> Community incident telemetry
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span className="font-semibold text-white">REQUEST HELP:</span> Emergency SOS broadcast
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span className="font-semibold text-white">STAY INFORMED:</span> Safe evacuation routes
              </div>
            </div>
          </div>

          <button
            type="button"
            className="w-full py-2.5 px-4 rounded-xl bg-teal-500/10 hover:bg-teal-500 border border-teal-500/40 hover:border-teal-400 text-teal-300 hover:text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition-all group-hover:shadow-[0_0_15px_rgba(20,184,166,0.4)]"
          >
            <span>ENTER CITIZEN PORTAL</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* 2. AUTHORITY COMMAND PORTAL */}
        <div
          onMouseEnter={handleRoleHover}
          onClick={() => handleRoleClick('AUTHORITY')}
          className="group relative rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-950/90 to-slate-950 border border-sky-500/40 hover:border-sky-400 p-6 sm:p-7 transition-all duration-300 hover:shadow-[0_0_40px_rgba(56,189,248,0.3)] hover:-translate-y-1.5 cursor-pointer backdrop-blur-xl flex flex-col justify-between overflow-hidden ring-1 ring-sky-500/20"
        >
          {/* Top glowing accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-blue-400 to-sky-600 opacity-80 group-hover:opacity-100 transition-opacity" />

          {/* Background subtle watermark */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl group-hover:bg-sky-500/20 transition-all pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 group-hover:border-sky-400 flex items-center justify-center text-sky-400 transition-all shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                <Shield className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/40 text-sky-300 font-semibold tracking-wider">
                TIER-2 AUTHORITY
              </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-sky-300 transition-colors">
              Authority Portal
            </h3>
            <div className="text-[11px] font-mono text-sky-400/90 mb-3 tracking-widest font-semibold">
              OPERATIONAL COMMAND & RESPONSE
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Operational command for SDRF, NDRF, and DDMA. Multi-agency GIS map, what-if scenario simulations, and rapid incident escalation.
            </p>

            {/* Core Concepts */}
            <div className="space-y-2 mb-6 pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span className="font-semibold text-white">MONITOR:</span> Multi-district landslide risk
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span className="font-semibold text-white">VERIFY:</span> Field reports & satellite scenes
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span className="font-semibold text-white">RESPOND:</span> Coordinate emergency triage
              </div>
            </div>
          </div>

          <button
            type="button"
            className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 border border-sky-400 text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(56,189,248,0.3)]"
          >
            <span>ENTER COMMAND CENTER</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* 3. ADMIN PORTAL */}
        <div
          onMouseEnter={handleRoleHover}
          onClick={() => handleRoleClick('ADMIN')}
          className="group relative rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-950/90 to-slate-950 border border-purple-500/30 hover:border-purple-400/80 p-6 sm:p-7 transition-all duration-300 hover:shadow-[0_0_35px_rgba(168,85,247,0.25)] hover:-translate-y-1.5 cursor-pointer backdrop-blur-xl flex flex-col justify-between overflow-hidden"
        >
          {/* Top glowing accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-400 to-purple-600 opacity-60 group-hover:opacity-100 transition-opacity" />

          {/* Background subtle watermark */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/15 transition-all pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 group-hover:border-purple-400 flex items-center justify-center text-purple-400 transition-all shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                <Sliders className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-400 font-semibold tracking-wider">
                TIER-3 ADMIN
              </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">
              System Admin
            </h3>
            <div className="text-[11px] font-mono text-purple-400/90 mb-3 tracking-widest font-semibold">
              SYSTEM CONTROL & INTEGRATION
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Supreme clearance. Brevo transactional email gateway, verified recipient dispatch, audit logs, and system telemetry management.
            </p>

            {/* Core Concepts */}
            <div className="space-y-2 mb-6 pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span className="font-semibold text-white">OVERVIEW:</span> Telemetry & health diagnostics
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span className="font-semibold text-white">CONTROL:</span> Manual Brevo email dispatches
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span className="font-semibold text-white">COORDINATE:</span> RBAC & multi-agency sync
              </div>
            </div>
          </div>

          <button
            type="button"
            className="w-full py-2.5 px-4 rounded-xl bg-purple-500/10 hover:bg-purple-600 border border-purple-500/40 hover:border-purple-400 text-purple-300 hover:text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition-all group-hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]"
          >
            <span>ENTER ADMIN MATRIX</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Quick Direct Sign-In Trigger */}
      {onDirectLogin && (
        <button
          onClick={onDirectLogin}
          className="text-xs font-mono text-slate-400 hover:text-sky-300 flex items-center gap-1.5 transition-colors border border-slate-800 hover:border-slate-700 bg-slate-900/60 px-4 py-2 rounded-lg"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Already know your credentials? Direct Terminal Login</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import type { AppLanguage } from '../context/AppContext';
import {
  ShieldAlert,
  Activity,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  BarChart3,
  Cpu,
  RefreshCw,
  Eye,
  Radio,
  LogOut,
  ShieldCheck,
  Users
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    personaMode,
    setPersonaMode,
    theme,
    toggleTheme,
    language,
    setLanguage,
    overview,
    isOffline,
    refreshData,
    setActiveModal,
    t
  } = useApp();

  const { user, logout } = useAuth();

  return (
    <header className="w-full bg-[#111827] border-b border-[#334155] px-4 py-2.5 flex items-center justify-between text-white select-none z-30 shrink-0 sticky top-0 shadow-md">
      {/* Left: Product Identity & National Emblem Theme */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-950/50 shrink-0">
          <ShieldAlert className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-sm tracking-wide text-slate-100 flex items-center space-x-1.5">
              <span>{t('app_title')}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-mono">
                {t('sih_badge')}
              </span>
            </h1>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-1">
            {t('ministry_sub')}
          </p>
        </div>
      </div>

      {/* Center: Data Provenance & Operational State */}
      <div className="hidden md:flex items-center space-x-3 bg-[#0b0f19] px-3 py-1 rounded-full border border-[#334155]/60 text-xs">
        {/* Data Provenance Badge */}
        <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-mono text-[11px] font-semibold">
          <Activity className="w-3 h-3" />
          <span>[{t('live_telemetry')}]</span>
        </span>

        {/* Network & Health */}
        <div className="flex items-center space-x-1.5 text-slate-300 text-[11px]">
          {isOffline ? (
            <span className="flex items-center space-x-1 text-amber-400 font-medium">
              <WifiOff className="w-3.5 h-3.5" />
              <span>{t('offline_cache')}</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-emerald-400 font-medium">
              <Wifi className="w-3.5 h-3.5" />
              <span>{t('sys_health')}</span>
            </span>
          )}
        </div>

        {/* SOS Indicator if active */}
        {(overview?.open_sos_count || 0) > 0 && (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 font-bold text-[11px] animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>{overview?.open_sos_count} {t('active_sos_badge')}</span>
          </span>
        )}
      </div>

      {/* Right: Persona Switcher, Analytics Modals, User Badge, Language, Theme */}
      <div className="flex items-center space-x-2">
        {/* Quick Nav Tools */}
        <button
          onClick={() => setActiveModal('WHAT_IF')}
          className="p-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 hover:text-white transition text-xs flex items-center space-x-1 border border-amber-700/70"
          title="What-If Disaster Simulator Studio"
        >
          <Radio className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden lg:inline text-[11px] font-semibold">{t('nav_what_if')}</span>
        </button>

        <button
          onClick={() => setActiveModal('CASCADING_HAZARD')}
          className="p-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-300 hover:text-white transition text-xs flex items-center space-x-1 border border-slate-700"
          title="Cascading Hazards Propagation Chain"
        >
          <Cpu className="w-3.5 h-3.5 text-orange-400" />
          <span className="hidden lg:inline text-[11px]">{t('nav_cascading')}</span>
        </button>

        <button
          onClick={() => setActiveModal('MODEL_TRANSPARENCY')}
          className="p-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-300 hover:text-white transition text-xs flex items-center space-x-1 border border-slate-700"
          title="Scientific Model Transparency & Spatial CV Matrix"
        >
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden lg:inline text-[11px]">{t('nav_transparency')}</span>
        </button>

        <button
          onClick={() => setActiveModal('HISTORICAL')}
          className="p-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-300 hover:text-white transition text-xs flex items-center space-x-1 border border-slate-700"
          title="Historical GSI Landslide Analytics"
        >
          <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden lg:inline text-[11px]">{t('nav_analytics')}</span>
        </button>

        <button
          onClick={() => setActiveModal('DATA_HEALTH')}
          className="p-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-300 hover:text-white transition text-xs flex items-center space-x-1 border border-slate-700"
          title="Data Sources & Health Telemetry"
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden lg:inline text-[11px]">{t('nav_data_health')}</span>
        </button>

        <button
          onClick={() => setActiveModal('SATELLITE_SWIPE')}
          className="p-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-300 hover:text-white transition text-xs flex items-center space-x-1 border border-slate-700"
          title="Sentinel-1 SAR / Optical Before-After Swipe"
        >
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden lg:inline text-[11px]">{t('nav_sar_swipe')}</span>
        </button>

        {/* Persona Mode Switcher (Authority vs Citizen) */}
        <div className="bg-[#0b0f19] p-0.5 rounded-lg border border-[#334155] flex items-center">
          <button
            onClick={() => setPersonaMode('AUTHORITY')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition ${
              personaMode === 'AUTHORITY'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('btn_command_center')}
          </button>
          <button
            onClick={() => setPersonaMode('CITIZEN')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition ${
              personaMode === 'CITIZEN'
                ? 'bg-red-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('btn_citizen_sos')}
          </button>
        </div>

        {/* Authenticated User Badge & Logout */}
        {user && (
          <div className="flex items-center gap-1.5 bg-[#0b0f19] pl-2.5 pr-1.5 py-1 rounded-lg border border-[#334155] text-xs">
            <div className="flex items-center gap-1.5">
              {user.role === 'ADMIN' ? (
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              ) : user.role === 'AUTHORITY' ? (
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              ) : (
                <Users className="w-3.5 h-3.5 text-teal-400" />
              )}
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-[11px] font-semibold text-slate-200 leading-tight truncate max-w-[120px]">
                  {user.name}
                </span>
                <span className="text-[9px] font-mono text-slate-400 uppercase leading-none">
                  {user.role} {user.department ? `• ${user.department.slice(0, 14)}...` : ''}
                </span>
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="p-1 rounded hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition"
              title="Sign Out / Switch Account"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Language Selector */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as AppLanguage)}
          aria-label="Language Selector"
          className="bg-[#1e293b] border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 outline-none cursor-pointer focus:border-sky-500 font-medium"
        >
          <option value="EN">EN (English)</option>
          <option value="HI">HI (हिन्दी)</option>
          <option value="AS">AS (অসমীয়া)</option>
          <option value="MN">MN (মৈতৈলোন্)</option>
          <option value="MZ">MZ (Mizo ṭawng)</option>
          <option value="BN">BN (বাংলা)</option>
        </select>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="p-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-300 transition border border-slate-700"
          title="Toggle Light / Dark Mode"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-400" />}
        </button>

        {/* Refresh */}
        <button
          onClick={refreshData}
          aria-label="Refresh Data"
          className="p-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-300 transition border border-slate-700"
          title="Refresh All Feeds"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};


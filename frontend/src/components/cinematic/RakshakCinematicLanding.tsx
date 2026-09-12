import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  ChevronDown,
  Shield,
  Radio,
  ArrowRight,
  Layers,
  Sparkles,
  Zap,
  Activity,
  Compass
} from 'lucide-react';
import { RakshakCoreCanvas } from './RakshakCoreCanvas';
import { RakshakRoleSelector, type PortalRole } from './RakshakRoleSelector';
import { RakshakLoginInterface } from './RakshakLoginInterface';
import { soundFx } from '../auth/soundFx';

export const RakshakCinematicLanding: React.FC = () => {
  const [currentScene, setCurrentScene] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(soundFx.enabled);
  const [viewMode, setViewMode] = useState<'STORY' | 'ROLE_SELECT' | 'LOGIN'>('STORY');
  const [selectedRole, setSelectedRole] = useState<PortalRole>('AUTHORITY');
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isScrollingRef = useRef<boolean>(false);

  // Mouse move tracker for parallax 3D effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      setCursorPos({ x: nx, y: ny });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Keyboard navigation between scenes (Arrow Up / Down / Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'STORY') return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        goToNextScene();
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        goToPrevScene();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentScene, viewMode]);

  // Wheel-based scene transition with throttle
  const handleWheel = (e: React.WheelEvent) => {
    if (viewMode !== 'STORY') return;
    if (isScrollingRef.current) return;

    if (e.deltaY > 35) {
      isScrollingRef.current = true;
      goToNextScene();
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 700);
    } else if (e.deltaY < -35) {
      isScrollingRef.current = true;
      goToPrevScene();
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 700);
    }
  };

  const goToScene = (sceneNum: number) => {
    if (sceneNum === currentScene) return;

    // Trigger sound effects for scene transitions
    if (sceneNum === 3) soundFx.playScanSweep();
    else if (sceneNum === 4) soundFx.playLayerSeparate();
    else if (sceneNum === 5) soundFx.playImpactReveal();
    else if (sceneNum === 6) soundFx.playWhoosh();
    else soundFx.playClick();

    if (sceneNum > 6) {
      setViewMode('ROLE_SELECT');
      setCurrentScene(6);
    } else {
      setViewMode('STORY');
      setCurrentScene(sceneNum);
    }
  };

  const goToNextScene = () => {
    if (currentScene < 6) {
      goToScene(currentScene + 1);
    } else {
      soundFx.playWhoosh();
      setViewMode('ROLE_SELECT');
    }
  };

  const goToPrevScene = () => {
    if (currentScene > 1) {
      goToScene(currentScene - 1);
    }
  };

  const toggleSound = () => {
    const isEnabled = soundFx.toggleSound();
    setSoundEnabled(isEnabled);
  };

  const handleSelectRoleFromPortal = (role: PortalRole) => {
    setSelectedRole(role);
    setViewMode('LOGIN');
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className="relative w-full min-h-screen bg-black text-white overflow-hidden select-none font-sans"
    >
      {/* 3D Living Interactive RAKSHAK CORE Canvas */}
      <RakshakCoreCanvas
        activeScene={viewMode === 'STORY' ? currentScene : 6}
        cursorX={cursorPos.x}
        cursorY={cursorPos.y}
      />

      {/* Top Floating HUD Bar */}
      <header className="fixed top-0 left-0 right-0 z-40 px-4 sm:px-8 py-4 flex items-center justify-between pointer-events-auto bg-gradient-to-b from-black/80 via-black/40 to-transparent backdrop-blur-[2px]">
        {/* Logo & Platform Badge */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => {
              soundFx.playClick();
              setViewMode('STORY');
              setCurrentScene(1);
            }}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-500 border border-sky-400/50 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.4)] group-hover:scale-105 transition-transform">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-widest bg-gradient-to-r from-white via-sky-100 to-sky-400 bg-clip-text text-transparent">
                RAKSHAK
              </span>
              <span className="text-[9px] font-mono text-sky-400/80 block tracking-wider">
                DISASTER INTELLIGENCE
              </span>
            </div>
          </div>
        </div>

        {/* Center Scene Progress Indicator (Story Mode) */}
        {viewMode === 'STORY' && (
          <nav className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/80 border border-slate-800/80 backdrop-blur-md">
            {[
              { num: 1, name: 'SILENCE' },
              { num: 2, name: 'SIGNAL' },
              { num: 3, name: 'DETECT' },
              { num: 4, name: 'ANALYZE' },
              { num: 5, name: 'INTELLIGENCE' },
              { num: 6, name: 'RESPONSE' }
            ].map((s) => (
              <button
                key={s.num}
                onClick={() => goToScene(s.num)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono transition-all flex items-center gap-1 ${
                  currentScene === s.num
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>0{s.num}</span>
                <span className="hidden lg:inline">{s.name}</span>
              </button>
            ))}
          </nav>
        )}

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
              soundEnabled
                ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                : 'bg-slate-900/80 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title={soundEnabled ? 'Synthesized Audio Active' : 'Synthesized Audio Muted'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{soundEnabled ? 'SOUND ON' : 'MUTED'}</span>
          </button>

          {/* Quick Access to Portals / Login */}
          {viewMode === 'STORY' ? (
            <button
              onClick={() => {
                soundFx.playWhoosh();
                setViewMode('ROLE_SELECT');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_20px_rgba(56,189,248,0.35)]"
            >
              <span>ACCESS PORTAL</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : viewMode === 'ROLE_SELECT' ? (
            <button
              onClick={() => {
                soundFx.playClick();
                setViewMode('STORY');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-mono text-xs transition-all"
            >
              EXPLORE STORY
            </button>
          ) : (
            <button
              onClick={() => {
                soundFx.playClick();
                setViewMode('ROLE_SELECT');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-mono text-xs transition-all"
            >
              CLEARANCE PORTALS
            </button>
          )}
        </div>
      </header>

      {/* ========================================================= */}
      {/* MODE 1: CINEMATIC 6-SCENE SCROLL STORY                    */}
      {/* ========================================================= */}
      {viewMode === 'STORY' && (
        <main className="relative z-10 w-full min-h-screen flex flex-col justify-between p-6 sm:p-12 pt-24 pb-12 pointer-events-none">
          {/* Subtle Top Metadata Fragment */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-sky-400 animate-spin" style={{ animationDuration: '20s' }} />
              <span>GEOSPATIAL MATRIX // 26.1158° N, 91.7086° E</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>CORE FREQUENCY: NOMINAL</span>
            </div>
          </div>

          {/* Central Narrative Layer (Changes per scene) */}
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-4xl mx-auto w-full my-auto">
            {/* SCENE 01 — THE SILENCE */}
            {currentScene === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-mono tracking-widest">
                  <Activity className="w-3 h-3" />
                  SCENE 01 // THE SILENCE
                </div>

                <h1 className="text-4xl sm:text-7xl font-extrabold tracking-tight text-white leading-tight">
                  DISASTER DOES NOT WAIT.
                </h1>

                <p className="text-sm sm:text-lg text-slate-400 max-w-xl mx-auto font-light leading-relaxed">
                  In the quiet moments before a slope destabilizes, mountains shift in subtle silence. Early intelligence is the difference between catastrophe and safety.
                </p>

                <div className="pt-4 pointer-events-auto">
                  <button
                    onClick={goToNextScene}
                    className="px-6 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-sky-500/30 hover:border-sky-400 text-sky-300 text-xs font-mono tracking-wider transition-all flex items-center gap-2 mx-auto shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                  >
                    <span>INITIALIZE TELEMETRY</span>
                    <ChevronDown className="w-4 h-4 animate-bounce" />
                  </button>
                </div>
              </div>
            )}

            {/* SCENE 02 — THE SIGNAL */}
            {currentScene === 2 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-mono tracking-widest">
                  <Radio className="w-3 h-3 animate-pulse" />
                  SCENE 02 // THE SIGNAL
                </div>

                <h1 className="text-4xl sm:text-7xl font-extrabold tracking-tight text-white leading-tight">
                  EVERY DISASTER LEAVES A SIGNAL.
                </h1>

                {/* Conceptual Environmental Signal Tags */}
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-2xl mx-auto pt-2">
                  {['RAIN', 'TERRAIN', 'SLOPE', 'SOIL MOISTURE', 'WEATHER', 'GEOSIGNALS'].map((sig) => (
                    <span
                      key={sig}
                      className="px-3 py-1 rounded-lg bg-slate-900/90 border border-teal-500/30 text-teal-300 font-mono text-xs tracking-wider backdrop-blur-md shadow-[0_0_12px_rgba(20,184,166,0.15)]"
                    >
                      {sig}
                    </span>
                  ))}
                </div>

                <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto font-light">
                  Continuous multi-modal hydro-meteorological data converging into a single unified intelligence stream.
                </p>

                <div className="pt-4 pointer-events-auto">
                  <button
                    onClick={goToNextScene}
                    className="px-6 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-teal-500/40 text-teal-300 text-xs font-mono tracking-wider transition-all flex items-center gap-2 mx-auto"
                  >
                    <span>ACTIVATE CORE DETECT</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* SCENE 03 — DETECT */}
            {currentScene === 3 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-mono tracking-widest">
                  <Zap className="w-3 h-3 text-sky-400" />
                  SCENE 03 // DETECT
                </div>

                <h1 className="text-5xl sm:text-8xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-200 to-sky-400">
                  DETECT.
                </h1>

                <p className="text-base sm:text-xl font-medium text-sky-200 max-w-xl mx-auto tracking-wide">
                  SEE THE SIGNAL BEFORE IT BECOMES A CRISIS.
                </p>

                <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto font-light">
                  Scanning wide elevation gradients across North Eastern Himalayan corridors, pinpointing localized soil saturation anomalies.
                </p>

                <div className="pt-4 pointer-events-auto">
                  <button
                    onClick={goToNextScene}
                    className="px-6 py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400 text-sky-200 text-xs font-mono tracking-wider transition-all flex items-center gap-2 mx-auto shadow-[0_0_20px_rgba(56,189,248,0.3)]"
                  >
                    <span>ANALYZE INTELLIGENCE LAYERS</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* SCENE 04 — ANALYZE */}
            {currentScene === 4 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono tracking-widest">
                  <Layers className="w-3 h-3" />
                  SCENE 04 // 3D LAYER DISASSEMBLY
                </div>

                <div className="space-y-2">
                  <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                    ONE SYSTEM. MULTIPLE SIGNALS.
                  </h2>
                  <h3 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-sky-400 via-purple-300 to-teal-300 bg-clip-text text-transparent">
                    ONE INTELLIGENT RESPONSE.
                  </h3>
                </div>

                <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto font-light">
                  The core separates into spatial intelligence layers — from historical slope failure patterns to live NWP rainfall thresholds and predictive physics engines.
                </p>

                <div className="pt-4 pointer-events-auto">
                  <button
                    onClick={goToNextScene}
                    className="px-6 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-purple-500/40 text-purple-300 text-xs font-mono tracking-wider transition-all flex items-center gap-2 mx-auto shadow-[0_0_20px_rgba(168,85,247,0.25)]"
                  >
                    <span>CONVERGE SYSTEM INTELLIGENCE</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* SCENE 05 — INTELLIGENCE */}
            {currentScene === 5 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-mono tracking-widest">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  SCENE 05 // SYSTEM REVEAL
                </div>

                {/* System Messages */}
                <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-sky-400/90 tracking-widest">
                  <span>[ SIGNAL DETECTED ]</span>
                  <span>•</span>
                  <span>[ ANALYZING CONDITIONS ]</span>
                  <span>•</span>
                  <span>[ PROCESSING PATTERNS ]</span>
                </div>

                <h1 className="text-6xl sm:text-9xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-100 to-sky-400 drop-shadow-[0_0_35px_rgba(56,189,248,0.5)]">
                  RAKSHAK
                </h1>

                <p className="text-sm sm:text-base text-slate-300 font-mono tracking-wider max-w-lg mx-auto">
                  MULTIMODAL LANDSLIDE EARLY WARNING & DISASTER RISK INTELLIGENCE
                </p>

                <div className="pt-4 pointer-events-auto">
                  <button
                    onClick={goToNextScene}
                    className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-bold tracking-wider transition-all flex items-center gap-2 mx-auto shadow-[0_0_25px_rgba(56,189,248,0.5)]"
                  >
                    <span>EXPLORE COORDINATED RESPONSE</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* SCENE 06 — RESPONSE */}
            {currentScene === 6 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono tracking-widest">
                  <Shield className="w-3.5 h-3.5" />
                  SCENE 06 // RESPONSE READY
                </div>

                <h1 className="text-3xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
                  WHEN SECONDS MATTER,<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-sky-300 to-emerald-400">
                    RESPONSE MUST BE READY.
                  </span>
                </h1>

                <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto font-light">
                  From multi-agency disaster command rooms to citizens on the ground, RAKSHAK synchronizes real-time warnings, safe routes, and verified emergency channels.
                </p>

                {/* Big Action Button To Enter Portals */}
                <div className="pt-6 pointer-events-auto flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      soundFx.playWhoosh();
                      setViewMode('ROLE_SELECT');
                    }}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs sm:text-sm font-bold tracking-wider shadow-[0_0_30px_rgba(56,189,248,0.4)] flex items-center justify-center gap-2 transition-all group active:scale-[0.98]"
                  >
                    <span>SELECT OPERATIONAL CLEARANCE</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom HUD Bar (Story Navigation Help) */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-4 border-t border-slate-900/80">
            <div className="flex items-center gap-2 pointer-events-auto">
              {currentScene > 1 && (
                <button
                  onClick={goToPrevScene}
                  className="hover:text-white transition-colors"
                >
                  &larr; PREVIOUS SCENE
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span>SCROLL OR USE ARROW KEYS TO EXPLORE</span>
              <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={goToNextScene}
                className="hover:text-sky-300 transition-colors font-semibold text-sky-400"
              >
                {currentScene === 6 ? 'ENTER PORTAL &rarr;' : 'NEXT SCENE &rarr;'}
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ========================================================= */}
      {/* MODE 2: CINEMATIC ROLE SELECTION PORTAL                   */}
      {/* ========================================================= */}
      {viewMode === 'ROLE_SELECT' && (
        <main className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center pt-20 pb-10">
          <RakshakRoleSelector
            onSelectRole={handleSelectRoleFromPortal}
            onDirectLogin={() => setViewMode('LOGIN')}
          />
        </main>
      )}

      {/* ========================================================= */}
      {/* MODE 3: REDESIGNED VISUAL LOGIN INTERFACE                 */}
      {/* ========================================================= */}
      {viewMode === 'LOGIN' && (
        <div className="relative z-10 w-full min-h-screen flex flex-col justify-between">
          <RakshakLoginInterface
            initialRole={selectedRole}
            onBackToStory={() => setViewMode('STORY')}
            onBackToRoles={() => setViewMode('ROLE_SELECT')}
          />
        </div>
      )}
    </div>
  );
};

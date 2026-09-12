import React, { useState, useEffect } from 'react';
import { Shield, Radio, Activity, Cpu, Sparkles, ChevronRight } from 'lucide-react';
import { soundFx } from './soundFx';

interface CinematicInitSequenceProps {
  onComplete: () => void;
}

export const CinematicInitSequence: React.FC<CinematicInitSequenceProps> = ({ onComplete }) => {
  const [step, setStep] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);

  const telemetrySteps = [
    { label: 'INITIALIZING AI GEOSPATIAL INTELLIGENCE GRID', icon: Shield, code: 'MOD_AI_CORE_01' },
    { label: 'CALIBRATING SATELLITE & SOIL MOISTURE TELEMETRY', icon: Radio, code: 'SAT_TELEMETRY_LINKED' },
    { label: 'CONNECTING SECURE BREVO EMERGENCY EMAIL GATEWAY', icon: Cpu, code: 'SECURE_GATEWAY_V3' },
    { label: 'SYNCHRONIZING REGIONAL DISASTER COMMAND PROTOCOLS', icon: Activity, code: 'NDRF_SDRF_GRID_SYNC' }
  ];

  useEffect(() => {
    soundFx.playRadarPing();

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 300);
          return 100;
        }
        const next = prev + 2;
        if (next > 75) setStep(3);
        else if (next > 50) setStep(2);
        else if (next > 25) setStep(1);
        return next;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [onComplete]);

  const handleSkip = () => {
    soundFx.playClick();
    onComplete();
  };

  const CurrentIcon = telemetrySteps[step]?.icon || Shield;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden select-none">
      {/* Ambient background glow */}
      <div className="absolute w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main emblem */}
      <div className="relative z-10 flex flex-col items-center max-w-lg w-full px-6 text-center">
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-sky-600/30 via-slate-900 to-sky-400/20 border border-sky-400/40 backdrop-blur-md flex items-center justify-center shadow-[0_0_50px_rgba(56,189,248,0.25)] animate-pulse">
            <CurrentIcon className="w-12 h-12 text-sky-400 animate-bounce" />
          </div>
          <div className="absolute -inset-2 rounded-3xl border border-sky-500/20 animate-spin" style={{ animationDuration: '12s' }} />
          <div className="absolute -inset-4 rounded-3xl border border-dashed border-sky-500/10 animate-spin" style={{ animationDuration: '24s', animationDirection: 'reverse' }} />
        </div>

        <div className="space-y-2 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-mono font-medium tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            GOVERNMENT OF INDIA // DISASTER RISK PLATFORM
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-wider bg-gradient-to-r from-white via-sky-100 to-sky-400 bg-clip-text text-transparent">
            RAKSHAK
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-mono tracking-widest uppercase">
            Multimodal Landslide Early Warning & Command Grid
          </p>
        </div>

        {/* Dynamic Telemetry Status */}
        <div className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-4 backdrop-blur-md mb-6 shadow-xl">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="flex items-center gap-2 text-sky-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              {telemetrySteps[step]?.code}
            </span>
            <span className="text-sky-300 font-bold">{progress}%</span>
          </div>

          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-sky-500 via-blue-500 to-teal-400 transition-all duration-75 shadow-[0_0_12px_rgba(56,189,248,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-xs text-slate-300 font-mono text-left truncate flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 text-sky-400 inline shrink-0" />
            {telemetrySteps[step]?.label}
          </p>
        </div>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800/80 border border-slate-700/60 rounded-lg transition-all flex items-center gap-1.5 hover:border-sky-500/40"
        >
          <span>PROCEED TO ACCESS PORTAL</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Footer classification banner */}
      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center text-[10px] font-mono text-slate-500 tracking-wider">
        SECURE HTTPS // ZERO SMS PROTOCOL // BREVO REAL GATEWAY LINKED
      </div>
    </div>
  );
};

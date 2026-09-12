import type { RiskLevel, PriorityTier } from '../types';

export interface NormalizedRiskState {
  probability: number;
  riskBand: RiskLevel;
  priority: PriorityTier;
  priorityLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  colorHex: string;
}

export const RISK_COLOR_MAP: Record<RiskLevel, { hex: string; bg: string; text: string; border: string }> = {
  CRITICAL: { hex: '#ef4444', bg: 'bg-red-950/80', text: 'text-red-400', border: 'border-red-700' },
  HIGH: { hex: '#ea580c', bg: 'bg-orange-950/80', text: 'text-orange-400', border: 'border-orange-700' },
  WARNING: { hex: '#f59e0b', bg: 'bg-amber-950/80', text: 'text-amber-300', border: 'border-amber-700' },
  WATCH: { hex: '#eab308', bg: 'bg-yellow-950/80', text: 'text-yellow-300', border: 'border-yellow-700' },
  LOW: { hex: '#10b981', bg: 'bg-emerald-950/80', text: 'text-emerald-400', border: 'border-emerald-700' },
  SAFE: { hex: '#10b981', bg: 'bg-emerald-950/80', text: 'text-emerald-400', border: 'border-emerald-700' },
};

export const PRIORITY_LABELS: Record<PriorityTier, string> = {
  P1: 'Immediate Tactical Intervention',
  P2: 'Critical Response Required',
  P3: 'Elevated / Warning Monitoring',
  P4: 'Advisory / Watch Monitoring',
  P5: 'Routine Surveillance'
};

export function getNormalizedRiskState(probability: number, currentRisk?: RiskLevel, priority?: PriorityTier): NormalizedRiskState {
  const prob = Math.max(0.0, Math.min(1.0, probability));
  
  // Single Source of Truth Risk Band
  let riskBand: RiskLevel = currentRisk || 'LOW';
  if (!currentRisk) {
    if (prob >= 0.78) riskBand = 'CRITICAL';
    else if (prob >= 0.58) riskBand = 'HIGH';
    else if (prob >= 0.40) riskBand = 'WARNING';
    else if (prob >= 0.22) riskBand = 'WATCH';
    else riskBand = 'LOW';
  }

  // Single Source of Truth Priority
  let pTier: PriorityTier = priority || 'P5';
  if (!priority) {
    if (prob >= 0.78) pTier = 'P1';
    else if (prob >= 0.58) pTier = 'P2';
    else if (prob >= 0.40) pTier = 'P3';
    else if (prob >= 0.22) pTier = 'P4';
    else pTier = 'P5';
  }

  const styling = RISK_COLOR_MAP[riskBand] || RISK_COLOR_MAP.LOW;

  return {
    probability: prob,
    riskBand,
    priority: pTier,
    priorityLabel: PRIORITY_LABELS[pTier] || 'Routine Surveillance',
    badgeBg: styling.bg,
    badgeText: styling.text,
    badgeBorder: styling.border,
    colorHex: styling.hex
  };
}

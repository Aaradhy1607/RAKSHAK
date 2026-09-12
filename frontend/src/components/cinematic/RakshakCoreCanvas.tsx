import React, { useEffect, useRef } from 'react';

export interface RakshakCoreCanvasProps {
  activeScene?: number; // 1 to 6 (or 7 for portal/login)
  sceneProgress?: number; // 0 to 1 within active scene
  cursorX?: number; // -1 to 1 normalized
  cursorY?: number; // -1 to 1 normalized
  className?: string;
  interactive?: boolean;
}

export const RakshakCoreCanvas: React.FC<RakshakCoreCanvasProps> = ({
  activeScene = 1,
  sceneProgress = 0,
  cursorX = 0,
  cursorY = 0,
  className = '',
  interactive = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({
    activeScene,
    sceneProgress,
    cursorX,
    cursorY,
    smoothCursorX: 0,
    smoothCursorY: 0,
    time: 0,
    radarAngle: 0,
    coreRotation: 0,
    shockwaveRadius: 0,
    particles: [] as Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      color: string;
      targetLayer?: number;
    }>,
    shockwaves: [] as Array<{
      radius: number;
      maxRadius: number;
      alpha: number;
      color: string;
    }>
  });

  // Keep stateRef synced with props without restarting render loop
  useEffect(() => {
    stateRef.current.activeScene = activeScene;
    stateRef.current.sceneProgress = sceneProgress;
    if (interactive) {
      stateRef.current.cursorX = cursorX;
      stateRef.current.cursorY = cursorY;
    }
  }, [activeScene, sceneProgress, cursorX, cursorY, interactive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const handleResize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Initialize atmospheric floating particles
    const particleColors = [
      'rgba(56, 189, 248, 0.8)', // Sky
      'rgba(45, 212, 191, 0.8)', // Teal
      'rgba(129, 140, 248, 0.7)', // Indigo
      'rgba(255, 255, 255, 0.9)', // White
      'rgba(244, 114, 182, 0.6)'  // Rose/Alert
    ];

    const particles = [];
    const particleCount = window.innerWidth < 768 ? 60 : 130;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2.2 + 0.8,
        alpha: Math.random() * 0.7 + 0.2,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
        targetLayer: Math.floor(Math.random() * 5)
      });
    }
    stateRef.current.particles = particles;

    // Trigger shockwave on scene transitions (e.g. Scene 3 Detect, Scene 5 Reveal, Scene 6 Response)
    let lastScene = activeScene;

    const render = () => {
      const state = stateRef.current;
      state.time += 0.016;
      state.radarAngle += 0.012;
      state.coreRotation += 0.006;

      // Smooth cursor parallax interpolation
      state.smoothCursorX += (state.cursorX - state.smoothCursorX) * 0.05;
      state.smoothCursorY += (state.cursorY - state.smoothCursorY) * 0.05;

      const displayW = window.innerWidth;
      const displayH = window.innerHeight;

      // Check scene transition triggers for shockwaves
      if (state.activeScene !== lastScene) {
        if (state.activeScene === 3 || state.activeScene === 5 || state.activeScene === 6) {
          state.shockwaves.push({
            radius: 20,
            maxRadius: Math.max(displayW, displayH) * 0.85,
            alpha: 0.9,
            color: state.activeScene === 5 ? 'rgba(56, 189, 248, 0.9)' : 'rgba(45, 212, 191, 0.8)'
          });
        }
        lastScene = state.activeScene;
      }

      // -------------------------------------------------------------
      // 1. DEEP CINEMATIC SPACE & GRADIENT
      // -------------------------------------------------------------
      ctx.clearRect(0, 0, displayW, displayH);

      const centerX = displayW * 0.5 + state.smoothCursorX * 28;
      const centerY = displayH * 0.5 + state.smoothCursorY * 20;

      // Background atmospheric radial glow
      const bgGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        30,
        centerX,
        centerY,
        Math.max(displayW, displayH) * 0.8
      );

      const scene = state.activeScene;
      if (scene === 1) {
        // Scene 01 Silence: Near absolute pitch black with faint cold cyan point
        bgGrad.addColorStop(0, '#030712');
        bgGrad.addColorStop(0.5, '#020408');
        bgGrad.addColorStop(1, '#000000');
      } else if (scene === 4) {
        // Scene 04 Analyze: Deep spatial indigo/slate atmosphere
        bgGrad.addColorStop(0, '#0a1024');
        bgGrad.addColorStop(0.5, '#040714');
        bgGrad.addColorStop(1, '#010206');
      } else if (scene === 5) {
        // Scene 05 Intelligence: Radiant high-energy azure aura
        bgGrad.addColorStop(0, '#0d1d3a');
        bgGrad.addColorStop(0.4, '#060f22');
        bgGrad.addColorStop(1, '#020308');
      } else {
        // General futuristic space
        bgGrad.addColorStop(0, '#060d1f');
        bgGrad.addColorStop(0.4, '#030712');
        bgGrad.addColorStop(1, '#010206');
      }

      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, displayW, displayH);

      // -------------------------------------------------------------
      // 2. SUBTLE SPATIAL GRID & TOPOGRAPHY CONTOURS
      // -------------------------------------------------------------
      if (scene >= 1) {
        const gridAlpha = scene === 1 ? 0.03 : 0.08;
        ctx.strokeStyle = `rgba(56, 189, 248, ${gridAlpha})`;
        ctx.lineWidth = 1;

        const gridSize = 70;
        ctx.beginPath();
        for (let x = 0; x < displayW; x += gridSize) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, displayH);
        }
        for (let y = 0; y < displayH; y += gridSize) {
          ctx.moveTo(0, y);
          ctx.lineTo(displayW, y);
        }
        ctx.stroke();

        // Himalayan Elevation Contours (Subtle flowing ridges)
        const contourCount = scene === 1 ? 2 : 4;
        for (let c = 0; c < contourCount; c++) {
          ctx.beginPath();
          const baseElevationY = displayH * (0.42 + c * 0.14) + state.smoothCursorY * (10 + c * 8);
          const cAlpha = scene === 1 ? 0.03 : 0.05 + c * 0.02;
          ctx.strokeStyle = `rgba(14, 165, 233, ${cAlpha})`;
          ctx.lineWidth = 1.2;

          for (let x = 0; x <= displayW; x += 20) {
            const wave1 = Math.sin(x * 0.003 + state.time * 0.7 + c * 1.2) * 28;
            const wave2 = Math.cos(x * 0.006 - state.time * 0.4 + c * 2.1) * 16;
            const y = baseElevationY + wave1 + wave2;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      // -------------------------------------------------------------
      // 3. EXPANDING SHOCKWAVES & SCAN RIPPLES
      // -------------------------------------------------------------
      for (let s = state.shockwaves.length - 1; s >= 0; s--) {
        const sw = state.shockwaves[s];
        sw.radius += 14;
        sw.alpha *= 0.96;

        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color.replace(/[\d\.]+\)$/, `${sw.alpha})`);
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 12]);
        ctx.stroke();
        ctx.restore();

        if (sw.radius > sw.maxRadius || sw.alpha < 0.01) {
          state.shockwaves.splice(s, 1);
        }
      }

      // -------------------------------------------------------------
      // 4. FLOATING PARTICLES & INWARD INGESTION (Scene 05)
      // -------------------------------------------------------------
      ctx.save();
      for (let i = 0; i < state.particles.length; i++) {
        const p = state.particles[i];

        if (scene === 5) {
          // In Scene 05 (Intelligence), particles rush inward toward the nucleus!
          const dx = centerX - p.x;
          const dy = centerY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 15) {
            p.x += (dx / dist) * 4.5;
            p.y += (dy / dist) * 4.5;
          } else {
            // Respawn on outer perimeter
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.max(displayW, displayH) * 0.6;
            p.x = centerX + Math.cos(angle) * radius;
            p.y = centerY + Math.sin(angle) * radius;
          }
        } else {
          // Natural ambient drift
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0) p.x = displayW;
          if (p.x > displayW) p.x = 0;
          if (p.y < 0) p.y = displayH;
          if (p.y > displayH) p.y = 0;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fill();
      }
      ctx.restore();

      // -------------------------------------------------------------
      // 5. THE RAKSHAK CORE — THE SIGNATURE LIVING BEACON
      // -------------------------------------------------------------
      const coreScale = displayW < 768 ? 0.75 : 1.0;
      const baseRadius = 140 * coreScale;

      ctx.save();
      ctx.translate(centerX, centerY);

      // Core 3D Tilt perspective simulation from cursor
      const tiltX = state.smoothCursorY * 0.25;
      const tiltY = -state.smoothCursorX * 0.25;

      // ============================================================
      // SCENE 01: SILENCE (A tiny point of light evolving in darkness)
      // ============================================================
      if (scene === 1) {
        const pulse = Math.sin(state.time * 2.5) * 0.3 + 0.7;
        const pointGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 45 * pulse);
        pointGrad.addColorStop(0, '#ffffff');
        pointGrad.addColorStop(0.2, 'rgba(56, 189, 248, 0.9)');
        pointGrad.addColorStop(0.6, 'rgba(14, 165, 233, 0.2)');
        pointGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = pointGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 45 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Single tiny inner beacon
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.restore();
        animId = requestAnimationFrame(render);
        return;
      }

      // ============================================================
      // SCENE 04: ANALYZE — 3D LAYER DISASSEMBLY MODE
      // ============================================================
      if (scene === 4) {
        // Disassemble the CORE into 5 distinct floating spatial layers
        const layers = [
          { name: '05 // PREDICTIVE HAZARD ML', color: 'rgba(168, 85, 247, 0.85)', offsetY: -120, radius: 150 },
          { name: '04 // SATELLITE & RADAR TELEMETRY', color: 'rgba(56, 189, 248, 0.85)', offsetY: -60, radius: 130 },
          { name: '03 // CENTRAL GEOSPATIAL INTELLIGENCE', color: 'rgba(255, 255, 255, 0.95)', offsetY: 0, radius: 100 },
          { name: '02 // TOPOGRAPHY & SLOPE DYNAMICS', color: 'rgba(20, 184, 166, 0.85)', offsetY: 60, radius: 130 },
          { name: '01 // HYDRO-METEOROLOGICAL SIGNALS', color: 'rgba(59, 130, 246, 0.85)', offsetY: 120, radius: 150 }
        ];

        // Draw connecting vertical data threads between layers
        ctx.beginPath();
        ctx.moveTo(0, -130);
        ctx.lineTo(0, 130);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Render each floating disc in perspective
        layers.forEach((layer, idx) => {
          const ly = layer.offsetY + Math.sin(state.time * 1.5 + idx) * 8;
          const ringRad = layer.radius * coreScale;

          ctx.save();
          ctx.translate(0, ly);
          // Perspective scale (ellipse ratio)
          ctx.scale(1, 0.38 + tiltX);

          // Outer glowing layer disc
          ctx.beginPath();
          ctx.arc(0, 0, ringRad, 0, Math.PI * 2);
          ctx.strokeStyle = layer.color;
          ctx.lineWidth = 2;
          ctx.shadowColor = layer.color;
          ctx.shadowBlur = 12;
          ctx.stroke();

          // Segmented ticks
          const tickCount = 16;
          for (let t = 0; t < tickCount; t++) {
            const angle = (t / tickCount) * Math.PI * 2 + state.coreRotation * (idx % 2 === 0 ? 1 : -1);
            const tx1 = Math.cos(angle) * (ringRad - 8);
            const ty1 = Math.sin(angle) * (ringRad - 8);
            const tx2 = Math.cos(angle) * (ringRad + 8);
            const ty2 = Math.sin(angle) * (ringRad + 8);
            ctx.beginPath();
            ctx.moveTo(tx1, ty1);
            ctx.lineTo(tx2, ty2);
            ctx.strokeStyle = layer.color;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          // Inner filled subtle plane
          ctx.fillStyle = layer.color.replace(/[\d\.]+\)$/, '0.06)');
          ctx.fill();

          ctx.restore();

          // Micro Layer Annotation Tag
          ctx.fillStyle = layer.color;
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(layer.name, ringRad + 24, ly + 4);

          // Connecting indicator line to text
          ctx.beginPath();
          ctx.moveTo(ringRad + 6, ly);
          ctx.lineTo(ringRad + 18, ly);
          ctx.strokeStyle = layer.color;
          ctx.lineWidth = 1;
          ctx.stroke();
        });

        // Center Nucleus in layer mode
        const nucleusPulse = Math.sin(state.time * 3) * 0.2 + 0.8;
        ctx.beginPath();
        ctx.arc(0, 0, 16 * nucleusPulse, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 20;
        ctx.fill();

        ctx.restore();
        animId = requestAnimationFrame(render);
        return;
      }

      // ============================================================
      // SCENES 02, 03, 05, 06 & PORTAL (FULL BEACON LIVING OBJECT)
      // ============================================================

      // 1. Central Luminous Nucleus (Pulsing Energy Core)
      const nucleusIntensity = scene === 5 ? 1.8 : 1.0;
      const corePulse = (Math.sin(state.time * 2.8) * 0.15 + 0.85) * nucleusIntensity;

      const nucGrad = ctx.createRadialGradient(
        0,
        0,
        0,
        0,
        0,
        60 * coreScale * corePulse
      );
      nucGrad.addColorStop(0, '#ffffff');
      nucGrad.addColorStop(0.2, 'rgba(56, 189, 248, 1.0)');
      nucGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.45)');
      nucGrad.addColorStop(0.8, 'rgba(3, 105, 161, 0.15)');
      nucGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = nucGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 60 * coreScale * corePulse, 0, Math.PI * 2);
      ctx.fill();

      // Geometric Inner Lattice (Rotating Hexagon & Diamond Core)
      ctx.save();
      ctx.rotate(state.coreRotation * 1.5);
      ctx.beginPath();
      const hexSides = 6;
      const hexRadius = 22 * coreScale * corePulse;
      for (let h = 0; h < hexSides; h++) {
        const a = (h / hexSides) * Math.PI * 2;
        const hx = Math.cos(a) * hexRadius;
        const hy = Math.sin(a) * hexRadius;
        if (h === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;
      ctx.stroke();

      // Inner diamond cross
      ctx.rotate(-state.coreRotation * 3.0);
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(12, 0);
      ctx.moveTo(0, -12);
      ctx.lineTo(0, 12);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // 2. Ring 1 (Inner Segmented Arc Shield)
      ctx.save();
      ctx.rotate(-state.coreRotation);
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 0.55, 0.3, Math.PI * 1.4);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 0.55, Math.PI * 1.6, Math.PI * 2.1);
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.85)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      // 3. Ring 2 (Middle Coordinate & Telemetry Ring with Radar Sweep)
      ctx.save();
      ctx.rotate(state.coreRotation * 0.7);
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 0.85, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 8]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Radar Sweeping Arc (Scene 03 Detect / Scene 06 Response)
      if (scene >= 3) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, baseRadius * 0.85, state.radarAngle - 0.45, state.radarAngle, false);
        ctx.closePath();
        const sweepG = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius * 0.85);
        sweepG.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
        sweepG.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
        ctx.fillStyle = sweepG;
        ctx.fill();
      }

      // Orbital telemetry nodes on Ring 2
      const nodeCount = 4;
      for (let n = 0; n < nodeCount; n++) {
        const na = (n / nodeCount) * Math.PI * 2;
        const nx = Math.cos(na) * (baseRadius * 0.85);
        const ny = Math.sin(na) * (baseRadius * 0.85);

        ctx.beginPath();
        ctx.arc(nx, ny, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.fill();
      }
      ctx.restore();

      // 4. Ring 3 (Outer Segmented Geometric Armor & Compass Ticks)
      ctx.save();
      ctx.rotate(state.coreRotation * 0.35);
      const outerRad = baseRadius * 1.25;

      ctx.beginPath();
      ctx.arc(0, 0, outerRad, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 4 Heavy Protective Corner Brackets
      const brackets = 4;
      for (let b = 0; b < brackets; b++) {
        const ba = (b / brackets) * Math.PI * 2 + Math.PI / 4;
        const startA = ba - 0.2;
        const endA = ba + 0.2;

        ctx.beginPath();
        ctx.arc(0, 0, outerRad, startA, endA);
        ctx.strokeStyle = scene === 6 ? 'rgba(45, 212, 191, 0.95)' : 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.stroke();

        // Micro ticks
        const bx = Math.cos(ba) * (outerRad + 12);
        const by = Math.sin(ba) * (outerRad + 12);
        ctx.beginPath();
        ctx.moveTo(Math.cos(ba) * (outerRad + 4), Math.sin(ba) * (outerRad + 4));
        ctx.lineTo(bx, by);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Outer Coordinate Hash Annotations
      const compassTicks = 36;
      for (let c = 0; c < compassTicks; c++) {
        const ca = (c / compassTicks) * Math.PI * 2;
        const isMajor = c % 9 === 0;
        const tLen = isMajor ? 10 : 4;
        const cx1 = Math.cos(ca) * (outerRad - 2);
        const cy1 = Math.sin(ca) * (outerRad - 2);
        const cx2 = Math.cos(ca) * (outerRad + tLen);
        const cy2 = Math.sin(ca) * (outerRad + tLen);

        ctx.beginPath();
        ctx.moveTo(cx1, cy1);
        ctx.lineTo(cx2, cy2);
        ctx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.8)' : 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = isMajor ? 1.5 : 1;
        ctx.stroke();
      }
      ctx.restore();

      // 5. 3D Equatorial Elliptical Orbital Ring
      ctx.save();
      ctx.rotate(0.3 + tiltY);
      ctx.scale(1.0, 0.32 + tiltX);
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 1.55, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 10]);
      ctx.stroke();

      // Orbiting Satellite Beacon Particle on equatorial ring
      const satAngle = state.time * 1.8;
      const satX = Math.cos(satAngle) * (baseRadius * 1.55);
      const satY = Math.sin(satAngle) * (baseRadius * 1.55);

      ctx.beginPath();
      ctx.arc(satX, satY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.restore();

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-0 ${className}`}
    />
  );
};

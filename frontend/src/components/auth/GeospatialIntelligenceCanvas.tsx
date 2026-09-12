import React, { useEffect, useRef } from 'react';

interface GeospatialIntelligenceCanvasProps {
  intensity?: number;
  className?: string;
}

export const GeospatialIntelligenceCanvas: React.FC<GeospatialIntelligenceCanvasProps> = ({
  intensity = 1,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Monitoring telemetry nodes representing landslide observation sectors
    const nodes = [
      { x: 0.22 * width, y: 0.35 * height, label: 'SECTOR-DIMA-HASAO', pulse: 0, speed: 0.02, color: 'rgba(239, 68, 68, 0.8)' },
      { x: 0.38 * width, y: 0.28 * height, label: 'ZONE-SHILLONG-BYPASS', pulse: 1.5, speed: 0.018, color: 'rgba(245, 158, 11, 0.8)' },
      { x: 0.65 * width, y: 0.42 * height, label: 'CHAMPHAI-SLOPE-ARRAY', pulse: 3.1, speed: 0.025, color: 'rgba(16, 185, 129, 0.8)' },
      { x: 0.78 * width, y: 0.25 * height, label: 'GANGTOK-CORRIDOR-09', pulse: 0.8, speed: 0.015, color: 'rgba(59, 130, 246, 0.8)' },
      { x: 0.50 * width, y: 0.68 * height, label: 'KOHIMA-DEFENSE-GRID', pulse: 2.2, speed: 0.02, color: 'rgba(168, 85, 247, 0.8)' },
      { x: 0.15 * width, y: 0.72 * height, label: 'RISHIKESH-BADRINATH-NH58', pulse: 4.0, speed: 0.022, color: 'rgba(239, 68, 68, 0.8)' }
    ];

    let radarAngle = 0;
    let time = 0;

    const render = () => {
      time += 0.015;
      radarAngle += 0.008;

      // Dark futuristic background gradient
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.4,
        50,
        width * 0.5,
        height * 0.5,
        Math.max(width, height)
      );
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(0.5, '#05070d');
      bgGrad.addColorStop(1, '#020306');

      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 1. Grid matrix
      const gridSize = 64;
      ctx.strokeStyle = 'rgba(30, 58, 138, 0.12)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      for (let x = 0; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // 2. Dynamic Topographic Contour Lines (Himalayan / NER Elevation simulation)
      ctx.lineWidth = 1.2;
      for (let c = 0; c < 5; c++) {
        ctx.beginPath();
        const baseElevationY = height * (0.35 + c * 0.12);
        ctx.strokeStyle = `rgba(14, 165, 233, ${0.05 + c * 0.02})`;

        for (let x = 0; x <= width; x += 15) {
          const wave1 = Math.sin(x * 0.003 + time + c) * 35;
          const wave2 = Math.cos(x * 0.007 - time * 0.5 + c * 1.5) * 20;
          const y = baseElevationY + wave1 + wave2;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // 3. Radar Sweep Arc
      const radarCenterX = width * 0.5;
      const radarCenterY = height * 0.45;
      const radarRadius = Math.min(width, height) * 0.6;

      ctx.save();
      ctx.beginPath();
      ctx.arc(radarCenterX, radarCenterY, radarRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.stroke();

      // Inner radar rings
      ctx.beginPath();
      ctx.arc(radarCenterX, radarCenterY, radarRadius * 0.6, 0, Math.PI * 2);
      ctx.arc(radarCenterX, radarCenterY, radarRadius * 0.3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.08)';
      ctx.stroke();
      ctx.restore();

      // Sweeping beam
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(radarCenterX, radarCenterY);
      ctx.arc(
        radarCenterX,
        radarCenterY,
        radarRadius,
        radarAngle - 0.4,
        radarAngle,
        false
      );
      ctx.closePath();
      const sweepGrad = ctx.createRadialGradient(
        radarCenterX,
        radarCenterY,
        0,
        radarCenterX,
        radarCenterY,
        radarRadius
      );
      sweepGrad.addColorStop(0, 'rgba(56, 189, 248, 0.18)');
      sweepGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
      ctx.fillStyle = sweepGrad;
      ctx.fill();
      ctx.restore();

      // 4. Telemetry nodes & connecting data vectors
      ctx.beginPath();
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 420) {
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
          }
        }
      }
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.09)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw individual sensor points
      nodes.forEach((node) => {
        node.pulse += node.speed;
        const currentPulse = (Math.sin(node.pulse) + 1) / 2; // 0 to 1

        // Outer beacon ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, 6 + currentPulse * 14, 0, Math.PI * 2);
        ctx.strokeStyle = node.color.replace('0.8', String(0.1 + (1 - currentPulse) * 0.4));
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner glowing core
        ctx.beginPath();
        ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Micro label
        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(node.label, node.x + 12, node.y + 3);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-0 ${className}`}
    />
  );
};

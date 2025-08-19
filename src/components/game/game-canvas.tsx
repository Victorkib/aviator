'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { Card } from '@/components/ui/card';

interface GameCanvasProps {
  multiplier: number;
  phase: 'betting' | 'flying' | 'crashed' | 'preparing';
  timeElapsed: number;
  isDemo?: boolean;
}

export function GameCanvas({
  multiplier,
  phase,
  timeElapsed,
  isDemo = false,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before accessing theme
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Theme-aware colors
    const isDark = resolvedTheme === 'dark';
    const backgroundColor = isDark ? '#111827' : '#f9fafb'; // gray-900 : gray-50
    const gridColor = isDark ? '#374151' : '#e5e7eb'; // gray-700 : gray-200
    const lineColor = isDark ? '#10b981' : '#059669'; // emerald-500 : emerald-600
    const textColor = isDark ? '#ffffff' : '#111827'; // white : gray-900
    const crashColor = '#ef4444'; // red-500

    // Clear canvas with theme-aware background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw grid
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // Vertical grid lines
    for (let x = 0; x <= rect.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let y = 0; y <= rect.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }

    ctx.setLineDash([]); // Reset line dash

    // Draw multiplier curve
    if (phase === 'flying' || phase === 'crashed') {
      const points: [number, number][] = [];
      const maxTime = Math.max(timeElapsed, 1000);

      for (let t = 0; t <= timeElapsed; t += 50) {
        const x = (t / maxTime) * rect.width * 0.8;
        const mult = Math.pow(1.0024, t / 10);
        const y =
          rect.height -
          (Math.log(mult) / Math.log(10)) * rect.height * 0.3 -
          50;
        points.push([x + 50, Math.max(y, 20)]);
      }

      if (points.length > 1) {
        ctx.strokeStyle = phase === 'crashed' ? crashColor : lineColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);

        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i][0], points[i][1]);
        }
        ctx.stroke();

        // Add glow effect
        ctx.shadowColor = phase === 'crashed' ? crashColor : lineColor;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    // Draw multiplier text
    ctx.fillStyle = textColor;
    ctx.font = 'bold 48px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const multiplierText = `${multiplier.toFixed(2)}x`;
    const textX = rect.width / 2;
    const textY = rect.height / 2;

    // Add text shadow for better visibility
    ctx.shadowColor = isDark ? '#000000' : '#ffffff';
    ctx.shadowBlur = 4;
    ctx.fillText(multiplierText, textX, textY);
    ctx.shadowBlur = 0;

    // Phase indicator
    ctx.font = '16px system-ui';
    ctx.textAlign = 'left';
    ctx.fillStyle = textColor;

    let phaseText = '';
    let phaseColor = textColor;

    switch (phase) {
      case 'betting':
        phaseText = '🎯 BETTING PHASE';
        phaseColor = '#3b82f6'; // blue-500
        break;
      case 'flying':
        phaseText = '🚀 FLYING';
        phaseColor = lineColor;
        break;
      case 'crashed':
        phaseText = '💥 CRASHED';
        phaseColor = crashColor;
        break;
      case 'preparing':
        phaseText = '⏳ PREPARING';
        phaseColor = '#6b7280'; // gray-500
        break;
    }

    ctx.fillStyle = phaseColor;
    ctx.fillText(phaseText, 20, 30);

    // Demo indicator
    if (isDemo) {
      ctx.fillStyle = '#f59e0b'; // amber-500
      ctx.font = '14px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText('DEMO MODE', rect.width - 20, 30);
    }
  }, [multiplier, phase, timeElapsed, isDemo, resolvedTheme, mounted]);

  if (!mounted) {
    return (
      <Card className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-2">✈️</div>
          <p className="text-gray-500 dark:text-gray-400">Loading game...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full overflow-hidden bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      <canvas ref={canvasRef} className="w-full h-full" />
    </Card>
  );
}

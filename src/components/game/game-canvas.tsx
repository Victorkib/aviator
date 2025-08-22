'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

interface GameCanvasProps {
  multiplier: number;
  phase: 'betting' | 'flying' | 'crashed' | 'preparing';
  timeLeft?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export function GameCanvas({ multiplier, phase, timeLeft }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const [showMultiplier, setShowMultiplier] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation variables
    let animationTime = 0;
    let planeX = 80;
    let planeY = canvas.height / 2;
    let planeRotation = 0;
    let planeScale = 1;
    let trailPoints: { x: number; y: number; alpha: number }[] = [];
    
    const targetPlaneY = phase === 'flying' ? canvas.height / 3 : canvas.height / 2;

    // Enhanced colors with gradients
    const colors = {
      background: '#0a0a0a',
      grid: '#1a1a1a',
      plane: '#f59e0b',
      planeGlow: '#fbbf24',
      trail: '#10b981',
      trailGlow: '#34d399',
      crash: '#ef4444',
      crashGlow: '#f87171',
      text: '#ffffff',
      textGlow: '#fbbf24',
      particles: ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444']
    };

    // Create gradient backgrounds
    const createGradient = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color1: string, color2: string) => {
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, color1);
      gradient.addColorStop(1, color2);
      return gradient;
    };

    // Particle system - use refs to avoid setState in animation loop
    const createParticles = (x: number, y: number, count: number, color?: string) => {
      const newParticles: Particle[] = [];
      for (let i = 0; i < count; i++) {
        newParticles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          life: 1,
          maxLife: Math.random() * 60 + 30,
          color: color || colors.particles[Math.floor(Math.random() * colors.particles.length)],
          size: Math.random() * 4 + 2
        });
      }
      particlesRef.current = [...particlesRef.current, ...newParticles];
    };

    // Update particles
    const updateParticles = () => {
      particlesRef.current = particlesRef.current
        .map(particle => ({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          life: particle.life - 1,
          vx: particle.vx * 0.98,
          vy: particle.vy * 0.98
        }))
        .filter(particle => particle.life > 0);
    };

    // Draw particles
    const drawParticles = () => {
      particlesRef.current.forEach(particle => {
        const alpha = particle.life / particle.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    };

    // Enhanced grid with parallax effect
    const drawGrid = () => {
      const gridOffset = (animationTime * 20) % 40;
      
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      ctx.setLineDash([10, 10]);

      // Vertical lines with parallax
      for (let x = -gridOffset; x < canvas.width + 40; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      ctx.setLineDash([]);
    };

    // Enhanced plane drawing with glow effects
    const drawPlane = () => {
      // Animate plane position smoothly
      planeY += (targetPlaneY - planeY) * 0.08;
      
      if (phase === 'flying') {
        planeX += 0.5;
        planeRotation = Math.sin(animationTime * 2) * 0.1;
        planeScale = 1 + Math.sin(animationTime * 3) * 0.05;
      } else {
        planeX = 80;
        planeRotation = 0;
        planeScale = 1;
      }

      ctx.save();
      ctx.translate(planeX, planeY);
      ctx.rotate(planeRotation);
      ctx.scale(planeScale, planeScale);

      if (phase === 'crashed') {
        // Enhanced explosion effect
        const explosionRadius = 25 + Math.sin(animationTime * 15) * 8;
        
        // Explosion glow
        const explosionGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, explosionRadius * 2);
        explosionGradient.addColorStop(0, colors.crashGlow);
        explosionGradient.addColorStop(0.5, colors.crash);
        explosionGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = explosionGradient;
        ctx.beginPath();
        ctx.arc(0, 0, explosionRadius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Create explosion particles
        if (Math.random() < 0.3) {
          createParticles(planeX, planeY, 3, colors.crash);
        }
      } else {
        // Enhanced plane with glow effect
        const planeSize = 20;
        
        // Plane glow
        const planeGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, planeSize * 2);
        planeGradient.addColorStop(0, colors.planeGlow);
        planeGradient.addColorStop(0.7, colors.plane);
        planeGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = planeGradient;
        ctx.beginPath();
        ctx.arc(0, 0, planeSize * 2, 0, Math.PI * 2);
        ctx.fill();

        // Main plane body
        ctx.fillStyle = colors.plane;
        ctx.beginPath();
        ctx.moveTo(planeSize, 0);
        ctx.lineTo(-planeSize, -planeSize * 0.6);
        ctx.lineTo(-planeSize * 0.8, 0);
        ctx.lineTo(-planeSize, planeSize * 0.6);
        ctx.closePath();
        ctx.fill();

        // Plane details
        ctx.fillStyle = colors.planeGlow;
        ctx.beginPath();
        ctx.arc(planeSize * 0.3, 0, planeSize * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Create trail particles
        if (phase === 'flying' && Math.random() < 0.5) {
          createParticles(planeX - planeSize, planeY, 1, colors.trail);
        }
      }

      ctx.restore();
    };

    // Enhanced trail drawing
    const drawTrail = () => {
      if (phase === 'flying') {
        // Add new trail point
        trailPoints.push({
          x: planeX - 20,
          y: planeY,
          alpha: 1
        });

        // Remove old trail points
        trailPoints = trailPoints.filter(point => point.alpha > 0);

        // Update trail alpha
        trailPoints.forEach(point => {
          point.alpha -= 0.02;
        });

        // Draw trail with glow effect
        trailPoints.forEach((point, index) => {
          const alpha = point.alpha;
          const size = (index / trailPoints.length) * 8 + 2;

          // Trail glow
          ctx.save();
          ctx.globalAlpha = alpha * 0.3;
          ctx.fillStyle = colors.trailGlow;
          ctx.beginPath();
          ctx.arc(point.x, point.y, size * 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Main trail
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = colors.trail;
          ctx.beginPath();
          ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      } else {
        trailPoints = [];
      }
    };

    // Enhanced multiplier display
    const drawMultiplier = () => {
      const multiplierText = `${multiplier.toFixed(2)}x`;
      const textX = canvas.width / 2;
      const textY = canvas.height / 2 - 30;

      // Text glow effect
      ctx.save();
      ctx.shadowColor = colors.textGlow;
      ctx.shadowBlur = 20;
      ctx.fillStyle = colors.text;
      ctx.font = 'bold 64px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(multiplierText, textX, textY);
      ctx.restore();

      // Animated background for multiplier
      if (phase === 'flying') {
        const pulseSize = 100 + Math.sin(animationTime * 4) * 20;
        const pulseAlpha = 0.1 + Math.sin(animationTime * 4) * 0.05;
        
        ctx.save();
        ctx.globalAlpha = pulseAlpha;
        ctx.fillStyle = colors.trailGlow;
        ctx.beginPath();
        ctx.arc(textX, textY, pulseSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    // Enhanced phase indicator
    const drawPhaseIndicator = () => {
      const textX = canvas.width / 2;
      const textY = canvas.height / 2 + 60;

      let phaseText = '';
      let phaseColor = colors.text;

      switch (phase) {
        case 'betting':
          phaseText = timeLeft ? `Betting ends in ${Math.ceil(timeLeft / 1000)}s` : 'Place your bets!';
          phaseColor = '#fbbf24';
          break;
        case 'flying':
          phaseText = 'Flying...';
          phaseColor = '#10b981';
          break;
        case 'crashed':
          phaseText = 'Crashed!';
          phaseColor = colors.crash;
          break;
        case 'preparing':
          phaseText = 'Preparing next round...';
          phaseColor = '#6b7280';
          break;
      }

      ctx.save();
      ctx.shadowColor = phaseColor;
      ctx.shadowBlur = 10;
      ctx.fillStyle = phaseColor;
      ctx.font = 'bold 28px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(phaseText, textX, textY);
      ctx.restore();
    };

    const animate = () => {
      animationTime += 0.016; // ~60fps

      // Clear canvas with gradient background
      const bgGradient = createGradient(ctx, 0, 0, 0, canvas.height, colors.background, '#1a1a1a');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      updateParticles();
      drawParticles();

      // Draw grid
      drawGrid();

      // Draw trail
      drawTrail();

      // Draw plane
      drawPlane();

      // Draw multiplier
      drawMultiplier();

      // Draw phase indicator
      drawPhaseIndicator();

      // Continue animation
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [multiplier, phase, timeLeft]); // Removed particles from dependencies

  return (
    <Card className="w-full h-full bg-black border-slate-800 overflow-hidden">
      <CardContent className="p-0 h-full relative">
        <canvas 
          ref={canvasRef} 
          className="w-full h-full block"
          style={{ 
            background: 'radial-gradient(ellipse at center, #1a1a1a 0%, #0a0a0a 100%)'
          }}
        />
        
        {/* Overlay effects */}
        <AnimatePresence>
          {phase === 'flying' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at 50% 30%, rgba(16, 185, 129, 0.1) 0%, transparent 70%)'
              }}
            />
          )}
          
          {phase === 'crashed' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at 50% 30%, rgba(239, 68, 68, 0.2) 0%, transparent 70%)'
              }}
            />
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

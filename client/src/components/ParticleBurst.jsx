import React, { useEffect, useRef } from 'react';

export const ParticleBurst = ({ trigger, type = 'emerald' }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!trigger || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const colors = {
      emerald: ['#00f5d4', '#00f2fe', '#ffffff', '#52b788'],
      amber: ['#ffbe0b', '#fb5607', '#ff006e', '#ffea00'],
      crimson: ['#ff0055', '#7209b7', '#f72585', '#b5179e']
    }[type] || ['#00f2fe', '#ffffff'];

    const particles = [];
    const count = type === 'emerald' ? 45 : 30;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 0.02 + Math.random() * 0.02,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2
      });
    }

    let animId;
    const render = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      let alive = false;

      particles.forEach(p => {
        if (p.alpha > 0) {
          alive = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.15; // Gravité
          p.vx *= 0.98; // Friction
          p.alpha -= p.decay;
          p.rotation += p.rotationSpeed;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
          
          // Forme en losange de cristal
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size, 0);
          ctx.lineTo(0, p.size);
          ctx.lineTo(-p.size, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      });

      if (alive) animId = requestAnimationFrame(render);
    };

    render();
    return () => animId && cancelAnimationFrame(animId);
  }, [trigger, type]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        width: '100vw',
        height: '100vh'
      }} 
    />
  );
};

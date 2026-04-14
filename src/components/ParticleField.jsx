import { useEffect, useRef } from 'react';

/**
 * ParticleField – Circular galaxy / vortex that FOLLOWS the cursor.
 *
 *  - Particle cluster is a glowing disc that travels with the mouse
 *  - When no cursor, the disc floats back to canvas center
 *  - Orbital + spiral motion around the moving center
 *  - Pure red/crimson palette, no white
 *  - Mouse repulsion on top of orbital motion (particles scatter then re-orbit)
 *  - Window-level mouse events: works even with pointer-events:none on canvas
 *  - Mobile adaptive: When on mobile (<768px) disable hover/repulsion effects,
 *    enlarge the disc, and add an autonomous, smooth "figure-eight" drift for life.
 */
export default function ParticleField({
  particleCount = 2000,
  colors = ['#CC0000', '#FF2200', '#FF3300', '#FF4400', '#FF5500', '#990000', '#8B0000', '#CC2200'],
  speed = 1,
  discRadius = 0.38,
  orbitSpeed = 0.20,
  spiralDrift = 0.012,
  repulseRadius = 130,
  repulseForce = 8,
  followSpeed = 0.07,
  fadeAlpha = 0.055,
  className = '',
  style = {},
}) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const mouseRef  = useRef({ x: -99999, y: -99999 });
  const propsRef  = useRef({
    particleCount, colors, speed, discRadius, orbitSpeed,
    spiralDrift, repulseRadius, repulseForce, followSpeed, fadeAlpha,
  });

  useEffect(() => {
    propsRef.current = {
      particleCount, colors, speed, discRadius, orbitSpeed,
      spiralDrift, repulseRadius, repulseForce, followSpeed, fadeAlpha,
    };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // ── Navigation State / Helpers ────────────────────────────────────────────
    const isMobile = () => window.innerWidth < 768;

    // ── Canvas size ───────────────────────────────────────────────────────────
    let W = 0, H = 0;
    const resize = () => {
      W = canvas.offsetWidth  || window.innerWidth;
      H = canvas.offsetHeight || window.innerHeight;
      canvas.width  = W;
      canvas.height = H;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement || document.body);

    // ── Disc center (lerps toward mouse; falls back to canvas center) ─────────
    let discX = W / 2;
    let discY = H / 2;

    // ── Flow-angle helper — orbital around arbitrary center ───────────────────
    function flowAngle(px, py, ocx, ocy, t) {
      const dx = px - ocx;
      const dy = py - ocy;
      const base = Math.atan2(dy, dx) + Math.PI / 2;
      const r = Math.sqrt(dx * dx + dy * dy);
      const turbulence =
        Math.sin(r * 0.013 + t * 1.0) * 0.45 +
        Math.cos(dx * 0.010 - t * 0.65) * 0.30 +
        Math.sin(dy * 0.012 + t * 0.85) * 0.25;
      return base + turbulence;
    }

    // ── Particle class ────────────────────────────────────────────────────────
    class Particle {
      constructor() { this.spawn(true); }

      spawn(initial = false) {
        const { colors: cols, discRadius: dr } = propsRef.current;
        // Increase maximum radius spawn area if on mobile
        const maxR = Math.min(W, H) * (isMobile() ? dr * 1.5 : dr);
        const r     = maxR * Math.sqrt(Math.random());
        const angle = Math.random() * Math.PI * 2;
        this.x = discX + Math.cos(angle) * r;
        this.y = discY + Math.sin(angle) * r;
        this.color = cols[Math.floor(Math.random() * cols.length)];
        this.size  = 0.5 + Math.random() * 1.2;
        this.life  = initial ? Math.random() * 250 : 0;
        this.maxLife = 200 + Math.random() * 260;
        this.driftDir = Math.random() < 0.5 ? -1 : 1;
        this.vx = 0;
        this.vy = 0;
        const edgeFade = Math.max(0, 1 - r / maxR);
        this.baseAlpha = (0.35 + Math.random() * 0.55) * (0.25 + edgeFade * 0.75);
        this.alpha = 0;
      }

      update(t, mobile) {
        const {
          speed: spd, orbitSpeed: os, spiralDrift: sd,
          repulseRadius: rr, repulseForce: rf,
          discRadius: dr,
        } = propsRef.current;
        this.life++;

        const maxR = Math.min(W, H) * (mobile ? dr * 1.5 : dr);

        const angle = flowAngle(this.x, this.y, discX, discY, t);
        const v = (0.45 + Math.random() * 0.3) * spd * os;
        this.vx = this.vx * 0.88 + Math.cos(angle) * v * 0.12;
        this.vy = this.vy * 0.88 + Math.sin(angle) * v * 0.12;

        const rdx = this.x - discX;
        const rdy = this.y - discY;
        const rLen = Math.sqrt(rdx * rdx + rdy * rdy) || 0.001;
        const targetR = maxR * 0.5;
        const spring  = (rLen - targetR) / maxR * sd * spd * (this.driftDir * 0.4 + 0.6);
        this.vx -= (rdx / rLen) * spring;
        this.vy -= (rdy / rLen) * spring;

        // Apply mouse repulsion only if we are NOT on mobile
        if (!mobile) {
            const mx = mouseRef.current.x;
            const my = mouseRef.current.y;
            if (mx !== -99999) {
            const mdx  = this.x - mx;
            const mdy  = this.y - my;
            const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (mDist < rr && mDist > 0.5) {
                const force = (rr - mDist) / rr;
                this.vx += (mdx / mDist) * force * rf * 0.16;
                this.vy += (mdy / mDist) * force * rf * 0.16;
            }
            }
        }

        this.x += this.vx;
        this.y += this.vy;

        const curDist  = Math.sqrt((this.x - discX) ** 2 + (this.y - discY) ** 2);
        const edgeFade = Math.max(0, 1 - curDist / maxR);
        const progress = this.life / this.maxLife;
        const lifeFade =
          progress < 0.08 ? progress / 0.08 :
          progress > 0.82 ? (1 - progress) / 0.18 : 1;
        this.alpha = this.baseAlpha * lifeFade * (0.15 + edgeFade * 0.85);

        if (this.life >= this.maxLife || curDist > maxR * 1.3) {
          this.spawn();
        }
      }

      draw() {
        ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));
        ctx.fillStyle   = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    let particles = Array.from(
      { length: propsRef.current.particleCount },
      () => new Particle()
    );

    // ── Window-level mouse & touch tracking ───────────────────────────────────
    const onMouseMove = (e) => {
      if (isMobile()) return; // Ignorar movimiento en móvil
      const rect = canvas.getBoundingClientRect();
      if (
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top  && e.clientY <= rect.bottom
      ) {
        mouseRef.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
      } else {
        mouseRef.current = { x: -99999, y: -99999 };
      }
    };
    const onMouseLeave = () => { mouseRef.current = { x: -99999, y: -99999 }; };
    const onTouchMove = () => {
        if(isMobile()) mouseRef.current = { x: -99999, y: -99999 };
    }
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('touchmove', onTouchMove);

    // ── Render loop ───────────────────────────────────────────────────────────
    let t = 0;
    const loop = () => {
      const { fadeAlpha: fa, particleCount: pc, followSpeed: fs, discRadius: dr } = propsRef.current;
      const mobile = isMobile();

      // Determine Target for Disc Center
      let targetX = W / 2;
      let targetY = H / 2;

      if (!mobile && mouseRef.current.x !== -99999) {
          targetX = mouseRef.current.x;
          targetY = mouseRef.current.y;
      } else if (mobile) {
          // Autonomous subtle "figure-eight" drift for mobile sizes
          targetX = W / 2 + Math.cos(t * 0.4) * W * 0.15;
          targetY = H / 2 + Math.sin(t * 0.6) * H * 0.08;
      }

      // Lerp disc center toward target
      discX += (targetX - discX) * fs;
      discY += (targetY - discY) * fs;

      const maxR = Math.min(W, H) * (mobile ? dr * 1.5 : dr);

      // Pool management
      while (particles.length < pc) particles.push(new Particle());
      if (particles.length > pc) particles.length = pc;

      // Trail fade
      ctx.globalAlpha = fa;
      ctx.fillStyle   = '#000000';
      ctx.fillRect(0, 0, W, H);

      // Particles
      ctx.globalAlpha = 1;
      for (let i = 0; i < particles.length; i++) {
        particles[i].update(t, mobile);
        particles[i].draw();
      }

      // Inner disc vignette
      const innerGrad = ctx.createRadialGradient(discX, discY, maxR * 0.5, discX, discY, maxR * 1.1);
      innerGrad.addColorStop(0, 'rgba(0,0,0,0)');
      innerGrad.addColorStop(1, 'rgba(0,0,0,0.88)');
      ctx.globalAlpha = 1;
      ctx.fillStyle   = innerGrad;
      ctx.fillRect(0, 0, W, H);

      // Outer vignette (exterior stays pure black)
      const outerGrad = ctx.createRadialGradient(discX, discY, maxR * 1.05, discX, discY, maxR * 1.6);
      outerGrad.addColorStop(0, 'rgba(0,0,0,0)');
      outerGrad.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = outerGrad;
      ctx.fillRect(0, 0, W, H);

      t += 0.0025;
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
    />
  );
}

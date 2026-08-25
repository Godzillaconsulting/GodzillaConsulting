import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';

export default function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);
  const elementsRef = useRef([]);
  const rafRef = useRef(null);

  const { pathname } = useLocation();
  const hiddenRoutes = ['/admin', '/cm', '/studio', '/login', '/dashboard', '/godzilla-sora'];

  useEffect(() => {
    // Disable entirely for touch devices or admin/hidden routes
    if (
      window.matchMedia('(pointer: coarse)').matches ||
      hiddenRoutes.some((route) => pathname.startsWith(route))
    ) {
      return;
    }

    let lastX = 0, lastY = 0;

    const moveBox = (e) => {
      lastX = e.clientX;
      lastY = e.clientY;

      if (rafRef.current) return; // Throttle to 1 rAF
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (!isVisible) setIsVisible(true);

        elementsRef.current.forEach((el, index) => {
          if (el) {
            gsap.to(el, {
              duration: 0.05,
              x: lastX,
              y: lastY,
              delay: index / 750,
              overwrite: "auto",
              ease: "none"
            });
          }
        });
      });
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    gsap.set(elementsRef.current, { autoAlpha: 1 });

    window.addEventListener('mousemove', moveBox, { passive: true });
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', moveBox);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      gsap.killTweensOf(elementsRef.current);
    };
  }, [pathname]); // Solo re-bind cuando cambia la ruta, no en cada isVisible toggle

  if (
    typeof window !== 'undefined' &&
    (window.matchMedia('(pointer: coarse)').matches || hiddenRoutes.some((route) => pathname.startsWith(route)))
  ) {
    return null;
  }

  // 8 trailing boxes instead of 30 (visually identical comet tail, 73% fewer GSAP tweens)
  const boxes = Array.from({ length: 8 });

  return (
    <div className={`fixed inset-0 pointer-events-none z-[99999] transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <style>{`
        @media (pointer: fine) {
          body, a, button, h1, h2, h3, h4, p, div, span, img, svg {
            cursor: none !important;
          }
          input, textarea, [contenteditable="true"] {
            cursor: text !important;
          }
        }
      `}</style>

      {/* Trailing blur elements — reduced from 30 to 8 */}
      {boxes.map((_, i) => (
        <div
          key={i}
          ref={(el) => (elementsRef.current[i + 1] = el)}
          className="absolute top-0 left-0 w-[25px] h-[25px] rounded-full mix-blend-screen bg-[#CC0000]/20 pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{ willChange: 'transform' }}
        />
      ))}

      {/* Core solid pointer */}
      <div
        ref={(el) => (elementsRef.current[0] = el)}
        className="absolute top-0 left-0 w-3 h-3 bg-[#CC0000] border border-white/60 shadow-[0_0_8px_rgba(255,255,255,0.4)] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"
        style={{ willChange: 'transform', zIndex: 10 }}
      />
    </div>
  );
}


import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';

export default function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);
  const elementsRef = useRef([]);

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

    const moveBox = (e) => {
      if (!isVisible) setIsVisible(true);

      // Tween each box mimicking the CodePen "TweenMax motion blur"
      elementsRef.current.forEach((el, index) => {
        if (el) {
          gsap.to(el, {
            duration: 0.05,
            x: e.clientX,
            y: e.clientY,
            delay: index / 750,
            overwrite: "auto",
            ease: "none"
          });
        }
      });
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    // Make elements visible immediately to avoid flash of invisible items
    gsap.set(elementsRef.current, { autoAlpha: 1 });

    window.addEventListener('mousemove', moveBox);
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', moveBox);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      gsap.killTweensOf(elementsRef.current);
    };
  }, [isVisible, pathname]);

  if (
    typeof window !== 'undefined' &&
    (window.matchMedia('(pointer: coarse)').matches || hiddenRoutes.some((route) => pathname.startsWith(route)))
  ) {
    return null;
  }

  // Generate 30 layered boxes for the blur tail, plus 1 solid core dot at the very end
  const boxes = Array.from({ length: 30 });

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

      {/* Trailing blur elements */}
      {boxes.map((_, i) => (
        <div
          key={i}
          ref={(el) => (elementsRef.current[i + 1] = el)}
          className="absolute top-0 left-0 w-[25px] h-[25px] rounded-full mix-blend-screen bg-[#CC0000]/20 pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{ willChange: 'transform' }}
        />
      ))}

      {/* Core solid pointer (Index 0 gets 0 delay, so it leads the comet) */}
      <div
        ref={(el) => (elementsRef.current[0] = el)}
        className="absolute top-0 left-0 w-3 h-3 bg-[#CC0000] border border-white/60 shadow-[0_0_8px_rgba(255,255,255,0.4)] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"
        style={{ willChange: 'transform', zIndex: 10 }}
      />
    </div>
  );
}

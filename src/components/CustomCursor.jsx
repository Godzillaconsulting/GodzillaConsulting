import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export default function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Mouse positions
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  // Spring animation for trailing outer ring
  const springConfig = { damping: 25, stiffness: 400, mass: 0.5 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    // Only logic for non-touch devices
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const moveCursor = (e) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseOver = (e) => {
      const target = e.target;
      const computedStyle = window.getComputedStyle(target);
      // Check if entering a clickable element
      const isClickable = 
        target.closest('a') || 
        target.closest('button') || 
        target.closest('[role="button"]') || 
        computedStyle.cursor === 'pointer';
      
      setIsHovering(!!isClickable);

      // Restore text cursors over inputs naturally
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        computedStyle.cursor === 'text'
      ) {
        setIsVisible(false); // Hide custom cursor temporarily so beam cursor natively works
      } else {
        setIsVisible(true);
      }
    };

    const handleMouseLeaveViewport = () => {
      setIsVisible(false);
    };

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mouseover', handleMouseOver);
    document.documentElement.addEventListener('mouseleave', handleMouseLeaveViewport);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mouseover', handleMouseOver);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeaveViewport);
    };
  }, [cursorX, cursorY, isVisible]);

  const { pathname } = useLocation();
  const hiddenRoutes = ['/admin', '/cm', '/studio', '/login', '/dashboard', '/godzilla-sora'];

  // If touch device, SSR, or inside an admin/system route, render nothing (revert to native cursor)
  if (
    (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) ||
    hiddenRoutes.some(route => pathname.startsWith(route))
  ) {
    return null;
  }

  return (
    <>
      <style>{`
        @media (pointer: fine) {
          /* Hide default cursor on most elements to replace it with ours */
          body, a, button, h1, h2, h3, h4, p, div, span, img, svg {
            cursor: none !important;
          }
          /* Allow native pointers for text inputs to avoid confusion */
          input, textarea, [contenteditable="true"] {
            cursor: text !important;
          }
        }
      `}</style>

      {/* Main Red Dot (Instant) */}
      <motion.div
        style={{
          x: cursorX,
          y: cursorY,
          opacity: isVisible ? 1 : 0
        }}
        className="fixed top-0 left-0 w-3 h-3 bg-[#CC0000] border-[1px] border-white/60 shadow-[0_0_8px_rgba(255,255,255,0.4)] rounded-full pointer-events-none z-[99999] -translate-x-1/2 -translate-y-1/2"
      />

      {/* Cinematic Motion Blur Trail (Delayed Spring) */}
      <motion.div
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          opacity: isVisible ? 1 : 0,
        }}
        animate={{
          width: isHovering ? 60 : 36,
          height: isHovering ? 60 : 36,
          backgroundColor: isHovering ? 'rgba(204, 0, 0, 0.4)' : 'rgba(204, 0, 0, 0.6)',
        }}
        transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
        className="fixed top-0 left-0 pointer-events-none z-[99998] rounded-full blur-[5px] mix-blend-screen -translate-x-1/2 -translate-y-1/2"
      />
    </>
  );
}

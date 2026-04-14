import React, { useEffect, useState } from 'react';
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

  // If touch device or SSR, render nothing
  if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
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
        className="fixed top-0 left-0 w-2.5 h-2.5 bg-[#CC0000] rounded-full pointer-events-none z-[99999] -translate-x-1/2 -translate-y-1/2"
      />

      {/* Trailing Outline Ring (Delayed Spring) */}
      <motion.div
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          opacity: isVisible ? 1 : 0,
        }}
        animate={{
          width: isHovering ? 48 : 32,
          height: isHovering ? 48 : 32,
          backgroundColor: isHovering ? 'rgba(204, 0, 0, 0.15)' : 'rgba(204, 0, 0, 0)',
          borderColor: isHovering ? 'rgba(204, 0, 0, 0)' : 'rgba(204, 0, 0, 0.5)'
        }}
        transition={{ type: "tween", duration: 0.15, ease: "easeOut" }}
        className="fixed top-0 left-0 pointer-events-none z-[99999] rounded-full border border-[#CC0000] -translate-x-1/2 -translate-y-1/2"
      />
    </>
  );
}

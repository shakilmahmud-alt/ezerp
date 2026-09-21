import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * TopLoadingBar Component
 * Displays a sleek, YouTube/Next.js-style top progress bar with emerald glow
 * whenever navigating between pages across all modules in the ERP.
 */
const TopLoadingBar = () => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);
  const finishTimerRef = useRef(null);
  const prevPathRef = useRef(location.pathname + location.search);

  useEffect(() => {
    const currentPath = location.pathname + location.search;
    
    // Trigger on route navigation
    if (prevPathRef.current !== currentPath) {
      prevPathRef.current = currentPath;
      
      // Reset scroll position to top
      window.scrollTo(0, 0);

      // Start loading animation
      if (timerRef.current) clearInterval(timerRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);

      setVisible(true);
      setProgress(25);

      // Increment progress to simulate page load
      timerRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev < 70) return prev + Math.random() * 20;
          if (prev < 90) return prev + Math.random() * 8;
          return prev;
        });
      }, 100);

      // Complete progress bar
      finishTimerRef.current = setTimeout(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setProgress(100);

        // Fade out
        setTimeout(() => {
          setVisible(false);
          setTimeout(() => {
            setProgress(0);
          }, 300);
        }, 250);
      }, 350);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    };
  }, [location.pathname, location.search]);

  if (!visible && progress === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        zIndex: 999999,
        pointerEvents: 'none',
        backgroundColor: 'transparent'
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #2e6f40, #10b981, #34d399, #6ee7b7)',
          boxShadow: '0 0 10px #10b981, 0 0 5px #2e6f40',
          transition: progress === 100 ? 'width 0.2s ease-out, opacity 0.3s ease' : 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: visible ? 1 : 0,
          position: 'relative'
        }}
      >
        {/* Glow peg at front */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '100px',
            boxShadow: '0 0 12px #34d399, 0 0 6px #10b981',
            opacity: 1,
            transform: 'rotate(3deg) translate(0px, -4px)'
          }}
        />
      </div>
    </div>
  );
};

export default TopLoadingBar;

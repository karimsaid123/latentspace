'use client';

import React, { useEffect, useRef, useState } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  yOffset?: number;
  threshold?: number;
  parallaxSpeed?: number;
}

export default function ScrollReveal({
  children,
  className = '',
  delayMs = 0,
  yOffset = 45,
  threshold = 0.08,
  parallaxSpeed = 0,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [parallaxY, setParallaxY] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  // Subtle continuous scroll parallax
  useEffect(() => {
    if (parallaxSpeed === 0) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            // Center of element relative to viewport center
            const centerOffset = rect.top + rect.height / 2 - windowHeight / 2;
            setParallaxY(centerOffset * parallaxSpeed);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [parallaxSpeed]);

  const currentY = isVisible ? parallaxY : yOffset;

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: `translate3d(0, ${currentY}px, 0)`,
        transitionDelay: `${delayMs}ms`,
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </div>
  );
}

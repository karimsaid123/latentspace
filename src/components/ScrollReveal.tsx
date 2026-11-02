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

interface SharedObserverPool {
  observer: IntersectionObserver;
  callbacks: Map<Element, () => void>;
}

const observerPools = new Map<number, SharedObserverPool>();

function observeOnce(el: Element, threshold: number, onEnter: () => void): () => void {
  let pool = observerPools.get(threshold);
  if (!pool) {
    const callbacks = new Map<Element, () => void>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cb = callbacks.get(entry.target);
            if (cb) {
              callbacks.delete(entry.target);
              observer.unobserve(entry.target);
              cb();
            }
          }
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -40px 0px',
      }
    );
    pool = { observer, callbacks };
    observerPools.set(threshold, pool);
  }

  pool.callbacks.set(el, onEnter);
  pool.observer.observe(el);

  return () => {
    const activePool = observerPools.get(threshold);
    if (!activePool) return;
    activePool.callbacks.delete(el);
    activePool.observer.unobserve(el);
    if (activePool.callbacks.size === 0) {
      activePool.observer.disconnect();
      observerPools.delete(threshold);
    }
  };
}

export default function ScrollReveal({
  children,
  className = '',
  delayMs = 0,
  yOffset = 45,
  threshold = 0.08,
  parallaxSpeed = 0,
}: ScrollRevealProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [revealDone, setRevealDone] = useState(false);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    if (
      typeof window !== 'undefined' &&
      (typeof IntersectionObserver === 'undefined' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    ) {
      setIsVisible(true);
      setRevealDone(true);
      return;
    }

    return observeOnce(el, threshold, () => {
      setIsVisible(true);
    });
  }, [threshold]);

  // Direct DOM parallax without React state re-renders or CSS transition thrashing
  useEffect(() => {
    if (parallaxSpeed === 0) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    let rafId: number | null = null;
    const updateParallax = () => {
      rafId = null;
      const outer = outerRef.current;
      const inner = parallaxRef.current;
      if (!outer || !inner) return;

      const rect = outer.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      if (rect.bottom < -100 || rect.top > windowHeight + 100) return;

      const centerOffset = rect.top + rect.height / 2 - windowHeight / 2;
      const y = (centerOffset * parallaxSpeed).toFixed(2);
      inner.style.transform = `translate3d(0, ${y}px, 0)`;
    };

    const handleScroll = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(updateParallax);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    updateParallax();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [parallaxSpeed]);

  return (
    <div
      ref={outerRef}
      onTransitionEnd={() => setRevealDone(true)}
      className={`transition-[opacity,transform] duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translate3d(0, 0, 0)' : `translate3d(0, ${yOffset}px, 0)`,
        transitionDelay: `${delayMs}ms`,
        willChange: revealDone ? 'auto' : 'transform, opacity',
      }}
    >
      {parallaxSpeed !== 0 ? (
        <div ref={parallaxRef} style={{ willChange: 'transform' }}>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SmartIconGuideProps {
  guideKey: string;
  title: string;
  description?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

interface CoordsState {
  top: number;
  left: number;
  arrowX: number;
  arrowY: number;
  effectivePosition: 'top' | 'bottom' | 'left' | 'right';
  ready: boolean;
}

export const SmartIconGuide: React.FC<SmartIconGuideProps> = ({
  guideKey,
  title,
  description,
  position = 'top',
  children,
  disabled = false,
  className,
}) => {
  const STORAGE_KEY = `alturath_guided_${guideKey}`;

  const [hasLearned, setHasLearned] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return false;
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<CoordsState>({
    top: 0,
    left: 0,
    arrowX: 0,
    arrowY: 0,
    effectivePosition: position,
    ready: false,
  });

  // Calculate position with viewport bounds safety (12px GUTTER) and portal positioning
  const updatePosition = () => {
    if (!containerRef.current) return;

    const targetRect = containerRef.current.getBoundingClientRect();
    if (targetRect.width === 0 && targetRect.height === 0) return;

    const vw = typeof window !== 'undefined' ? window.innerWidth || document.documentElement.clientWidth : 375;
    const vh = typeof window !== 'undefined' ? window.innerHeight || document.documentElement.clientHeight : 667;
    const GUTTER = 12;

    const tooltipEl = tooltipRef.current;
    const tooltipWidth = tooltipEl ? tooltipEl.offsetWidth : 190;
    const tooltipHeight = tooltipEl ? tooltipEl.offsetHeight : 70;

    let effectivePos = position;

    // Flip vertical position if there isn't enough space
    if (effectivePos === 'top' && targetRect.top - tooltipHeight - 10 < GUTTER) {
      effectivePos = 'bottom';
    } else if (effectivePos === 'bottom' && targetRect.bottom + tooltipHeight + 10 > vh - GUTTER) {
      effectivePos = 'top';
    }

    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    let boxLeft = 0;
    let boxTop = 0;
    let arrowX = 0;
    let arrowY = 0;

    if (effectivePos === 'top' || effectivePos === 'bottom') {
      const idealLeft = targetCenterX - tooltipWidth / 2;
      boxLeft = Math.max(GUTTER, Math.min(idealLeft, vw - GUTTER - tooltipWidth));

      if (effectivePos === 'top') {
        boxTop = targetRect.top - 10 - tooltipHeight;
      } else {
        boxTop = targetRect.bottom + 10;
      }

      // Clamp boxTop to viewport
      boxTop = Math.max(GUTTER, Math.min(boxTop, vh - GUTTER - tooltipHeight));

      const relX = targetCenterX - boxLeft;
      const minArrowX = 16;
      const maxArrowX = tooltipWidth - 16;
      arrowX = Math.max(minArrowX, Math.min(relX, maxArrowX));
    } else {
      const idealTop = targetCenterY - tooltipHeight / 2;
      boxTop = Math.max(GUTTER, Math.min(idealTop, vh - GUTTER - tooltipHeight));

      if (effectivePos === 'left') {
        boxLeft = targetRect.left - 10 - tooltipWidth;
      } else {
        boxLeft = targetRect.right + 10;
      }

      boxLeft = Math.max(GUTTER, Math.min(boxLeft, vw - GUTTER - tooltipWidth));

      const relY = targetCenterY - boxTop;
      const minArrowY = 16;
      const maxArrowY = tooltipHeight - 16;
      arrowY = Math.max(minArrowY, Math.min(relY, maxArrowY));
    }

    setCoords({
      top: boxTop,
      left: boxLeft,
      arrowX,
      arrowY,
      effectivePosition: effectivePos,
      ready: true,
    });
  };

  useLayoutEffect(() => {
    if (!showTooltip) return;

    updatePosition();

    // Re-run after next frame so actual DOM measurements are accurate
    const raf = requestAnimationFrame(() => {
      updatePosition();
    });

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
    };
  }, [showTooltip, position]);

  // Close on outside touch or click
  useEffect(() => {
    if (!showTooltip) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const targetNode = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(targetNode) &&
        tooltipRef.current && !tooltipRef.current.contains(targetNode)
      ) {
        setShowTooltip(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showTooltip]);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClickCapture = (e: React.MouseEvent) => {
    if (disabled) return;

    const isTouch = Boolean(
      (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
      (typeof window !== 'undefined' && 'ontouchstart' in window)
    );

    if (isTouch && !hasLearned) {
      e.preventDefault();
      e.stopPropagation();

      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch {}

      setHasLearned(true);
      setShowTooltip(true);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setShowTooltip(false);
      }, 3500);
    } else {
      if (showTooltip) {
        setShowTooltip(false);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-flex items-center justify-center', className)}
      onClickCapture={handleClickCapture}
    >
      {children}

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              ref={tooltipRef}
              initial={{ opacity: 0, scale: 0.88, y: coords.effectivePosition === 'top' ? 4 : coords.effectivePosition === 'bottom' ? -4 : 0 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                zIndex: 99999,
                visibility: coords.ready ? 'visible' : 'hidden',
              }}
              className="pointer-events-none min-w-[150px] max-w-[220px] p-2.5 rounded-2xl bg-slate-900/95 text-white shadow-2xl shadow-slate-950/60 border border-amber-400/35 backdrop-blur-md dir-rtl select-none"
              dir="rtl"
            >
              {/* Tooltip Content */}
              <div className="flex items-start gap-2">
                <div className="p-1 rounded-lg bg-amber-500/20 text-amber-300 shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col gap-0.5 text-right">
                  <span className="text-[11px] font-black text-amber-200 leading-tight">
                    {title}
                  </span>
                  {description && (
                    <span className="text-[10px] font-bold text-slate-300 leading-snug">
                      {description}
                    </span>
                  )}
                  <span className="text-[9px] font-semibold text-emerald-400 mt-1 block">
                    💡 اضغط مرة أخرى للتنفيذ
                  </span>
                </div>
              </div>

              {/* Precise Arrow SVG pointing directly to target center */}
              {(coords.effectivePosition === 'top' || coords.effectivePosition === 'bottom') && (
                <svg
                  width="12"
                  height="6"
                  viewBox="0 0 12 6"
                  className="absolute text-slate-900/95 fill-current"
                  style={{
                    left: `${coords.arrowX}px`,
                    top: coords.effectivePosition === 'bottom' ? '-6px' : 'auto',
                    bottom: coords.effectivePosition === 'top' ? '-6px' : 'auto',
                    transform: coords.effectivePosition === 'bottom' ? 'translateX(-50%) rotate(180deg)' : 'translateX(-50%)',
                  }}
                >
                  <path d="M0 0 L6 6 L12 0 Z" />
                </svg>
              )}

              {(coords.effectivePosition === 'left' || coords.effectivePosition === 'right') && (
                <svg
                  width="6"
                  height="12"
                  viewBox="0 0 6 12"
                  className="absolute text-slate-900/95 fill-current"
                  style={{
                    top: `${coords.arrowY}px`,
                    left: coords.effectivePosition === 'right' ? '-6px' : 'auto',
                    right: coords.effectivePosition === 'left' ? '-6px' : 'auto',
                    transform: coords.effectivePosition === 'right' ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
                  }}
                >
                  <path d="M0 0 L6 6 L0 12 Z" />
                </svg>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default SmartIconGuide;

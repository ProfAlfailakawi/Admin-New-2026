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
  const [coords, setCoords] = useState<{
    tooltipLeft: number;
    tooltipTop: number;
    arrowLeft: number;
    placement: 'top' | 'bottom';
  }>({
    tooltipLeft: 0,
    tooltipTop: 0,
    arrowLeft: 0,
    placement: 'top',
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const GUTTER = 12;

    const tooltipWidth = tooltipRef.current ? tooltipRef.current.offsetWidth : 190;
    const tooltipHeight = tooltipRef.current ? tooltipRef.current.offsetHeight : 75;

    const targetCenterX = rect.left + rect.width / 2;

    // Determine placement (flip if space is constrained)
    let finalPlacement: 'top' | 'bottom' = position === 'bottom' ? 'bottom' : 'top';
    if (position === 'top' && rect.top - tooltipHeight - GUTTER < 0) {
      finalPlacement = 'bottom';
    } else if (position === 'bottom' && rect.bottom + tooltipHeight + GUTTER > viewportHeight) {
      finalPlacement = 'top';
    }

    // Top calculation
    let top = 0;
    if (finalPlacement === 'top') {
      top = rect.top - tooltipHeight - 8;
    } else {
      top = rect.bottom + 8;
    }

    // Clamp top position within viewport
    top = Math.max(GUTTER, Math.min(viewportHeight - tooltipHeight - GUTTER, top));

    // Left calculation
    let left = targetCenterX - tooltipWidth / 2;
    const maxLeft = Math.max(GUTTER, viewportWidth - tooltipWidth - GUTTER);
    left = Math.max(GUTTER, Math.min(maxLeft, left));

    // Arrow offset relative to tooltip box left edge
    let arrowLeft = targetCenterX - left;
    // Keep arrow inside rounded corners padding (~16px from edges)
    arrowLeft = Math.max(16, Math.min(tooltipWidth - 16, arrowLeft));

    setCoords({
      tooltipLeft: left,
      tooltipTop: top,
      arrowLeft,
      placement: finalPlacement,
    });
  };

  useLayoutEffect(() => {
    if (showTooltip) {
      updatePosition();
    }
  }, [showTooltip]);

  useEffect(() => {
    if (!showTooltip) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        tooltipRef.current && !tooltipRef.current.contains(e.target as Node)
      ) {
        setShowTooltip(false);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showTooltip]);

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

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                ref={tooltipRef}
                initial={{ opacity: 0, scale: 0.88, y: coords.placement === 'top' ? 4 : -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                style={{
                  position: 'fixed',
                  left: `${coords.tooltipLeft}px`,
                  top: `${coords.tooltipTop}px`,
                }}
                className={cn(
                  'z-[99999] pointer-events-auto min-w-[150px] max-w-[240px] p-2.5 rounded-2xl bg-slate-900/95 text-white shadow-2xl shadow-slate-950/60 border border-amber-400/30 backdrop-blur-md dir-rtl'
                )}
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

                {/* Pointer Arrow */}
                <div
                  className={cn(
                    'absolute w-0 h-0 border-x-transparent border-x-4',
                    coords.placement === 'top'
                      ? 'top-full border-t-slate-900 border-b-0 border-t-4'
                      : 'bottom-full border-b-slate-900 border-t-0 border-b-4'
                  )}
                  style={{
                    left: `${coords.arrowLeft}px`,
                    transform: 'translateX(-50%)',
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

export default SmartIconGuide;

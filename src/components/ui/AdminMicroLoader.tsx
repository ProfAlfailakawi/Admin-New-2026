import React, { useEffect, useState } from 'react';

/**
 * AdminMicroLoader — branded micro loader for the admin panel.
 *
 * Five small pieces (orders / kitchen / payment / delivery / customers)
 * assemble ONCE into a mini dashboard (header bar + sidebar + tiles),
 * then rest with a very calm opacity pulse. No re-scatter loop.
 *
 * - CSS-driven (transform + opacity only), keyframes live in index.css.
 * - `size` in px: 16-20 buttons, 24-32 cards, 32-48 panels (max 64).
 * - Delayed appearance (default 250ms) so fast operations never flash it.
 * - prefers-reduced-motion: assembled shape + gentle opacity pulse only
 *   (handled in CSS).
 * - role="status" + sr-only label; not focusable.
 */

export const useDelayedVisible = (delay = 250) => {
  const [visible, setVisible] = useState(delay <= 0);
  useEffect(() => {
    if (delay <= 0) return;
    const t = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(t);
  }, [delay]);
  return visible;
};

interface AdminMicroLoaderProps {
  size?: number;
  label?: string;
  /** ms before the loader becomes visible; 0 = immediate */
  appearDelay?: number;
  className?: string;
}

const AdminMicroLoader: React.FC<AdminMicroLoaderProps> = ({
  size = 44,
  label = 'جاري التحميل',
  appearDelay = 250,
  className = '',
}) => {
  const visible = useDelayedVisible(appearDelay);

  return (
    <span
      role="status"
      aria-hidden={!visible}
      className={`aml-root ${visible ? 'aml-visible' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="sr-only">{label}</span>
      <span className="aml-stage" aria-hidden="true">
        {/* dashboard frame snaps in after the pieces land */}
        <span className="aml-frame" />
        {/* five pieces: orders / kitchen / payment / delivery / customers */}
        <span className="aml-piece aml-p1" />
        <span className="aml-piece aml-p2" />
        <span className="aml-piece aml-p3" />
        <span className="aml-piece aml-p4" />
        <span className="aml-piece aml-p5" />
      </span>
    </span>
  );
};

export default AdminMicroLoader;

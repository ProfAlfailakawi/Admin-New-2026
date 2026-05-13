import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { cn } from '../../lib/utils';

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  intensity?: number;
  magneticRadius?: number;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({ 
  children, 
  className, 
  intensity = 0.5,
  magneticRadius = 150,
  ...props 
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;
    
    x.set(distanceX * intensity);
    y.set(distanceY * intensity);
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };
  
  const handlePointerEnter = () => {
    setIsHovered(true);
  };

  return (
    <motion.button
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerEnter={handlePointerEnter}
      style={{
        x: springX,
        y: springY,
      }}
      whileTap={{ scale: 0.95 }}
      animate={{
        scale: isHovered ? 1.05 : 1
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "relative transition-colors duration-300",
        className
      )}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
};

import React, { useRef, useState } from 'react';
import { motion, useSpring } from 'motion/react';
import { cn } from '../../lib/utils';

interface SpatialGlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string; // e.g., 'rgba(16, 185, 129, 0.15)'
  intensity?: number;
}

export const SpatialGlassCard: React.FC<SpatialGlassCardProps> = ({ 
  children, 
  className, 
  glowColor = 'rgba(16, 185, 129, 0.15)', 
  intensity = 0.15 
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Smooth physics spring responses for genuine 3D hover reactive tilting angles
  const rotateX = useSpring(0, { stiffness: 125, damping: 20 });
  const rotateY = useSpring(0, { stiffness: 125, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCoords({ x, y });

    // Normalize coordinates from -0.5 to 0.5 for tilt values
    const normX = (x / rect.width) - 0.5;
    const normY = (y / rect.height) - 0.5;

    // Elegant 3D tilting (limited within 5 degrees maximum)
    rotateX.set(-normY * 5); 
    rotateY.set(normX * 5);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: "preserve-3d",
        rotateX: rotateX,
        rotateY: rotateY,
        perspective: 1000,
      }}
      className={cn(
        "relative rounded-2xl md:rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-300",
        className
      )}
    >
      {/* Gloss overlay that tracks the cursor coordinates exactly (Dynamic Lighting) */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(circle 140px at ${coords.x}px ${coords.y}px, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0) 80%)`,
          mixBlendMode: 'overlay',
          zIndex: 10,
        }}
      />

      {/* Dynamic light refraction aura that shifts behind/on the glass container */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          opacity: isHovered ? 0.95 : 0,
          background: `radial-gradient(circle 160px at ${coords.x}px ${coords.y}px, ${glowColor}, transparent 80%)`,
          zIndex: 1,
        }}
      />
      
      {/* High-end glass bevel/top rim lighting effect */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none z-10" />

      {/* Layer to elevate the content visually forward from the reflection mask */}
      <div className="relative z-10 h-full w-full" style={{ transform: "translateZ(10px)" }}>
        {children}
      </div>
    </motion.div>
  );
};

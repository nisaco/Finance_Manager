import React, { useState, useRef, useCallback } from 'react';

interface AppleCard3DProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // max tilt angle in degrees (default 3.5)
  showSpecular?: boolean;
}

export const AppleCard3D: React.FC<AppleCard3DProps> = ({
  children,
  className = '',
  maxTilt = 3.5,
  showSpecular = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState<string>('');
  const [specularPos, setSpecularPos] = useState<{ x: number; y: number; opacity: number }>({
    x: 50,
    y: 50,
    opacity: 0,
  });
  const [isInteracting, setIsInteracting] = useState<boolean>(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calculate tilt angles
      const rotateX = ((y - centerY) / centerY) * -maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;

      const posX = (x / rect.width) * 100;
      const posY = (y / rect.height) * 100;

      setIsInteracting(true);
      setTransformStyle(
        `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(
          2
        )}deg) scale3d(1.008, 1.008, 1.008)`
      );
      setSpecularPos({ x: posX, y: posY, opacity: 0.15 });
    },
    [maxTilt]
  );

  const handleMouseLeave = useCallback(() => {
    setIsInteracting(false);
    setTransformStyle('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setSpecularPos((prev) => ({ ...prev, opacity: 0 }));
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transformStyle,
        transition: isInteracting
          ? 'transform 0.1s ease-out'
          : 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      }}
      className={`relative overflow-hidden rounded-[18px] select-none ${className}`}
    >
      {children}

      {/* Layered Specular Reflection Sheen (Apple Card light dynamics) */}
      {showSpecular && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 z-20"
          style={{
            opacity: specularPos.opacity,
            background: `radial-gradient(circle at ${specularPos.x}% ${specularPos.y}%, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.05) 45%, transparent 70%)`,
          }}
        />
      )}
    </div>
  );
};


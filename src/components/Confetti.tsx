import React, { useMemo } from 'react';

const COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#a855f7', '#ec4899', '#f97316'];
const PIECE_COUNT = 48;

export const Confetti: React.FC = () => {
  const pieces = useMemo(() =>
    Array.from({ length: PIECE_COUNT }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: COLORS[i % COLORS.length],
      size: `${6 + Math.random() * 8}px`,
      duration: `${2.2 + Math.random() * 2}s`,
      delay: `${Math.random() * 1.8}s`,
      borderRadius: Math.random() > 0.5 ? '50%' : '2px',
    })), []
  );

  return (
    <div className="confetti-container" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            borderRadius: p.borderRadius,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
};

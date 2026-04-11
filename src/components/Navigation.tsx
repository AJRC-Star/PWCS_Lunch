import React, { useEffect, useState } from 'react';

interface Props {
  totalDays: number;
  containerRef: React.RefObject<HTMLDivElement>;
}

export const Navigation: React.FC<Props> = ({ totalDays, containerRef }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const cards = container.querySelectorAll('.day-card');
      let idx = 0;
      const probe = container.scrollTop + 12;

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i] as HTMLElement;
        if (card.offsetTop <= probe) {
          idx = i;
        } else {
          break;
        }
      }

      setCurrentIndex(idx);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef]);

  const handleDotClick = (index: number) => {
    const container = containerRef.current;
    if (!container) return;

    const cards = container.querySelectorAll('.day-card');
    const card = cards[index] as HTMLElement;
    if (card) {
      container.scrollTo({
        top: card.offsetTop,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="dot-nav">
      {Array.from({ length: totalDays }).map((_, i) => (
        <div
          key={i}
          className={`dot ${i === currentIndex ? 'active' : ''}`}
          onClick={() => handleDotClick(i)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleDotClick(i);
            }
          }}
        />
      ))}
    </div>
  );
};

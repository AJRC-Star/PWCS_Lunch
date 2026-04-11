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
      if (cards.length === 0) return;

      // Find which card is closest to the top of the viewport
      let closestIdx = 0;
      let closestDistance = Infinity;

      const viewportTop = container.scrollTop + container.clientHeight / 2;

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i] as HTMLElement;
        const cardCenter = card.offsetTop + card.clientHeight / 2;
        const distance = Math.abs(viewportTop - cardCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIdx = i;
        }
      }

      setCurrentIndex(closestIdx);
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

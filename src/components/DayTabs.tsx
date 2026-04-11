import React, { useEffect, useRef } from 'react';
import type { MenuDay } from '../types';

interface Props {
  days: MenuDay[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export const DayTabs: React.FC<Props> = ({ days, selectedIndex, onSelect }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Scroll selected chip into view whenever selection changes
  useEffect(() => {
    const chip = chipRefs.current[selectedIndex];
    const container = scrollRef.current;
    if (!chip || !container) return;

    const chipLeft = chip.offsetLeft;
    const chipWidth = chip.offsetWidth;
    const containerWidth = container.offsetWidth;
    const scrollLeft = chipLeft - containerWidth / 2 + chipWidth / 2;

    container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
  }, [selectedIndex]);

  return (
    <div className="day-tabs" ref={scrollRef}>
      {days.map((day, idx) => {
        const dayObj = new Date(day.dateObj);
        const weekday = dayObj.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = dayObj.toLocaleDateString('en-US', { day: 'numeric' });

        return (
          <button
            key={idx}
            ref={(el) => { chipRefs.current[idx] = el; }}
            className={`day-chip ${idx === selectedIndex ? 'active' : ''} ${day.today ? 'today' : ''}`}
            onClick={() => onSelect(idx)}
          >
            <span className="chip-weekday">{weekday}</span>
            <span className="chip-day">{dayNum}</span>
          </button>
        );
      })}
    </div>
  );
};

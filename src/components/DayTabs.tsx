import React, { useEffect, useRef } from 'react';
import type { MenuDay } from '../types';
import { formatSchoolDate } from '../../shared/menu-core.js';

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

    if (typeof container.scrollTo === 'function') {
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      return;
    }

    container.scrollLeft = scrollLeft;
  }, [selectedIndex]);

  return (
    <div className="day-tabs" ref={scrollRef} role="tablist" aria-label="Menu days">
      {days.map((day, idx) => {
        const weekday = formatSchoolDate(day.iso, { weekday: 'short' });
        const dayNum = formatSchoolDate(day.iso, { day: 'numeric' });
        const fullDate = formatSchoolDate(day.iso, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        });
        const selected = idx === selectedIndex;
        const ariaLabel = [
          fullDate,
          selected ? 'selected' : null,
          day.today ? 'today' : null,
        ].filter(Boolean).join(', ');

        return (
          <button
            key={day.iso}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={ariaLabel}
            ref={(el) => { chipRefs.current[idx] = el; }}
            className={`day-chip ${selected ? 'active' : ''} ${day.today ? 'today' : ''}`}
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

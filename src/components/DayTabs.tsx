import React, { useEffect, useRef } from 'react';
import type { MenuDay } from '../types';
import { formatSchoolDate } from '../../shared/menu-core.js';

interface Props {
  days: MenuDay[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function getMenuDayTabId(iso: string): string {
  return `menu-day-tab-${iso}`;
}

export function getMenuDayPanelId(iso: string): string {
  return `menu-day-panel-${iso}`;
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

  const selectAndFocus = (index: number) => {
    onSelect(index);
    chipRefs.current[index]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (days.length === 0) return;

    const lastIndex = days.length - 1;
    let nextIndex: number | null = null;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = index === lastIndex ? 0 : index + 1;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = index === 0 ? lastIndex : index - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = lastIndex;
        break;
      default:
        return;
    }

    event.preventDefault();
    selectAndFocus(nextIndex);
  };

  return (
    <div
      className="day-tabs"
      ref={scrollRef}
      role="tablist"
      aria-label="Menu days"
      aria-orientation="horizontal"
    >
      {days.map((day, idx) => {
        const weekday = formatSchoolDate(day.iso, { weekday: 'short' }).toLocaleUpperCase('en-US');
        const dayNum = formatSchoolDate(day.iso, { day: 'numeric' });
        const fullDate = formatSchoolDate(day.iso, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        });
        const selected = idx === selectedIndex;
        const visibleLabel = `${weekday} ${dayNum}`;
        const ariaLabel = [
          visibleLabel,
          fullDate,
          day.today ? 'today' : null,
        ].filter(Boolean).join(', ');
        const tabId = getMenuDayTabId(day.iso);

        return (
          <button
            key={day.iso}
            id={tabId}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={getMenuDayPanelId(day.iso)}
            aria-label={ariaLabel}
            tabIndex={selected ? 0 : -1}
            ref={(el) => { chipRefs.current[idx] = el; }}
            className={`day-chip ${selected ? 'active' : ''} ${day.today ? 'today' : ''}`}
            onClick={() => onSelect(idx)}
            onKeyDown={(event) => handleKeyDown(event, idx)}
          >
            <span className="chip-weekday">{weekday}{' '}</span>
            <span className="chip-day">{dayNum}</span>
          </button>
        );
      })}
    </div>
  );
};

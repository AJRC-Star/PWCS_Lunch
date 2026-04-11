import React from 'react';
import type { MenuDay } from '../types';

interface Props {
  days: MenuDay[];
  onDayClick?: (dayIndex: number) => void;
}

export const WeekView: React.FC<Props> = ({ days, onDayClick }) => {
  const getFirstItems = (day: MenuDay, count: number = 3): string[] => {
    if (day.no_school || day.no_information_provided || !day.sections.length) {
      return [];
    }

    const items: string[] = [];
    for (const section of day.sections) {
      for (const item of section.items) {
        items.push(`${item}`);
        if (items.length >= count) return items;
      }
    }
    return items;
  };

  const getDayStatus = (day: MenuDay): string => {
    if (day.no_school) return 'No School';
    if (day.no_information_provided) return 'No Menu Yet';
    return '';
  };

  return (
    <div className="week-view">
      {days.map((day, idx) => {
        const dayObj = new Date(day.dateObj);
        const dayName = dayObj.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = dayObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });

        const firstItems = getFirstItems(day);
        const status = getDayStatus(day);

        return (
          <div
            key={idx}
            className={`week-card ${day.today ? 'today' : ''}`}
            onClick={() => onDayClick?.(idx)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onDayClick?.(idx);
              }
            }}
          >
            <div className="week-card-header">
              <span className="week-card-date">{dateStr}</span>
              <span className="week-card-day">{dayName}</span>
            </div>

            {status ? (
              <div className="week-card-empty">{status}</div>
            ) : (
              <div className="week-card-items">
                {firstItems.length > 0 ? (
                  firstItems.map((item, itemIdx) => (
                    <div key={itemIdx} className="week-card-item">
                      • {item}
                    </div>
                  ))
                ) : (
                  <div className="week-card-empty">No items listed</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

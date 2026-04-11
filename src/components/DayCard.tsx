import React from 'react';
import type { MenuDay } from '../types';

interface Props {
  day: MenuDay;
}

const CATEGORY_EMOJI: Record<string, string> = {
  Entree: '🍗',
  Sides: '🥗',
  Fruit: '🍎',
  Grains: '🍞',
  Drink: '🥛',
  Condiments: '🧂',
  Dessert: '🍦',
  Other: '🍱',
};

function getCategoryEmoji(title: string): string {
  return CATEGORY_EMOJI[title] || '🍽️';
}

export const DayCard: React.FC<Props> = ({ day }) => {
  const dayObj = new Date(day.dateObj);
  const weekday = dayObj.toLocaleDateString('en-US', { weekday: 'long' });
  const shortDate = dayObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  if (day.no_information_provided) {
    return (
      <div className="day-card">
        <div className="day-head">
          {day.today && <span className="today-badge">Today</span>}
          <span className="day-weekday">{weekday}</span>
          <span className="day-name">{shortDate}</span>
        </div>
        <div className="empty-state">
          <h2>No menu yet</h2>
          <p className="sub">Check back later today.</p>
        </div>
      </div>
    );
  }

  if (day.no_school) {
    return (
      <div className="day-card">
        <div className="day-head">
          {day.today && <span className="today-badge">Today</span>}
          <span className="day-weekday">{weekday}</span>
          <span className="day-name">{shortDate}</span>
        </div>
        <div className="empty-state">
          <h2>No school</h2>
          <p className="sub">Nothing posted because there is no school.</p>
        </div>
      </div>
    );
  }

  const sections = day.sections || [];
  const entreeSection = sections.find((s) => s.title === 'Entree');
  const restSections = entreeSection
    ? sections.filter((s) => s !== entreeSection)
    : sections.slice();

  return (
    <div className="day-card">
      <div className="day-head">
        {day.today && <span className="today-badge">Today</span>}
        <span className="day-weekday">{weekday}</span>
        <span className="day-name">{shortDate}</span>
      </div>

      {entreeSection && (
        <div className={`entree-block ${entreeSection.items.length >= 3 ? 'featured' : 'compact'}`}>
          <div className="sec-label">{getCategoryEmoji('Entree')} Entree</div>
          <ul>
            {entreeSection.items.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="sections-rest">
        {restSections.map((section, idx) => {
          const itemCount = section.items.length;
          const isWide = itemCount >= 4 || section.title === 'Fruit' || section.title === 'Sides';
          return (
            <div key={idx} className={`section-block ${isWide ? 'wide' : 'compact'}`}>
              <div className="sec-label">{getCategoryEmoji(section.title)} {section.title}</div>
              <ul>
                {section.items.map((item, itemIdx) => (
                  <li key={itemIdx}>{item}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};

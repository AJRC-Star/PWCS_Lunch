import React from 'react';
import type { MenuDay } from '../types';
import { formatSchoolDate } from '../../shared/menu-core.js';
import { PWCS_SCHOOL_YEAR_LAST_DAYS } from '../../shared/pwcs-calendar.js';

interface Props {
  day: MenuDay;
}

const COUNTDOWN_START_ISO = '2026-05-01';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

function getUtcDay(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function getSchoolCountdownDays(iso: string): number | null {
  const lastDayOfSchool = PWCS_SCHOOL_YEAR_LAST_DAYS.find((lastDay) => {
    const countdownStart = `${lastDay.slice(0, 4)}-05-01`;
    return iso >= countdownStart && iso <= lastDay;
  });

  if (!lastDayOfSchool || iso < COUNTDOWN_START_ISO) {
    return null;
  }

  return Math.max(0, Math.round((getUtcDay(lastDayOfSchool) - getUtcDay(iso)) / MS_PER_DAY));
}

export const DayCard: React.FC<Props> = ({ day }) => {
  const weekday = formatSchoolDate(day.iso, { weekday: 'long' });
  const shortDate = formatSchoolDate(day.iso, {
    month: 'short',
    day: 'numeric',
  });
  const countdownDays = getSchoolCountdownDays(day.iso);

  const dayHead = (
    <div className="day-head">
      <div className="day-title-block">
        {day.today && <span className="today-badge">Today</span>}
        <span className="day-weekday">{weekday}</span>
        <span className="day-name">{shortDate}</span>
      </div>
      {countdownDays !== null && (
        <div
          className="school-countdown"
          aria-label={`${countdownDays} days until the last day of school`}
        >
          <span className="school-countdown-label">School's out in</span>
          <span className="school-countdown-value">{countdownDays}</span>
          <span className="school-countdown-unit">
            {countdownDays === 1 ? 'day' : 'days'}
          </span>
        </div>
      )}
    </div>
  );

  // Check no_school first: a no-school day always has empty sections, so
  // checking no_information_provided first would swallow the "No school" UI.
  if (day.no_school) {
    return (
      <div className="day-card">
        {dayHead}
        <div className="empty-state">
          <h2>No school</h2>
          <p className="sub">Nothing posted because there is no school.</p>
        </div>
      </div>
    );
  }

  if (day.no_information_provided) {
    return (
      <div className="day-card">
        {dayHead}
        <div className="empty-state">
          <h2>No menu yet</h2>
          <p className="sub">Check back later today.</p>
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
      {dayHead}

      {entreeSection && (
        <div className={`entree-block ${entreeSection.items.length >= 3 ? 'featured' : 'compact'}`}>
          <div className="sec-label">{getCategoryEmoji('Entree')} Entree</div>
          <ul>
            {entreeSection.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="sections-rest">
        {restSections.map((section) => {
          return (
            <div key={section.title} className={`section-block ${section.wide ? 'wide' : 'compact'}`}>
              <div className="sec-label">{getCategoryEmoji(section.title)} {section.title}</div>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};

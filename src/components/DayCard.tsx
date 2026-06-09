import React, { useEffect, useRef, useState } from 'react';
import type { MenuDay } from '../types';
import { formatSchoolDate } from '../../shared/menu-core.js';
import { PWCS_SCHOOL_YEAR_LAST_DAYS } from '../../shared/pwcs-calendar.js';
import { Confetti } from './Confetti';

interface Props {
  day: MenuDay;
  direction?: 'left' | 'right' | null;
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

function getMenuDayTabId(iso: string): string {
  return `menu-day-tab-${iso}`;
}

function getMenuDayPanelId(iso: string): string {
  return `menu-day-panel-${iso}`;
}

function getMenuSectionHeadingId(iso: string, title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `menu-day-${iso}-${slug}`;
}

function getUtcDay(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

type CountdownInfo = { days: number; lastDayIso: string };

function getSchoolCountdown(iso: string): CountdownInfo | null {
  const lastDayOfSchool = PWCS_SCHOOL_YEAR_LAST_DAYS.find((lastDay) => {
    const countdownStart = `${lastDay.slice(0, 4)}-05-01`;
    return iso >= countdownStart && iso <= lastDay;
  });

  if (!lastDayOfSchool || iso < COUNTDOWN_START_ISO) return null;

  return {
    days: Math.max(0, Math.round((getUtcDay(lastDayOfSchool) - getUtcDay(iso)) / MS_PER_DAY)),
    lastDayIso: lastDayOfSchool,
  };
}

export const DayCard: React.FC<Props> = ({ day, direction }) => {
  const weekday = formatSchoolDate(day.iso, { weekday: 'long' });
  const shortDate = formatSchoolDate(day.iso, {
    month: 'short',
    day: 'numeric',
  });
  const countdown = getSchoolCountdown(day.iso);
  const countdownDays = countdown?.days ?? null;
  const lastDayShortDate = countdown
    ? formatSchoolDate(countdown.lastDayIso, { month: 'short', day: 'numeric' })
    : null;

  // Countdown flip animation
  const prevCountdown = useRef<number | null | undefined>(undefined);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (prevCountdown.current !== undefined && prevCountdown.current !== countdownDays) {
      setIsFlipping(true);
      const id = setTimeout(() => setIsFlipping(false), 400);
      return () => clearTimeout(id);
    }
    prevCountdown.current = countdownDays;
  }, [countdownDays]);

  const slideClass = direction === 'left' ? 'slide-in-left' : direction === 'right' ? 'slide-in-right' : '';

  const isLastDay = countdownDays === 0;
  const panelProps = {
    'aria-labelledby': getMenuDayTabId(day.iso),
    className: `day-card ${slideClass}`,
    id: getMenuDayPanelId(day.iso),
    role: 'tabpanel',
    tabIndex: 0,
  } as const;

  const countdownWidget = countdownDays !== null && (
    isLastDay ? (
      <div
        className="school-countdown"
        aria-label="Last day of school!"
      >
        Today is the last day! <span aria-hidden="true">🎉</span>
      </div>
    ) : (
      <div
        className="school-countdown"
        aria-label={`${countdownDays} ${countdownDays === 1 ? 'day' : 'days'} until the last day of school${lastDayShortDate ? `, ${lastDayShortDate}` : ''}`}
      >
        School ends in{' '}
        <span className={`school-countdown-value${isFlipping ? ' flipping' : ''}`}>
          {countdownDays}
        </span>
        {' '}{countdownDays === 1 ? 'day' : 'days'}
        {lastDayShortDate && (
          <span className="school-countdown-date"> · {lastDayShortDate}</span>
        )}
      </div>
    )
  );

  const dayHead = (
    <div className="day-head">
      <h2
        className="day-title-block"
        aria-label={`${weekday}, ${shortDate}${day.today ? ', Today' : ''}`}
      >
        {day.today && <span className="today-badge">Today</span>}
        <span className="day-weekday">{weekday}</span>
        <span className="day-name">{shortDate}</span>
      </h2>
      {countdownWidget}
    </div>
  );

  if (day.no_school) {
    return (
      <div {...panelProps}>
        {isLastDay && <Confetti />}
        {dayHead}
        <div className="empty-state">
          <h2>No school</h2>
          <p className="sub">No cafeteria service today. Check another day in the strip above.</p>
        </div>
      </div>
    );
  }

  if (day.no_information_provided) {
    return (
      <div {...panelProps}>
        {isLastDay && <Confetti />}
        {dayHead}
        <div className="empty-state">
          <h2>Menu not posted yet</h2>
          <p className="sub">Check back after the next menu update.</p>
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
    <div {...panelProps}>
      {isLastDay && <Confetti />}
      {dayHead}

      {entreeSection && (
        <section
          aria-labelledby={getMenuSectionHeadingId(day.iso, entreeSection.title)}
          className={`entree-block ${entreeSection.items.length >= 3 ? 'featured' : 'compact'}`}
        >
          <h3 className="sec-label" id={getMenuSectionHeadingId(day.iso, entreeSection.title)}>
            <span aria-hidden="true">{getCategoryEmoji('Entree')}</span> Entree
          </h3>
          <ul>
            {entreeSection.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="sections-rest">
        {restSections.map((section, i) => {
          const sectionHeadingId = getMenuSectionHeadingId(day.iso, section.title);
          return (
            <section
              key={section.title}
              aria-labelledby={sectionHeadingId}
              className={`section-block ${section.wide ? 'wide' : 'compact'}`}
              style={{ animationDelay: `${(i + 1) * 200}ms` }}
            >
              <h3 className="sec-label" id={sectionHeadingId}>
                <span aria-hidden="true">{getCategoryEmoji(section.title)}</span> {section.title}
              </h3>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
};

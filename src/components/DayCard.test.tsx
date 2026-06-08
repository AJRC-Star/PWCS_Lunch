import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DayCard } from './DayCard';
import type { MenuDay } from '../types';

function makeDay(overrides: Partial<MenuDay> = {}): MenuDay {
  return {
    iso: '2026-05-14',
    dateObj: Date.parse('2026-05-14T12:00:00Z'),
    today: true,
    weekend: false,
    no_school: false,
    no_information_provided: false,
    sections: [{ title: 'Entree', items: ['Pizza'], wide: true }],
    ...overrides,
  };
}

describe('DayCard school countdown', () => {
  it('uses semantic headings and a tab panel relationship for a normal menu day', () => {
    render(<DayCard day={makeDay()} />);

    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'menu-day-panel-2026-05-14');
    expect(screen.getByRole('tabpanel')).toHaveAttribute(
      'aria-labelledby',
      'menu-day-tab-2026-05-14',
    );
    expect(screen.getByRole('heading', { level: 2, name: /Thursday, May 14/i }))
      .toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Entree/i })).toBeInTheDocument();
  });

  it('uses update-based copy when a future menu is not posted yet', () => {
    render(
      <DayCard
        day={makeDay({
          no_information_provided: true,
          sections: [],
        })}
      />,
    );

    expect(screen.getByRole('heading', { level: 2, name: /Menu not posted yet/i }))
      .toBeInTheDocument();
    expect(screen.getByText(/Check back after the next menu update/i)).toBeInTheDocument();
    expect(screen.queryByText(/later today/i)).not.toBeInTheDocument();
  });

  it('shows days until the PWCS last day of school during the seasonal window', () => {
    render(<DayCard day={makeDay()} />);

    const countdown = document.querySelector('.school-countdown');
    expect(countdown).toBeInTheDocument();
    expect(countdown?.textContent).toMatch(/School ends in 29 days/);
  });

  it('hides the countdown before May 2026', () => {
    render(<DayCard day={makeDay({ iso: '2026-04-30' })} />);

    expect(document.querySelector('.school-countdown')).not.toBeInTheDocument();
  });

  it('hides the countdown after the last day of school', () => {
    render(<DayCard day={makeDay({ iso: '2026-06-13' })} />);

    expect(document.querySelector('.school-countdown')).not.toBeInTheDocument();
  });

  it('uses the shared PWCS last day for the next covered school year', () => {
    render(<DayCard day={makeDay({ iso: '2027-06-16' })} />);

    const countdown = document.querySelector('.school-countdown');
    expect(countdown).toBeInTheDocument();
    expect(countdown?.textContent).toMatch(/School ends in 1 day/);
  });
});

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
  it('shows days until the PWCS last day of school during the seasonal window', () => {
    render(<DayCard day={makeDay()} />);

    expect(screen.getByText("School's out in")).toBeInTheDocument();
    expect(screen.getByText('29')).toBeInTheDocument();
    expect(screen.getByText('days')).toBeInTheDocument();
  });

  it('hides the countdown before May 2026', () => {
    render(<DayCard day={makeDay({ iso: '2026-04-30' })} />);

    expect(screen.queryByText("School's out in")).not.toBeInTheDocument();
  });

  it('hides the countdown after the last day of school', () => {
    render(<DayCard day={makeDay({ iso: '2026-06-13' })} />);

    expect(screen.queryByText("School's out in")).not.toBeInTheDocument();
  });
});

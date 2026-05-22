import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DayTabs } from './DayTabs';
import type { MenuDay } from '../types';

function makeDay(iso: string, today = false): MenuDay {
  return {
    iso,
    dateObj: Date.parse(`${iso}T12:00:00Z`),
    today,
    weekend: false,
    no_school: false,
    no_information_provided: false,
    sections: [{ title: 'Entree', items: ['Pizza'], wide: true }],
  };
}

describe('DayTabs', () => {
  it('exposes selected day tabs with accessible labels', () => {
    render(
      <DayTabs
        days={[makeDay('2026-05-25'), makeDay('2026-05-26', true)]}
        selectedIndex={1}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('tablist', { name: /menu days/i })).toBeInTheDocument();

    const selected = screen.getByRole('tab', {
      name: /Tuesday, May 26, selected, today/i,
    });
    expect(selected).toHaveAttribute('type', 'button');
    expect(selected).toHaveAttribute('aria-selected', 'true');

    expect(screen.getByRole('tab', { name: /Monday, May 25/i })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    expect(selected).toHaveAttribute('id', 'menu-day-tab-2026-05-26');
    expect(selected).toHaveAttribute('aria-controls', 'menu-day-panel-2026-05-26');

    expect(screen.getByRole('tab', { name: /Monday, May 25/i })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('supports standard arrow-key navigation between day tabs', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <DayTabs
        days={[
          makeDay('2026-05-25'),
          makeDay('2026-05-26', true),
          makeDay('2026-05-27'),
        ]}
        selectedIndex={1}
        onSelect={onSelect}
      />,
    );

    screen.getByRole('tab', { name: /Tuesday, May 26, selected, today/i }).focus();

    await user.keyboard('{ArrowRight}');
    expect(onSelect).toHaveBeenLastCalledWith(2);
    expect(screen.getByRole('tab', { name: /Wednesday, May 27/i })).toHaveFocus();

    await user.keyboard('{Home}');
    expect(onSelect).toHaveBeenLastCalledWith(0);
    expect(screen.getByRole('tab', { name: /Monday, May 25/i })).toHaveFocus();
  });
});

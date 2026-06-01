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
      name: /TUE 26, Tuesday, May 26, selected, today/,
    });
    expect(selected).toHaveAttribute('aria-label', 'TUE 26, Tuesday, May 26, selected, today');
    expect(selected).toHaveTextContent('TUE 26');
    expect(selected).toHaveAttribute('type', 'button');
    expect(selected).toHaveAttribute('aria-selected', 'true');
    expect(selected).toHaveAttribute('id', 'menu-day-tab-2026-05-26');
    expect(selected).toHaveAttribute('aria-controls', 'menu-day-panel-2026-05-26');

    const monday = screen.getByRole('tab', { name: /MON 25, Monday, May 25/ });
    expect(monday).toHaveAttribute('aria-label', 'MON 25, Monday, May 25');
    expect(monday).toHaveTextContent('MON 25');
    expect(monday).toHaveAttribute(
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

    screen.getByRole('tab', { name: /TUE 26, Tuesday, May 26, selected, today/ }).focus();

    await user.keyboard('{ArrowRight}');
    expect(onSelect).toHaveBeenLastCalledWith(2);
    expect(screen.getByRole('tab', { name: /WED 27, Wednesday, May 27/ })).toHaveFocus();

    await user.keyboard('{Home}');
    expect(onSelect).toHaveBeenLastCalledWith(0);
    expect(screen.getByRole('tab', { name: /MON 25, Monday, May 25/ })).toHaveFocus();
  });
});

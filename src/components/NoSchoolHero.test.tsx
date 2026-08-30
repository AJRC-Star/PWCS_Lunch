import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NoSchoolHero, findHeroArt, type HeroVariant } from './NoSchoolHero';

describe('NoSchoolHero', () => {
  it('renders the checked-in artwork for each no-menu state', () => {
    for (const variant of ['summer', 'break'] as const) {
      const { container, unmount } = render(
        <NoSchoolHero variant={variant} fallbackEmoji="🏖️" title="Title">
          Sub
        </NoSchoolHero>,
      );

      expect(container.querySelector('img.no-school-art')).toBeInTheDocument();
      expect(container.querySelector('.no-school-emoji')).not.toBeInTheDocument();
      unmount();
    }
  });

  it('gives the two states distinct artwork', () => {
    // Both states render the same component a few lines apart in App.tsx, so a
    // glob that collapsed them onto one file would be easy to miss by eye.
    expect(findHeroArt('summer')).not.toBe(findHeroArt('break'));
  });

  it('hides the artwork from screen readers, which read the heading instead', () => {
    const { container } = render(
      <NoSchoolHero variant="summer" fallbackEmoji="🏖️" title="School's Out for Summer">
        Sub
      </NoSchoolHero>,
    );

    // alt="" keeps the illustration out of the accessibility tree so it is not
    // announced as a duplicate of the heading directly below it.
    expect(container.querySelector('img.no-school-art')).toHaveAttribute('alt', '');
  });

  it('falls back to the emoji when a state has no artwork', () => {
    // The glob resolves at build time, so an empty or renamed asset folder must
    // degrade to the pre-illustration rendering rather than ship a broken image.
    const missing = 'no-such-variant' as HeroVariant;
    const { container, getByText } = render(
      <NoSchoolHero variant={missing} fallbackEmoji="☀️" title="No School This Week">
        Enjoy the break
      </NoSchoolHero>,
    );

    expect(container.querySelector('img.no-school-art')).not.toBeInTheDocument();
    expect(getByText('☀️')).toHaveClass('no-school-emoji');
  });

  it('renders the title and sub text it is given', () => {
    const { getByRole, getByText } = render(
      <NoSchoolHero variant="break" fallbackEmoji="☀️" title="No School This Week">
        Enjoy the break — see you when school&apos;s back!
      </NoSchoolHero>,
    );

    expect(getByRole('heading', { name: 'No School This Week' })).toBeInTheDocument();
    expect(getByText(/Enjoy the break/)).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SkeletonLoader } from './SkeletonLoader';

describe('SkeletonLoader', () => {
  it('announces menu loading status while hiding decorative skeleton pieces', () => {
    render(<SkeletonLoader />);

    const status = screen.getByRole('status', { name: /loading menu/i });
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status.querySelector('.day-head')).toHaveAttribute('aria-hidden', 'true');
  });
});

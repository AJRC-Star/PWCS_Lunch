import { describe, expect, it } from 'vitest';
import { evaluateRefreshDeadline } from './refresh-deadline.ts';

// ── Freshness watchdog decision logic ─────────────────────────────────────
// The watchdog used to skip the refresh-deadline check entirely during quiet
// periods (school year end / summer break), so a dead refresh mechanism
// could go undetected for weeks or months. evaluateRefreshDeadline is the
// pure decision function that replaced that early return: it must run the
// deadline check on every path and only vary the *wording* of the result
// based on quietPeriod, never whether the check runs at all.

describe('evaluateRefreshDeadline', () => {
  it('fails with liveness wording during a quiet period when the deadline was missed', () => {
    // 2026-07-01 sits inside the 2026 PWCS summer break (2026-06-13..2026-08-23).
    const staleDeadline = '2026-06-27T10:00:00.000Z';
    const now = Date.parse('2026-07-01T00:00:00.000Z');

    const result = evaluateRefreshDeadline(staleDeadline, true, now);

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/stopped being regenerated during a quiet period/i);
    expect(result.message).toContain(staleDeadline);
    // Must be distinguishable from the non-quiet-period wording.
    expect(result.message).not.toMatch(/missed its expected refresh deadline/i);
  });

  it('passes during a quiet period when the deadline has not been missed', () => {
    const freshDeadline = '2026-07-04T10:00:00.000Z';
    const now = Date.parse('2026-07-01T00:00:00.000Z');

    const result = evaluateRefreshDeadline(freshDeadline, true, now);

    expect(result.ok).toBe(true);
    // Must not silently say nothing: it should name both that plausibility
    // was skipped and that the liveness check passed.
    expect(result.message).toMatch(/plausibility check skipped/i);
    expect(result.message).toMatch(/liveness check passed/i);
    expect(result.message).toContain(freshDeadline);
  });

  it('fails with the original deadline wording outside a quiet period', () => {
    // 2026-09-15 is a normal in-session date, well outside both the summer
    // break and the near-school-year-end window.
    const staleDeadline = '2026-09-05T10:00:00.000Z';
    const now = Date.parse('2026-09-15T00:00:00.000Z');

    const result = evaluateRefreshDeadline(staleDeadline, false, now);

    expect(result.ok).toBe(false);
    expect(result.message).toBe(
      `Menu artifact missed its expected refresh deadline (${staleDeadline}).`,
    );
    expect(result.message).not.toMatch(/quiet period/i);
  });

  it('passes outside a quiet period when the deadline has not been missed', () => {
    const freshDeadline = '2026-09-19T10:00:00.000Z';
    const now = Date.parse('2026-09-15T00:00:00.000Z');

    const result = evaluateRefreshDeadline(freshDeadline, false, now);

    expect(result.ok).toBe(true);
    expect(result.message).toBe(
      `Artifact freshness check passed. Next expected refresh: ${freshDeadline}`,
    );
  });

  it('respects the 2-hour grace period at its boundary, quiet period or not', () => {
    const deadline = '2026-09-05T10:00:00.000Z';

    // Just inside the 2-hour grace window: still passes.
    expect(
      evaluateRefreshDeadline(deadline, false, Date.parse('2026-09-05T11:59:00.000Z')).ok,
    ).toBe(true);

    // Just outside the grace window: fails.
    expect(
      evaluateRefreshDeadline(deadline, false, Date.parse('2026-09-05T12:01:00.000Z')).ok,
    ).toBe(false);

    // The same boundary holds during a quiet period, just with different wording.
    expect(
      evaluateRefreshDeadline(deadline, true, Date.parse('2026-09-05T11:59:00.000Z')).ok,
    ).toBe(true);

    expect(
      evaluateRefreshDeadline(deadline, true, Date.parse('2026-09-05T12:01:00.000Z')).ok,
    ).toBe(false);
  });
});

import { isPastExpectedRefresh } from '../shared/menu-contract.ts';

export type RefreshDeadlineResult = { ok: boolean; message: string };

// During the year-end window and summer break the artifact legitimately has
// no visible days, so the caller skips plausibility (structural validation
// still runs).  The refresh-deadline check does NOT get skipped:
// isPastExpectedRefresh only compares timestamps against a 2-hour grace
// period and never looks at day content, so it's a pure liveness signal that
// stays meaningful year-round — a refresh mechanism that has silently died is
// just as much a problem in July as in October, it just takes longer to
// notice without this check.  Unlike a "school year over" check against past
// last-days, isPWCSSummerBreak turns itself back off when the next school
// year starts, so the watchdog resumes automatically in fall.
//
// This lives in its own module so scripts/check-artifact-freshness.ts can run
// main() unconditionally.  Guarding that call on process.argv[1] so tests
// could import it would risk the guard failing to match under a different
// runner and leaving the watchdog exiting 0 having checked nothing.
export function evaluateRefreshDeadline(
  expectedNextRefreshAt: string | undefined,
  quietPeriod: boolean,
  nowMs = Date.now(),
): RefreshDeadlineResult {
  if (isPastExpectedRefresh(expectedNextRefreshAt, nowMs)) {
    return {
      ok: false,
      message: quietPeriod
        ? `Menu artifact stopped being regenerated during a quiet period (school year end / summer break); the refresh mechanism appears dead, not just quiet (expected refresh by ${expectedNextRefreshAt}).`
        : `Menu artifact missed its expected refresh deadline (${expectedNextRefreshAt}).`,
    };
  }

  return {
    ok: true,
    message: quietPeriod
      ? `School year ending or summer break — plausibility check skipped, but refresh liveness check passed. Next expected refresh: ${expectedNextRefreshAt}`
      : `Artifact freshness check passed. Next expected refresh: ${expectedNextRefreshAt}`,
  };
}

import { describe, expect, it } from 'vitest';
import { MENU_SCHEMA_VERSION, type SharedMenuResponse } from './menu-core.ts';
import {
  getExpectedNextRefreshAt,
  isPastExpectedRefresh,
  validateMenuArtifact,
} from './menu-contract.ts';
import { PWCS_CALENDAR_COVERAGE_END_ISO } from './pwcs-calendar.ts';

function makeArtifact(overrides: Partial<SharedMenuResponse> = {}): SharedMenuResponse {
  const base: SharedMenuResponse = {
    days: [
      {
        iso: '2026-04-20',
        dateObj: Date.parse('2026-04-20T12:00:00Z'),
        today: false,
        weekend: false,
        no_school: false,
        no_information_provided: false,
        sections: [{ title: 'Entree', items: ['Pizza'], wide: true }],
      },
      {
        iso: '2026-04-21',
        dateObj: Date.parse('2026-04-21T12:00:00Z'),
        today: false,
        weekend: false,
        no_school: true,
        no_information_provided: false,
        sections: [],
      },
      {
        iso: '2026-04-22',
        dateObj: Date.parse('2026-04-22T12:00:00Z'),
        today: false,
        weekend: false,
        no_school: false,
        no_information_provided: false,
        sections: [{ title: 'Entree', items: ['Chicken Sandwich'], wide: true }],
      },
    ],
    meta: {
      schemaVersion: MENU_SCHEMA_VERSION,
      snapshotGeneratedAt: '2026-04-18T10:00:00.000Z',
      expectedNextRefreshAt: '2026-04-25T10:00:00.000Z',
      schoolName: 'BENTONMIDDLE',
    },
  };

  return {
    ...base,
    ...overrides,
    meta: {
      ...base.meta,
      ...overrides.meta,
    },
  };
}

describe('menu artifact contract', () => {
  it('accepts semantically valid artifacts', () => {
    expect(validateMenuArtifact(makeArtifact()).days).toHaveLength(3);
  });

  it('rejects artifacts whose refresh deadline does not match the weekly schedule', () => {
    const base = makeArtifact();
    const artifact = makeArtifact({
      meta: {
        ...base.meta,
        expectedNextRefreshAt: '2030-01-01T00:00:00.000Z',
      },
    });

    expect(() => validateMenuArtifact(artifact)).toThrow(/weekly refresh schedule/i);
  });

  it('rejects artifacts with invalid snapshot timestamps', () => {
    const base = makeArtifact();
    const artifact = makeArtifact({
      meta: {
        ...base.meta,
        snapshotGeneratedAt: 'not-a-date',
        expectedNextRefreshAt: '2026-04-25T10:00:00.000Z',
      },
    });

    expect(() => validateMenuArtifact(artifact)).toThrow(/snapshotGeneratedAt is not a valid/i);
  });

  it('rejects malformed day records before they can reach the UI', () => {
    const artifact = makeArtifact({
      days: [
        {
          ...makeArtifact().days[0],
          iso: '2026-02-31',
        },
        makeArtifact().days[1],
        makeArtifact().days[2],
      ],
    });

    expect(() => validateMenuArtifact(artifact)).toThrow(/invalid iso/i);
  });

  it('rejects regular school days that have no menu items and no missing-menu flag', () => {
    const artifact = makeArtifact({
      days: [
        {
          ...makeArtifact().days[0],
          sections: [],
          no_information_provided: false,
        },
        makeArtifact().days[1],
        makeArtifact().days[2],
      ],
    });

    expect(() => validateMenuArtifact(artifact)).toThrow(/regular school day with no menu items/i);
  });

  it('rejects official no-school dates mislabeled as missing menu data', () => {
    const artifact = makeArtifact({
      days: [
        makeArtifact().days[0],
        {
          ...makeArtifact().days[1],
          no_school: false,
          no_information_provided: true,
        },
        makeArtifact().days[2],
      ],
    });

    expect(() => validateMenuArtifact(artifact)).toThrow(/official no-school date 2026-04-21/i);
  });

  it('rejects artifacts beyond the embedded PWCS calendar coverage', () => {
    const artifact = makeArtifact({
      days: [
        {
          iso: '2027-06-22',
          dateObj: Date.parse('2027-06-22T12:00:00Z'),
          today: false,
          weekend: false,
          no_school: false,
          no_information_provided: false,
          sections: [{ title: 'Entree', items: ['Pizza'], wide: true }],
        },
        {
          iso: '2027-06-23',
          dateObj: Date.parse('2027-06-23T12:00:00Z'),
          today: false,
          weekend: false,
          no_school: false,
          no_information_provided: false,
          sections: [{ title: 'Entree', items: ['Chicken Sandwich'], wide: true }],
        },
        {
          iso: '2027-06-24',
          dateObj: Date.parse('2027-06-24T12:00:00Z'),
          today: false,
          weekend: false,
          no_school: false,
          no_information_provided: false,
          sections: [{ title: 'Entree', items: ['Burger'], wide: true }],
        },
      ],
    });

    expect(() => validateMenuArtifact(artifact)).toThrow(/calendar coverage/i);
  });

  it('computes the next expected Saturday refresh deadline', () => {
    expect(getExpectedNextRefreshAt('2026-04-14T22:36:40.171Z')).toBe('2026-04-18T10:00:00.000Z');
    expect(getExpectedNextRefreshAt('2026-04-18T10:00:00.000Z')).toBe('2026-04-25T10:00:00.000Z');
  });

  it('treats the expected refresh deadline plus grace period as stale', () => {
    expect(isPastExpectedRefresh('2026-04-18T10:00:00.000Z', Date.parse('2026-04-18T11:59:00.000Z'))).toBe(false);
    expect(isPastExpectedRefresh('2026-04-18T10:00:00.000Z', Date.parse('2026-04-18T12:01:00.000Z'))).toBe(true);
  });

  it('accepts an implausible artifact when enforcePlausibility is disabled', () => {
    // A single-day artifact would normally fail plausibility, but the cache
    // loader passes enforcePlausibility:false for previously committed entries.
    const singleDay = makeArtifact({
      days: [makeArtifact().days[0]],
    });

    expect(() =>
      validateMenuArtifact(singleDay, undefined, { enforcePlausibility: false }),
    ).not.toThrow();
  });

  // ── D-1: Calendar coverage advance-warning ────────────────────────────────
  // This test fails approximately 30 days before the PWCS calendar coverage
  // cliff, giving a lead-time signal to update pwcs-calendar.ts before the
  // weekly fetch pipeline breaks silently.
  it('PWCS_CALENDAR_COVERAGE_END_ISO is at least 30 days in the future', () => {
    const coverageEnd = Date.parse(`${PWCS_CALENDAR_COVERAGE_END_ISO}T00:00:00Z`);
    const thirtyDaysFromNow = Date.now() + 30 * 24 * 60 * 60 * 1000;
    expect(
      coverageEnd,
      `PWCS calendar coverage ends ${PWCS_CALENDAR_COVERAGE_END_ISO} — update pwcs-calendar.ts before it expires`,
    ).toBeGreaterThan(thirtyDaysFromNow);
  });
});

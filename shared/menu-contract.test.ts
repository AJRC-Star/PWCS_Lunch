import { describe, expect, it } from 'vitest';
import { MENU_SCHEMA_VERSION, type SharedMenuResponse } from './menu-core.ts';
import {
  getExpectedNextRefreshAt,
  isPastExpectedRefresh,
  validateMenuArtifact,
} from './menu-contract.ts';

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
});

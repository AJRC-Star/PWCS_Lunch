import { describe, expect, it } from 'vitest';
import {
  getPWCSNextSchoolYearStart,
  isPWCSSummerBreak,
} from './pwcs-calendar.ts';
import { isPlausibleMenuSnapshot, type SharedMenuDay } from './menu-core.ts';

function makeNoInfoDay(iso: string): SharedMenuDay {
  return {
    iso,
    dateObj: Date.parse(`${iso}T12:00:00Z`),
    today: false,
    weekend: false,
    no_school: false,
    no_information_provided: true,
    sections: [],
  };
}

describe('isPWCSSummerBreak', () => {
  it('starts the day after the last instructional day and ends the day before school resumes', () => {
    expect(isPWCSSummerBreak('2026-06-12')).toBe(false); // last day of school
    expect(isPWCSSummerBreak('2026-06-13')).toBe(true);
    expect(isPWCSSummerBreak('2026-07-15')).toBe(true);
    expect(isPWCSSummerBreak('2026-08-23')).toBe(true);
    expect(isPWCSSummerBreak('2026-08-24')).toBe(false); // first day of 2026-27
  });

  it('is false during the school year', () => {
    expect(isPWCSSummerBreak('2026-03-10')).toBe(false);
    expect(isPWCSSummerBreak('2026-10-15')).toBe(false);
  });

  it('treats the 2027 break as open-ended until the next calendar is published', () => {
    expect(isPWCSSummerBreak('2027-06-17')).toBe(false); // last day of 2026-27
    expect(isPWCSSummerBreak('2027-06-18')).toBe(true);
    expect(isPWCSSummerBreak('2027-12-01')).toBe(true);
  });
});

describe('getPWCSNextSchoolYearStart', () => {
  it('returns the first instructional day after a bounded summer break', () => {
    expect(getPWCSNextSchoolYearStart('2026-07-04')).toBe('2026-08-24');
  });

  it('returns null for the open-ended break and for non-summer dates', () => {
    expect(getPWCSNextSchoolYearStart('2027-07-04')).toBeNull();
    expect(getPWCSNextSchoolYearStart('2026-03-10')).toBeNull();
  });
});

describe('isPlausibleMenuSnapshot during summer break', () => {
  it('accepts an empty visible snapshot in July', () => {
    expect(isPlausibleMenuSnapshot([], undefined, '2026-07-15')).toBe(true);
  });

  it('accepts an all-no-information snapshot against a healthy cache in late June', () => {
    const previous = [makeNoInfoDay('2026-06-22'), makeNoInfoDay('2026-06-23')];
    const next = [
      makeNoInfoDay('2026-06-22'),
      makeNoInfoDay('2026-06-23'),
      makeNoInfoDay('2026-06-24'),
      makeNoInfoDay('2026-06-25'),
      makeNoInfoDay('2026-06-26'),
    ];
    expect(isPlausibleMenuSnapshot(next, previous, '2026-06-20')).toBe(true);
  });

  it('still rejects an empty visible snapshot mid-year', () => {
    expect(isPlausibleMenuSnapshot([], undefined, '2026-03-10')).toBe(false);
  });
});

import {
  isPlausibleMenuSnapshot,
  MENU_SCHEMA_VERSION,
  SCHOOL_ID,
  type SharedMenuResponse,
} from './menu-core.ts';
import {
  getPWCSNoSchoolDatesBetween,
  isPWCSNoSchoolDate,
  PWCS_CALENDAR_COVERAGE_END_ISO,
} from './pwcs-calendar.ts';

const MENU_CACHE_SEMANTIC_VERSION = 3;
const WEEKLY_REFRESH_DAY_UTC = 6;
const WEEKLY_REFRESH_HOUR_UTC = 10;
const WEEKLY_REFRESH_GRACE_MS = 2 * 60 * 60 * 1000;

const REQUIRED_ARTIFACT_ITEM_SECTIONS: Record<string, string> = {
  'American Cheese Slice': 'Condiments',
  'Applesauce Cup': 'Fruit',
  'Crispy Chickpeas, Ranch': 'Sides',
  'Crispy Chicken Sandwich': 'Entree',
  'Fruit Juice Cup - Cherry': 'Drink',
  'Fruit Juice Cup - Strawberry Pomegranate': 'Drink',
  'Grape Tomatoes': 'Sides',
  'Hamburger Bun': 'Grains',
  'Marinara Dipping Sauce': 'Condiments',
  'Spaghetti & Meat Sauce': 'Entree',
  'Strawberry Shortcake': 'Dessert',
};

class MenuArtifactValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MenuArtifactValidationError';
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new MenuArtifactValidationError(message);
  }
}

function toSharedMenuResponse(value: unknown): SharedMenuResponse {
  assert(value && typeof value === 'object', 'Artifact is not an object.');
  const artifact = value as Partial<SharedMenuResponse>;

  assert(Array.isArray(artifact.days), 'Artifact is missing a days array.');
  assert(artifact.meta && typeof artifact.meta === 'object', 'Artifact is missing meta.');
  assert(
    artifact.meta.schemaVersion === MENU_SCHEMA_VERSION,
    `Artifact schema version must equal ${MENU_SCHEMA_VERSION}.`,
  );
  assert(
    typeof artifact.meta.snapshotGeneratedAt === 'string' &&
      artifact.meta.snapshotGeneratedAt.length > 0,
    'Artifact is missing snapshotGeneratedAt.',
  );
  assert(
    typeof artifact.meta.expectedNextRefreshAt === 'string' &&
      artifact.meta.expectedNextRefreshAt.length > 0,
    'Artifact is missing expectedNextRefreshAt.',
  );
  assert(
    Number.isFinite(Date.parse(artifact.meta.expectedNextRefreshAt)),
    'Artifact expectedNextRefreshAt is not a valid ISO timestamp.',
  );
  assert(
    artifact.meta.schoolName === SCHOOL_ID,
    `Artifact schoolName must equal ${SCHOOL_ID}.`,
  );

  return artifact as SharedMenuResponse;
}

function validateCuratedCategoryExpectations(data: SharedMenuResponse): void {
  const placements = new Map<string, { section: string; iso: string }>();

  for (const day of data.days) {
    for (const section of day.sections) {
      for (const item of section.items) {
        placements.set(item, { section: section.title, iso: day.iso });
      }
    }
  }

  for (const [item, expectedSection] of Object.entries(REQUIRED_ARTIFACT_ITEM_SECTIONS)) {
    const placement = placements.get(item);
    if (!placement) {
      continue;
    }
    assert(
      placement.section === expectedSection,
      `Artifact category drift: "${item}" is in "${placement.section}" on ${placement.iso}, expected "${expectedSection}".`,
    );
  }
}

function validateSectionFamilies(data: SharedMenuResponse): void {
  for (const day of data.days) {
    for (const section of day.sections) {
      for (const item of section.items) {
        const name = item.toLowerCase();

        if (/\b(juice|milk|water)\b/.test(name)) {
          assert(section.title === 'Drink', `"${item}" should be in Drink, not ${section.title} (${day.iso}).`);
        }
        if ((/\bshortcake\b/.test(name) || /\bcrisp\b/.test(name)) && !/\bcrispy\b/.test(name)) {
          assert(section.title === 'Dessert', `"${item}" should be in Dessert, not ${section.title} (${day.iso}).`);
        }
        if (/\b(applesauce)\b/.test(name)) {
          assert(section.title === 'Fruit', `"${item}" should be in Fruit, not ${section.title} (${day.iso}).`);
        }
        if (/\b(grape tomatoes?|tomatoes?)\b/.test(name)) {
          assert(section.title !== 'Fruit', `"${item}" should not be in Fruit (${day.iso}).`);
        }
        if (/\bchickpeas?\b/.test(name)) {
          assert(section.title !== 'Condiments', `"${item}" should not be in Condiments (${day.iso}).`);
        }
        if (/\b(meat sauce|spaghetti)\b/.test(name)) {
          assert(section.title === 'Entree', `"${item}" should be in Entree, not ${section.title} (${day.iso}).`);
        }
        if (/\b(bun|roll|bagel|biscuit|pita)\b/.test(name) && !/\bsandwich\b/.test(name)) {
          assert(section.title !== 'Entree', `"${item}" should not be in Entree (${day.iso}).`);
        }
      }
    }
  }
}

function validateOfficialNoSchoolDays(data: SharedMenuResponse): void {
  const daysByIso = new Map(data.days.map((day) => [day.iso, day]));
  const firstISO = data.days[0]?.iso;
  const lastISO = data.days[data.days.length - 1]?.iso;
  if (!firstISO || !lastISO) {
    return;
  }
  assert(
    lastISO <= PWCS_CALENDAR_COVERAGE_END_ISO,
    `Artifact extends beyond PWCS calendar coverage (${PWCS_CALENDAR_COVERAGE_END_ISO}).`,
  );

  for (const iso of getPWCSNoSchoolDatesBetween(firstISO, lastISO)) {
    const day = daysByIso.get(iso);
    assert(day, `Artifact is missing official no-school date ${iso}.`);
    assert(day.no_school, `Official no-school date ${iso} must set no_school=true.`);
    assert(
      !day.no_information_provided,
      `Official no-school date ${iso} must not be marked no_information_provided.`,
    );
  }

  for (const day of data.days) {
    if (isPWCSNoSchoolDate(day.iso)) {
      assert(day.no_school, `Official no-school date ${day.iso} must set no_school=true.`);
      assert(
        !day.no_information_provided,
        `Official no-school date ${day.iso} must not be marked no_information_provided.`,
      );
    }
  }
}

function validateMenuArtifact(value: unknown, previousDays?: SharedMenuResponse['days']): SharedMenuResponse {
  const artifact = toSharedMenuResponse(value);
  assert(
    isPlausibleMenuSnapshot(artifact.days, previousDays),
    'Artifact failed plausibility validation.',
  );

  validateCuratedCategoryExpectations(artifact);
  validateSectionFamilies(artifact);
  validateOfficialNoSchoolDays(artifact);
  return artifact;
}

function getExpectedNextRefreshAt(snapshotGeneratedAt: string): string {
  const generatedAt = new Date(snapshotGeneratedAt);
  if (!Number.isFinite(generatedAt.getTime())) {
    return '';
  }

  const expected = new Date(generatedAt);
  expected.setUTCHours(WEEKLY_REFRESH_HOUR_UTC, 0, 0, 0);

  const daysUntilRefresh = (WEEKLY_REFRESH_DAY_UTC - expected.getUTCDay() + 7) % 7;
  expected.setUTCDate(expected.getUTCDate() + daysUntilRefresh);

  if (expected.getTime() <= generatedAt.getTime()) {
    expected.setUTCDate(expected.getUTCDate() + 7);
  }

  return expected.toISOString();
}

function isPastExpectedRefresh(expectedNextRefreshAt?: string, nowMs = Date.now()): boolean {
  if (!expectedNextRefreshAt) {
    return false;
  }

  const expectedAt = Date.parse(expectedNextRefreshAt);
  return Number.isFinite(expectedAt) && nowMs > expectedAt + WEEKLY_REFRESH_GRACE_MS;
}

export {
  MENU_CACHE_SEMANTIC_VERSION,
  MenuArtifactValidationError,
  getExpectedNextRefreshAt,
  isPastExpectedRefresh,
  validateMenuArtifact,
};

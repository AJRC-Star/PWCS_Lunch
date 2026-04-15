import {
  isPlausibleMenuSnapshot,
  MENU_SCHEMA_VERSION,
  SCHOOL_ID,
  type SharedMenuDay,
  type SharedMenuResponse,
  type SharedMenuSection,
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
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_SECTION_TITLES = new Set([
  'Entree',
  'Sides',
  'Fruit',
  'Grains',
  'Drink',
  'Condiments',
  'Dessert',
  'Other',
]);

// Title-cased item name → expected section, verified in committed artifacts.
// IMPORTANT: Keep this list in sync with ITEM_CATEGORY_OVERRIDES in
// menu-core.ts, which uses the same items (lowercase) to assign sections during
// normalization.  Adding an entry here without a corresponding entry there will
// cause validation to reject any artifact that contains the item, since it will
// have been placed in the wrong section by the normalizer.
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

type MenuArtifactValidationOptions = {
  enforcePlausibility?: boolean;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new MenuArtifactValidationError(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function parseISOAtUtcNoonMs(iso: string): number {
  if (!ISO_DATE_RE.test(iso)) {
    return Number.NaN;
  }

  const time = Date.parse(`${iso}T12:00:00Z`);
  if (!Number.isFinite(time)) {
    return Number.NaN;
  }

  const parsed = new Date(time);
  const roundTrip = [
    parsed.getUTCFullYear(),
    String(parsed.getUTCMonth() + 1).padStart(2, '0'),
    String(parsed.getUTCDate()).padStart(2, '0'),
  ].join('-');

  return roundTrip === iso ? time : Number.NaN;
}

function validateMenuSection(value: unknown, dayISO: string, sectionIndex: number): SharedMenuSection {
  assert(isRecord(value), `Artifact day ${dayISO} section ${sectionIndex} is not an object.`);

  const { title, items, wide } = value;
  assert(typeof title === 'string' && VALID_SECTION_TITLES.has(title), `Artifact day ${dayISO} has invalid section title.`);
  assert(Array.isArray(items), `Artifact day ${dayISO} section ${title} is missing an items array.`);
  assert(
    items.every((item) => typeof item === 'string' && item.trim().length > 0),
    `Artifact day ${dayISO} section ${title} contains an invalid item.`,
  );
  assert(
    wide === undefined || typeof wide === 'boolean',
    `Artifact day ${dayISO} section ${title} has invalid wide flag.`,
  );

  return {
    title,
    items,
    ...(wide === undefined ? {} : { wide }),
  };
}

function validateMenuDay(value: unknown, index: number): SharedMenuDay {
  assert(isRecord(value), `Artifact day ${index} is not an object.`);

  const {
    iso,
    dateObj,
    today,
    weekend,
    no_school,
    no_information_provided: noInformationProvided,
    sections,
  } = value;

  assert(typeof iso === 'string', `Artifact day ${index} is missing iso.`);
  const expectedDateObj = parseISOAtUtcNoonMs(iso);
  assert(Number.isFinite(expectedDateObj), `Artifact day ${index} has invalid iso ${iso}.`);
  assert(typeof dateObj === 'number' && Number.isFinite(dateObj), `Artifact day ${iso} has invalid dateObj.`);
  assert(dateObj === expectedDateObj, `Artifact day ${iso} dateObj must equal UTC noon for iso.`);
  assert(typeof today === 'boolean', `Artifact day ${iso} has invalid today flag.`);
  assert(typeof weekend === 'boolean', `Artifact day ${iso} has invalid weekend flag.`);
  assert(typeof no_school === 'boolean', `Artifact day ${iso} has invalid no_school flag.`);
  assert(
    typeof noInformationProvided === 'boolean',
    `Artifact day ${iso} has invalid no_information_provided flag.`,
  );

  const expectedWeekend = [0, 6].includes(new Date(expectedDateObj).getUTCDay());
  assert(weekend === expectedWeekend, `Artifact day ${iso} weekend flag does not match iso.`);
  assert(
    !(no_school && noInformationProvided),
    `Artifact day ${iso} cannot be both no_school and no_information_provided.`,
  );
  assert(Array.isArray(sections), `Artifact day ${iso} is missing sections array.`);

  const validatedSections = sections.map((section, sectionIndex) =>
    validateMenuSection(section, iso, sectionIndex)
  );
  const itemCount = validatedSections.reduce((count, section) => count + section.items.length, 0);

  assert(
    !no_school || itemCount === 0,
    `Artifact day ${iso} is no_school but still contains menu items.`,
  );
  assert(
    !noInformationProvided || itemCount === 0,
    `Artifact day ${iso} is no_information_provided but still contains menu items.`,
  );
  assert(
    no_school || noInformationProvided || itemCount > 0,
    `Artifact day ${iso} is a regular school day with no menu items and no missing-menu flag.`,
  );

  return {
    iso,
    dateObj,
    today,
    weekend,
    no_school,
    no_information_provided: noInformationProvided,
    sections: validatedSections,
  };
}

function toSharedMenuResponse(value: unknown): SharedMenuResponse {
  assert(value && typeof value === 'object', 'Artifact is not an object.');
  const artifact = value as Partial<SharedMenuResponse>;
  const meta = artifact.meta as Partial<SharedMenuResponse['meta']> | undefined;

  assert(Array.isArray(artifact.days), 'Artifact is missing a days array.');
  assert(meta && typeof meta === 'object', 'Artifact is missing meta.');
  assert(
    meta.schemaVersion === MENU_SCHEMA_VERSION,
    `Artifact schema version must equal ${MENU_SCHEMA_VERSION}.`,
  );
  assert(
    typeof meta.snapshotGeneratedAt === 'string' &&
      meta.snapshotGeneratedAt.length > 0,
    'Artifact is missing snapshotGeneratedAt.',
  );
  assert(
    Number.isFinite(Date.parse(meta.snapshotGeneratedAt)),
    'Artifact snapshotGeneratedAt is not a valid ISO timestamp.',
  );
  assert(
    typeof meta.expectedNextRefreshAt === 'string' &&
      meta.expectedNextRefreshAt.length > 0,
    'Artifact is missing expectedNextRefreshAt.',
  );
  assert(
    Number.isFinite(Date.parse(meta.expectedNextRefreshAt)),
    'Artifact expectedNextRefreshAt is not a valid ISO timestamp.',
  );
  assert(
    meta.expectedNextRefreshAt === getExpectedNextRefreshAt(meta.snapshotGeneratedAt),
    'Artifact expectedNextRefreshAt does not match the weekly refresh schedule.',
  );
  assert(
    meta.schoolName === SCHOOL_ID,
    `Artifact schoolName must equal ${SCHOOL_ID}.`,
  );

  return {
    days: artifact.days.map((day, index) => validateMenuDay(day, index)),
    meta: {
      schemaVersion: meta.schemaVersion,
      snapshotGeneratedAt: meta.snapshotGeneratedAt,
      expectedNextRefreshAt: meta.expectedNextRefreshAt,
      schoolName: meta.schoolName,
    },
  };
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

function validateMenuArtifact(
  value: unknown,
  previousDays?: SharedMenuResponse['days'],
  options: MenuArtifactValidationOptions = {},
): SharedMenuResponse {
  const artifact = toSharedMenuResponse(value);
  if (options.enforcePlausibility ?? true) {
    assert(
      isPlausibleMenuSnapshot(artifact.days, previousDays),
      'Artifact failed plausibility validation.',
    );
  }

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

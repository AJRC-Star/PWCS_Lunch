#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  isPlausibleMenuSnapshot,
  MENU_SCHEMA_VERSION,
  SCHOOL_ID,
  type SharedMenuResponse,
} from '../shared/menu-core.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactPath = path.join(__dirname, '../public/menu-data.json');

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function readArtifact(): SharedMenuResponse {
  const raw = fs.readFileSync(artifactPath, 'utf8');
  return JSON.parse(raw) as SharedMenuResponse;
}

const REQUIRED_ARTIFACT_ITEM_SECTIONS: Record<string, string> = {
  'American Cheese Slice': 'Condiments',
  'Applesauce Cup': 'Fruit',
  'Crispy Chicken Sandwich': 'Entree',
  'Fruit Juice Cup - Cherry': 'Drink',
  'Fruit Juice Cup - Strawberry Pomegranate': 'Drink',
  'Hamburger Bun': 'Grains',
  'Marinara Dipping Sauce': 'Condiments',
  'Spaghetti & Meat Sauce': 'Entree',
  'Strawberry Shortcake': 'Dessert',
};

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

function main(): void {
  const artifact = readArtifact();

  assert(Array.isArray(artifact.days), 'Artifact is missing a days array.');
  assert(artifact.meta && typeof artifact.meta === 'object', 'Artifact is missing meta.');
  assert(
    artifact.meta.schemaVersion === MENU_SCHEMA_VERSION,
    `Artifact schemaVersion must equal ${MENU_SCHEMA_VERSION}.`,
  );
  assert(
    typeof artifact.meta.snapshotGeneratedAt === 'string' &&
      artifact.meta.snapshotGeneratedAt.length > 0,
    'Artifact is missing snapshotGeneratedAt.',
  );
  assert(
    artifact.meta.schoolName === SCHOOL_ID,
    `Artifact schoolName must equal ${SCHOOL_ID}.`,
  );
  assert(
    isPlausibleMenuSnapshot(artifact.days),
    'Artifact failed plausibility validation.',
  );

  validateCuratedCategoryExpectations(artifact);
  validateSectionFamilies(artifact);
  console.log(`Artifact validation passed for ${artifactPath}`);
}

main();

#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  categorizeMealViewerItem,
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

function validateStrongCategoryHints(data: SharedMenuResponse): void {
  const highConfidenceSections = new Set(['Dessert', 'Condiments', 'Entree', 'Drink']);

  for (const day of data.days) {
    for (const section of day.sections) {
      for (const item of section.items) {
        const expected = categorizeMealViewerItem({ item_Name: item, item_Type: '' });
        if (highConfidenceSections.has(expected) && expected !== section.title) {
          throw new Error(
            `Artifact category drift: "${item}" is in "${section.title}" on ${day.iso}, but current rules classify it as "${expected}".`,
          );
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

  validateStrongCategoryHints(artifact);
  console.log(`Artifact validation passed for ${artifactPath}`);
}

main();

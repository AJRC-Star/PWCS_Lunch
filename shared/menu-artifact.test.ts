/// <reference types="node" />
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import type { SharedMenuResponse } from './menu-core.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactPath = path.join(__dirname, '../public/menu-data.json');

function readArtifact(): SharedMenuResponse {
  return JSON.parse(fs.readFileSync(artifactPath, 'utf8')) as SharedMenuResponse;
}

describe('published menu artifact', () => {
  it('keeps obvious drinks, desserts, fruits, breads, and entrees in semantically credible sections', () => {
    const artifact = readArtifact();
    const placements = new Map<string, string>();

    for (const day of artifact.days) {
      for (const section of day.sections) {
        for (const item of section.items) {
          placements.set(item, section.title);

          const name = item.toLowerCase();
          if (/\b(juice|milk|water)\b/.test(name)) {
            expect(section.title).toBe('Drink');
          }
          if ((/\bshortcake\b/.test(name) || /\bcrisp\b/.test(name)) && !/\bcrispy\b/.test(name)) {
            expect(section.title).toBe('Dessert');
          }
          if (/\b(applesauce)\b/.test(name)) {
            expect(section.title).toBe('Fruit');
          }
          if (/\b(grape tomatoes?|tomatoes?)\b/.test(name)) {
            expect(section.title).not.toBe('Fruit');
          }
          if (/\bchickpeas?\b/.test(name)) {
            expect(section.title).not.toBe('Condiments');
          }
          if (/\b(meat sauce|spaghetti)\b/.test(name)) {
            expect(section.title).toBe('Entree');
          }
          if (/\b(bun|roll|bagel|biscuit|pita)\b/.test(name) && !/\bsandwich\b/.test(name)) {
            expect(section.title).not.toBe('Entree');
          }
        }
      }
    }

    expect(placements.get('Marinara Dipping Sauce')).toBe('Condiments');
    expect(placements.get('Apple Crisp')).toBe('Dessert');
    expect(placements.get('Grape Tomatoes')).toBe('Sides');
    expect(placements.get('Crispy Chickpeas, Ranch')).toBe('Sides');
  });
});

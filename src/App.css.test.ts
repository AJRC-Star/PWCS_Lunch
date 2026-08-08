import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const cssPath = resolve(dirname(fileURLToPath(import.meta.url)), 'App.css');

function readRuleBody(selector: string): string {
  const css = readFileSync(cssPath, 'utf8');
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*{([^}]*)}`));
  if (!match) throw new Error(`Missing CSS rule for ${selector}`);
  return match[1];
}

function readToken(selector: string, name: string): string {
  const body = readRuleBody(selector);
  const match = body.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`));
  if (!match) throw new Error(`Missing token --${name} on ${selector}`);
  return match[1].trim();
}

// WCAG 2.1 relative luminance / contrast. Asserting the ratio rather than a
// literal hex means a future palette change is checked on the property that
// actually matters, instead of failing merely for being different.
function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  const [hi, lo] = x > y ? [x, y] : [y, x];
  return (hi + 0.05) / (lo + 0.05);
}

const AA_BODY = 4.5;

describe('App layout CSS', () => {
  it('lets lower menu sections expand instead of clipping published items', () => {
    const body = readRuleBody('.sections-rest');

    expect(body).toMatch(/flex\s*:\s*0\s+0\s+auto/);
    expect(body).not.toMatch(/overflow\s*:\s*hidden/);
  });

  it('uses contrast-safe accent tokens for small blue text and filled controls', () => {
    const dark = (name: string) => readToken(':root', name);
    const light = (name: string) => readToken(":root[data-theme='light']", name);

    // Accent text has to clear AA against its own surface in both themes.
    // Caribbean Blue is bright enough for the dark surface but reaches only
    // ~2:1 on the light one, which is why light mode uses a darker brand blue.
    expect(contrast(dark('accent-text'), dark('bg'))).toBeGreaterThanOrEqual(AA_BODY);
    expect(contrast(light('accent-text'), light('bg'))).toBeGreaterThanOrEqual(AA_BODY);

    // The selected day chip letters its own fill, so that pair must clear AA
    // independently of the page background.
    expect(contrast(dark('accent-fill-text'), dark('accent-fill'))).toBeGreaterThanOrEqual(AA_BODY);
    expect(contrast(light('accent-fill-text'), light('accent-fill'))).toBeGreaterThanOrEqual(AA_BODY);

    // A selected chip must also stay distinguishable from the page it sits on.
    expect(contrast(dark('accent-fill'), dark('bg'))).toBeGreaterThanOrEqual(3);
    expect(contrast(light('accent-fill'), light('bg'))).toBeGreaterThanOrEqual(3);

    // Components must consume the tokens rather than hardcoding colors, or the
    // guarantees above do not reach the rendered UI.
    expect(readRuleBody('.day-chip.active')).toMatch(/background\s*:\s*var\(--accent-fill\)/);
    expect(readRuleBody('.day-chip.active')).toMatch(/color\s*:\s*var\(--accent-fill-text\)/);
    expect(readRuleBody('.day-weekday')).toMatch(/color\s*:\s*var\(--accent-text\)/);
    expect(readRuleBody('.school-countdown-value')).toMatch(/color\s*:\s*var\(--accent-text\)/);
  });
});

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

describe('App layout CSS', () => {
  it('lets lower menu sections expand instead of clipping published items', () => {
    const body = readRuleBody('.sections-rest');

    expect(body).toMatch(/flex\s*:\s*0\s+0\s+auto/);
    expect(body).not.toMatch(/overflow\s*:\s*hidden/);
  });

  it('uses contrast-safe accent tokens for small blue text and filled controls', () => {
    expect(readRuleBody(':root')).toMatch(/--accent-fill\s*:\s*#2563eb/);
    expect(readRuleBody(':root')).toMatch(/--accent-fill-text\s*:\s*#ffffff/);
    expect(readRuleBody(":root[data-theme='light']")).toMatch(/--accent-text\s*:\s*#1d4ed8/);

    expect(readRuleBody('.day-chip.active')).toMatch(/background\s*:\s*var\(--accent-fill\)/);
    expect(readRuleBody('.day-chip.active')).toMatch(/color\s*:\s*var\(--accent-fill-text\)/);
    expect(readRuleBody('.day-weekday')).toMatch(/color\s*:\s*var\(--accent-text\)/);
    expect(readRuleBody('.school-countdown-value')).toMatch(/color\s*:\s*var\(--accent-text\)/);
  });
});

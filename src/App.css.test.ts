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
});

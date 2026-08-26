#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateMenuArtifact } from '../shared/menu-contract.ts';
import { isNearSchoolYearEnd, isPWCSSummerBreak } from '../shared/pwcs-calendar.ts';
import { evaluateRefreshDeadline } from './refresh-deadline.ts';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactPath = path.join(__dirname, '../public/menu-data.json');

function withCacheBust(urlString: string): string {
  const url = new URL(urlString);
  url.searchParams.set('health', new Date().toISOString());
  return url.toString();
}

async function readArtifact(): Promise<unknown> {
  const artifactUrl = process.env.MENU_ARTIFACT_URL;

  if (artifactUrl) {
    const response = await fetch(withCacheBust(artifactUrl));
    if (!response.ok) {
      throw new Error(`Failed to fetch production artifact: ${response.status}`);
    }
    return response.json() as Promise<unknown>;
  }

  return JSON.parse(fs.readFileSync(artifactPath, 'utf8')) as unknown;
}

async function main(): Promise<void> {
  const quietPeriod = isNearSchoolYearEnd(todayISO()) || isPWCSSummerBreak(todayISO());
  const artifact = validateMenuArtifact(await readArtifact(), undefined, {
    enforcePlausibility: !quietPeriod,
  });

  const result = evaluateRefreshDeadline(artifact.meta.expectedNextRefreshAt, quietPeriod);

  if (!result.ok) {
    throw new Error(result.message);
  }

  console.log(result.message);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

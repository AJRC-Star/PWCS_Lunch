#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateMenuArtifact } from '../shared/menu-contract.ts';
import type { SharedMenuResponse } from '../shared/menu-core.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactPath = path.join(__dirname, '../public/menu-data.json');

function readArtifact(): SharedMenuResponse {
  const raw = fs.readFileSync(artifactPath, 'utf8');
  return JSON.parse(raw) as SharedMenuResponse;
}

function main(): void {
  const artifact = readArtifact();
  // enforcePlausibility is deliberately off: plausibility is a *freshness*
  // property judged against the current clock, so leaving it on makes the
  // committed artifact age into a CI failure that blocks PRs touching no data
  // at all — and, because deploy.yml gates on a green CI, blocks the very
  // refresh that would fix it.  Freshness is owned by check-artifact-freshness
  // (the dedicated watchdog) and by fetch-menu at write time; this gate checks
  // that the committed artifact is structurally and semantically well-formed.
  validateMenuArtifact(artifact, undefined, { enforcePlausibility: false });
  console.log(`Artifact validation passed for ${artifactPath}`);
}

main();

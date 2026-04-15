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
  validateMenuArtifact(artifact);
  console.log(`Artifact validation passed for ${artifactPath}`);
}

main();

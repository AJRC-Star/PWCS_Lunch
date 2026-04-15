#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { SharedMenuResponse } from '../shared/menu-core.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactPath = path.join(__dirname, '../public/menu-data.json');

function readArtifact(): SharedMenuResponse {
  return JSON.parse(fs.readFileSync(artifactPath, 'utf8')) as SharedMenuResponse;
}

function main(): void {
  const artifact = readArtifact();
  const visibleDays = artifact.days.length;
  const noSchoolDays = artifact.days.filter((day) => day.no_school).length;
  const noInfoDays = artifact.days.filter((day) => day.no_information_provided).length;
  const startISO = artifact.days[0]?.iso ?? '—';
  const endISO = artifact.days[artifact.days.length - 1]?.iso ?? '—';

  console.log('## Menu Artifact Summary');
  console.log('');
  console.log(`- schemaVersion: ${artifact.meta.schemaVersion}`);
  console.log(`- snapshotGeneratedAt: ${artifact.meta.snapshotGeneratedAt}`);
  console.log(`- expectedNextRefreshAt: ${artifact.meta.expectedNextRefreshAt}`);
  console.log(`- schoolName: ${artifact.meta.schoolName}`);
  console.log(`- visibleDays: ${visibleDays}`);
  console.log(`- noSchoolDays: ${noSchoolDays}`);
  console.log(`- noInformationDays: ${noInfoDays}`);
  console.log(`- range: ${startISO} -> ${endISO}`);
}

main();

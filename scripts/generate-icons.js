#!/usr/bin/env node

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const svgPath = path.join(__dirname, '../public/icon.svg');
const sizes = [192, 512];

async function generateIcons() {
  try {
    console.log('Generating PNG icons from SVG...');

    for (const size of sizes) {
      const outputPath = path.join(__dirname, `../public/icon-${size}.png`);

      await sharp(svgPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated icon-${size}.png`);
    }

    console.log('✓ All icons generated successfully');
  } catch (error) {
    console.error('✗ Failed to generate icons:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

generateIcons();

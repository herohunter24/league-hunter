import { copyFileSync, mkdirSync, existsSync, cpSync } from 'fs';
import { join } from 'path';

const DIST = 'dist';

const staticFiles = [
  'index.html',
  'public.html',
  'search.html',
  'trading-cards-tiers.html',
  'trading-cards-tiers.pdf',
];

for (const file of staticFiles) {
  if (existsSync(file)) {
    copyFileSync(file, join(DIST, file));
    console.log(`Copied ${file} → ${DIST}/${file}`);
  }
}

if (existsSync('archive')) {
  mkdirSync(join(DIST, 'archive'), { recursive: true });
  cpSync('archive', join(DIST, 'archive'), { recursive: true });
  console.log(`Copied archive/ → ${DIST}/archive/`);
}

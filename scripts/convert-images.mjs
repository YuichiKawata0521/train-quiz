import sharp from 'sharp';
import { readdirSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const SRC = 'assets-src/trains';
const OUT = 'public/images/trains';
mkdirSync(OUT, { recursive: true });
for (const file of readdirSync(SRC)) {
  const id = path.parse(file).name;
  await sharp(path.join(SRC, file))
    .rotate()
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(path.join(OUT, `${id}.webp`));
  console.log('converted:', id);
}

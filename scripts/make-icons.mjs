import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

mkdirSync('public/icons', { recursive: true });
for (const size of [192, 512, 180]) {
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
  await sharp('public/icon.svg').resize(size, size).png().toFile(`public/icons/${name}`);
  console.log('generated:', name);
}

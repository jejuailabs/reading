import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const originals = path.resolve('artifacts/illustration-concepts/classics-v1');
const target = path.resolve('public/illustrations/classics-v1');
await fs.mkdir(target, {recursive: true});
for (const name of ['korean', 'aesop']) {
  await sharp(path.join(originals, `${name}.png`)).keepIccProfile().webp({quality: 88}).toFile(path.join(target, `${name}.webp`));
  console.log(`Prepared ${name}.webp without cropping or resizing.`);
}

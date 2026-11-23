// Runs after every build. Shrinks the copies of the logo files in dist/brand: on the site the
// wordmark is never wider than 176px, so 560px is sharp even on a 3× iPhone screen.
// The originals in public/brand are never touched. (Photos are resized by Astro itself:
// see src/components/Photo.astro.)
import sharp from 'sharp';
import { readdir, stat, rename, unlink } from 'node:fs/promises';
import { join, extname } from 'node:path';

const DIR = 'dist/brand';
const MAX_WIDTH = 560;

let files = [];
try { files = await readdir(DIR); } catch { process.exit(0); }
for (const name of files) {
  if (extname(name).toLowerCase() !== '.png') continue;
  const path = join(DIR, name);
  const before = (await stat(path)).size;
  await sharp(path).resize({ width: MAX_WIDTH, withoutEnlargement: true }).png({ compressionLevel: 9, palette: true }).toFile(path + '.tmp');
  const after = (await stat(path + '.tmp')).size;
  if (after >= before) { await unlink(path + '.tmp'); continue; }
  await rename(path + '.tmp', path);
  console.log(`${DIR}/${name}: ${Math.round(before / 1024)} KB -> ${Math.round(after / 1024)} KB`);
}

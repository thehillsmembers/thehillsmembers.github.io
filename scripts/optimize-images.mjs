// Runs after every build. Shrinks the photos copied into dist/images so the site stays fast,
// even if the originals in public/images are large phone photos. Your originals are never touched.
import sharp from 'sharp';
import { readdir, stat, rename, unlink } from 'node:fs/promises';
import { join, extname } from 'node:path';

// dist/brand holds copies of the logo files; the originals in public/brand stay as they are.
const DIRS = ['dist/images', 'dist/images/experiences', 'dist/brand'];
const MAX_WIDTH = 2000;

for (const DIR of DIRS) {
let files = [];
try { files = await readdir(DIR); } catch { continue; }
for (const name of files) {
  const ext = extname(name).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) continue;
  const path = join(DIR, name);
  const before = (await stat(path)).size;
  let img = sharp(path).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true });
  if (ext === '.png') img = img.png({ compressionLevel: 9, palette: false });
  else if (ext === '.webp') img = img.webp({ quality: 78 });
  else img = img.jpeg({ quality: 78, mozjpeg: true });
  await img.toFile(path + '.tmp');
  const after = (await stat(path + '.tmp')).size;
  if (after >= before) { await unlink(path + '.tmp'); continue; }
  await rename(path + '.tmp', path);
  console.log(`${DIR}/${name}: ${Math.round(before / 1024)} KB -> ${Math.round(after / 1024)} KB`);
}
}

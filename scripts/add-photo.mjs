// npm run photo -- <file> <place> [left,top,width,height]
//   e.g.  npm run photo -- ~/Downloads/IMG_1234.jpg hero
// Saves a photo for one of the places on the site as src/assets/photos/<place>.jpg: turned upright,
// at most 2400px on its long side, and without hidden data such as the camera, the date, a GPS
// location or an embedded preview (this repository is public). The photographer's credit (Artist,
// Copyright) is kept.
// The optional last argument keeps only that part of the photo (in pixels of the upright photo),
// for example to leave out a logo printed on it.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { dropThumbnail } from './drop-thumbnail.mjs';

const [, , file, place, part] = process.argv;
const site = parse(await readFile(new URL('../content/site.yaml', import.meta.url), 'utf8'));
const places = Object.keys(site.photos ?? {});
if (!file || !places.includes(place)) {
  console.error(`Usage: npm run photo -- <file> <place>\nPlaces: ${places.join(', ')}`);
  process.exit(1);
}

// The two text fields of the photo's first EXIF directory that name the photographer
function credit(exif) {
  const found = {};
  if (!exif || exif.toString('latin1', 0, 4) !== 'Exif') return found;
  const t = 6;
  const le = exif.toString('latin1', t, t + 2) === 'II';
  const u16 = (o) => (le ? exif.readUInt16LE(t + o) : exif.readUInt16BE(t + o));
  const u32 = (o) => (le ? exif.readUInt32LE(t + o) : exif.readUInt32BE(t + o));
  const fields = { 0x013b: 'Artist', 0x8298: 'Copyright' };
  const ifd = u32(4);
  for (let i = 0; i < u16(ifd); i++) {
    const entry = ifd + 2 + i * 12;
    const field = fields[u16(entry)];
    if (!field || u16(entry + 2) !== 2) continue;
    const count = u32(entry + 4);
    const at = count > 4 ? u32(entry + 8) : entry + 8;
    const text = exif.toString('utf8', t + at, t + at + count).replace(/\0+$/, '').trim();
    if (text) found[field] = text;
  }
  return found;
}

const { exif } = await sharp(file).metadata();
const keep = credit(exif);
let image = sharp(file).rotate();
if (part) {
  const [left, top, width, height] = part.split(',').map(Number);
  image = image.extract({ left, top, width, height });
}
image = image.resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true });
if (Object.keys(keep).length) image = image.withExif({ IFD0: keep });
const out = fileURLToPath(new URL(`../src/assets/photos/${place}.jpg`, import.meta.url));
const { data, info } = await image.jpeg({ quality: 92, mozjpeg: true }).toBuffer({ resolveWithObject: true });
const photo = dropThumbnail(data);
await writeFile(out, photo);

console.log(`src/assets/photos/${place}.jpg: ${info.width}×${info.height}, ${Math.round(photo.length / 1024)} KB`);
if (keep.Artist || keep.Copyright) console.log(`Credit kept: ${keep.Artist ?? keep.Copyright}`);
if (!String(site.photos[place] ?? '').trim()) console.log(`Next: describe the photo under photos > ${place} in content/site.yaml.`);

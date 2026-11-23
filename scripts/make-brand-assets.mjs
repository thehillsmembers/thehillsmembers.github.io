// Builds the favicon set and the social sharing image from the logo PNGs in public/brand.
// Run with: npm run brand-assets  (only needed if the logo files change)
import sharp from 'sharp';

const NOITE = '#161513';
const brand = (f) => `public/brand/${f}`;

// The seal: Ouro monogram inside a Noite circle.
async function seal(size, file) {
  const circle = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${NOITE}"/></svg>`
  );
  const mono = await sharp(brand('monogram-ouro.png')).trim().resize({ width: Math.round(size * 0.5), height: Math.round(size * 0.5), fit: 'inside' }).toBuffer();
  await sharp(circle).composite([{ input: mono, gravity: 'center' }]).png().toFile(file);
}

// Apple icons look better as a full square (iOS rounds the corners itself).
async function square(size, file) {
  const mono = await sharp(brand('monogram-ouro.png')).trim().resize({ width: Math.round(size * 0.5), height: Math.round(size * 0.5), fit: 'inside' }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: NOITE } }).composite([{ input: mono, gravity: 'center' }]).png().toFile(file);
}

await seal(32, 'public/favicon-32.png');
await seal(192, 'public/icon-192.png');
await seal(512, 'public/icon-512.png');
await square(180, 'public/apple-touch-icon.png');

// Open Graph image: Ouro wordmark on Noite, 1200x630.
const word = await sharp(brand('wordmark-ouro.png')).trim().resize({ width: 820 }).toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 4, background: NOITE } })
  .composite([{ input: word, gravity: 'center' }])
  .png()
  .toFile('public/og.png');

console.log('Brand assets written to public/.');

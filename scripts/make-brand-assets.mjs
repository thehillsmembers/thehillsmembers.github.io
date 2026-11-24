// Builds the social sharing image (public/og.png) from the official wordmark in public/brand:
// Ouro on Noite, 1200x630. The logos and the favicons are the official files, as they came.
// Run with: npm run brand-assets  (only needed if the wordmark changes)
import sharp from 'sharp';

const word = await sharp('public/brand/wordmark-ouro.svg').trim().resize({ width: 820 }).toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 4, background: '#161513' } })
  .composite([{ input: word, gravity: 'center' }])
  .png()
  .toFile('public/og.png');

console.log('Written: public/og.png');

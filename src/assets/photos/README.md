# Photos

One file per place on the site, named after the place. Any of .jpg, .jpeg, .png or .webp.
Each photo is cropped to its place, so keep the subject near the middle. Large originals
are fine: the build makes small copies for phones and never touches these files.

| Nº | File | Place | Shape |
|----|------|-------|-------|
| 1 | hero | Top of the home page | 16:10 landscape (15:16 on phones) |
| 2 | table-of-seven | Experiences carousel | 4:5 portrait |
| 3 | seven-hills-run | Experiences carousel | 4:5 portrait |
| 4 | court-sessions | Experiences carousel | 4:5 portrait |
| 5 | culture-nights | Experiences carousel | 4:5 portrait |
| 6 | off-the-hills | Experiences carousel | 4:5 portrait |
| 7 | circle | The Circle | 3:4 portrait |
| 8 | join | How to join | 4:5 portrait |
| 9 | partners | Partners | 16:10 landscape (15:16 on phones) |
| 10 | lisbon | Cities | 16:10 landscape |
| 11 | london | Cities | 16:10 landscape |

To add a photo someone sent: `npm run photo -- <file> <place>` (for example
`npm run photo -- ~/Downloads/IMG_1234.jpg hero`). It saves the photo upright, at most 2400 px,
and without hidden data such as a GPS location (this repository is public). The photographer's
credit is kept.

For sharp results on iPhones and large screens, photos should be at least 2000 px wide for
hero and partners, 1200 px for the cities, circle and join, and 800 px for the experience cards.

A short description of each photo goes in `content/site.yaml`, under `photos`. If a crop
cuts off what matters, `photo_focus` in the same file keeps the top, bottom, left or right of
that photo in view.
A city added to the cities list gets its own place (named after the city).
`npm run build` stops while a photo or its description is missing, so the live site never
shows an empty box. `npm run dev` shows numbered boxes instead.

// Generates responsive web derivatives from the original AFTERGLOW masters.
// Masters are read from the asset collection one level up and never modified.
// Usage: npm run images
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const OUT = path.resolve(here, '../assets/img');

// [output name, master path relative to the collection root, target widths, optional crop region, optional quality]
const SCENE_Q = { webp: 86, avif: 64 };

const JOBS = [
  ['logo', 'Images/MAIN LOGO.JPG', [480, 960, 1440]],
  ['hero-art', 'Website UI/mobile-hero.png', [480, 720, 941]],
  ['vyra-nor', 'Marketing/vyra-nor-artist.png', [640, 1024, 1440, 1774]],
  ['artist-nightdrive', 'Images/ARTISTS/NIGHTDRIVE.JPG', [480, 800, 1200]],
  ['artist-luna-vex', 'Images/ARTISTS/LUNA VEX.JPG', [480, 800, 1200]],
  ['artist-kairo', 'Images/ARTISTS/KAIRO.JPG', [480, 800, 1200]],
  ['artist-jax-xen', 'Images/ARTISTS/JAX XEN.JPG', [480, 800, 1200]],
  ['artist-blkout', 'Images/ARTISTS/BLKOUT.JPG', [480, 800, 1200]],
  ['artist-ayla-rae', 'Images/ARTISTS/AYLA RAE.JPG', [480, 800, 1200]],
  ['lineup-poster', 'Marketing/lineup-poster.png', [480, 800, 1024]],
  ['hero-poster', 'Marketing/hero-poster.png', [480, 800, 1024]],
  ['pass-ga', 'Ticketing + Maps/pass-ga.png', [320, 520, 800]],
  ['pass-ga-plus', 'Ticketing + Maps/pass-ga-plus.png', [320, 520, 800]],
  ['pass-vip', 'Ticketing + Maps/pass-vip.png', [320, 520, 800]],
  ['pass-3-day', 'Ticketing + Maps/pass-3-day.png', [320, 520, 800]],
  ['wristbands', 'Ticketing + Maps/wristbands.png', [640, 1024, 1536]],
  ['festival-map', 'Ticketing + Maps/festival-map.png', [768, 1152, 1536]],
  ['shirt-eclipse', 'Merchandise/shirt-eclipse.png', [480, 800, 1200]],
  ['shirt-desert', 'Merchandise/shirt-desert.png', [480, 800, 1200]],
  ['hoodie', 'Merchandise/hoodie.png', [480, 800, 1200]],
  ['hat', 'Merchandise/hat.png', [480, 800, 1200]],
  ['bandana', 'Merchandise/bandana.png', [480, 800, 1200]],
  ['tote', 'Merchandise/tote.png', [480, 800, 1200]],
  ['bottle', 'Merchandise/bottle.png', [480, 800, 1200]],
  ['stickers', 'Merchandise/stickers.png', [400, 680, 1024]],
  ['food-vendors', 'Brand World/food-vendors.png', [560, 900, 1402]],
  ['concept-sponsors', 'Brand World/concept-sponsors.png', [560, 900, 1400]],
  ['confirmation-ticket', 'Brand World/confirmation-ticket.png', [480, 800]],
  ['confirmation-signup', 'Brand World/confirmation-signup.png', [480, 800]],
  ['overlay-dust', 'Brand World/overlay-dust.png', [960, 1536]],
  ['overlay-smoke', 'Brand World/overlay-smoke.png', [960, 1536]],
  ['overlay-sparks', 'Brand World/overlay-sparks.png', [960, 1536]],
  ['overlay-light', 'Brand World/overlay-light.png', [1200, 2172]],
  // Experience scene artwork (1536×1024 masters from afterglow-scenes/, see assets/src/scenes/README.md).
  // Higher quality than the default: the volumetric light and haze gradients band at lower settings.
  ['scene-eclipse', 'output/assets/src/scenes/scene-eclipse.png', [480, 800, 1200, 1536], null, SCENE_Q],
  ['scene-solar', 'output/assets/src/scenes/scene-solar.png', [480, 800, 1200, 1536], null, SCENE_Q],
  ['scene-pulse', 'output/assets/src/scenes/scene-pulse.png', [480, 800, 1200, 1536], null, SCENE_Q],
  ['scene-art', 'output/assets/src/scenes/scene-art.png', [480, 800, 1200, 1536], null, SCENE_Q],
];

const only = process.argv.slice(2);

await mkdir(OUT, { recursive: true });
const report = {};
let total = 0;

for (const [name, src, widths, crop, q] of JOBS) {
  if (only.length && !only.includes(name)) continue;
  const load = () => (crop ? sharp(path.join(ROOT, src)).extract(crop) : sharp(path.join(ROOT, src)));
  const meta = crop ? { ...(await sharp(path.join(ROOT, src)).metadata()), ...crop } : await sharp(path.join(ROOT, src)).metadata();
  report[name] = { source: src, crop, width: meta.width, height: meta.height, alpha: !!meta.hasAlpha, files: [] };
  for (const w of widths) {
    const width = Math.min(w, meta.width);
    const base = load().resize({ width, withoutEnlargement: true });
    const webp = await base.clone().webp({ quality: q?.webp ?? (meta.hasAlpha ? 80 : 78), alphaQuality: 90, effort: 5, smartSubsample: true }).toBuffer();
    const avif = await base.clone().avif({ quality: q?.avif ?? 52, effort: 4, chromaSubsampling: q ? '4:4:4' : '4:2:0' }).toBuffer();
    for (const [ext, buf] of [['webp', webp], ['avif', avif]]) {
      const file = `${name}-${width}.${ext}`;
      await writeFile(path.join(OUT, file), buf);
      report[name].files.push({ file, bytes: buf.length });
      total += buf.length;
    }
  }
  console.log(`${name.padEnd(22)} ${meta.width}x${meta.height}${meta.hasAlpha ? ' alpha' : ''}`);
}

if (!only.length) {
// Social sharing image: JPEG for the widest crawler support.
const og = await sharp(path.join(ROOT, 'Marketing/open-graph.png'))
  .resize(1200, 630, { fit: 'cover' })
  .jpeg({ quality: 82, mozjpeg: true })
  .toBuffer();
await writeFile(path.join(OUT, 'open-graph-1200.jpg'), og);
total += og.length;
}

if (!only.length) await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(report, null, 2));
console.log(`\nWrote ${(total / 1024 / 1024).toFixed(1)} MB of derivatives to assets/img`);

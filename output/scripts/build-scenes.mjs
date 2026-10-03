// SUPERSEDED: the site now uses final scene artwork (afterglow-scenes/, copied to assets/src/scenes/).
// This script only regenerates the earlier vector placeholders, into assets/src/scenes-placeholder/.
// Composes the four Experience scene illustrations.
// Each scene = the desert landscape from the supplied text-free hero art (Website UI/mobile-hero.png),
// recoloured per stage, + the supplied smoke/spark overlays tinted to the stage colour,
// + an authored neon vector stage whose emblem follows that stage's identity on the concept map.
// Neon bloom is produced in raster (blurred copies screened beneath crisp lines).
// Output: assets/src/scenes-placeholder/*.png (not used by the site).
// Usage: npm run scenes
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
// Writes to a separate folder so it can never overwrite the final artwork in assets/src/scenes/.
const OUT = path.resolve(here, '../assets/src/scenes-placeholder');
const W = 1440, H = 960;          // output pixels
const VW = 960, VH = 640;         // SVG design units (rendered at 1.5×)

const PAL = { green: '#19F58A', gold: '#FFC83A', orange: '#FF6A1A', cyan: '#14D9FF', pink: '#FF4DB8', purple: '#8D42FF' };

// Deterministic randomness so rebuilds are identical.
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

const svgDoc = (body, c1 = '#fff', c2 = '#fff') => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${VW} ${VH}">
  <defs>
    <linearGradient id="beam" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="${c1}" stop-opacity=".5"/><stop offset=".55" stop-color="${c2}" stop-opacity=".1"/><stop offset="1" stop-color="${c2}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="haze" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="${c1}" stop-opacity=".5"/><stop offset="1" stop-color="${c1}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="floor" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="${c1}" stop-opacity=".95"/><stop offset=".45" stop-color="${c1}" stop-opacity=".45"/><stop offset="1" stop-color="${c1}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="wall" cx=".5" cy=".5" r=".7">
      <stop offset="0" stop-color="${c1}" stop-opacity=".32"/><stop offset=".55" stop-color="${c2}" stop-opacity=".1"/><stop offset="1" stop-color="#050505" stop-opacity=".92"/>
    </radialGradient>
    <linearGradient id="crowdhaze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c1}" stop-opacity="0"/><stop offset=".12" stop-color="${c1}" stop-opacity="1"/>
    </linearGradient>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#050505" stop-opacity=".9"/><stop offset=".4" stop-color="#050505" stop-opacity=".25"/><stop offset=".58" stop-color="#050505" stop-opacity=".1"/>
      <stop offset=".8" stop-color="#050505" stop-opacity=".2"/><stop offset="1" stop-color="#050505" stop-opacity=".55"/>
    </linearGradient>
    <radialGradient id="vignette" cx=".5" cy=".46" r=".78">
      <stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/>
    </radialGradient>
  </defs>${body}</svg>`);

const star = (x, y, r, color) =>
  `<path d="M${x} ${y - r}L${x + r * .16} ${y - r * .16}L${x + r} ${y}L${x + r * .16} ${y + r * .16}L${x} ${y + r}L${x - r * .16} ${y + r * .16}L${x - r} ${y}L${x - r * .16} ${y - r * .16}Z" fill="${color}"/>`;

function beams(cx, baseY, count, spread, len, width, seed) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1) - .5;
    const ang = t * spread + (r() - .5) * .1;
    const x0 = cx + t * width;
    const tipX = x0 + Math.sin(ang) * len, tipY = baseY - Math.cos(ang) * len;
    const wTip = 18 + r() * 16;
    out += `<polygon points="${x0 - 2},${baseY} ${x0 + 2},${baseY} ${tipX + wTip},${tipY} ${tipX - wTip},${tipY}" fill="url(#beam)" opacity="${.45 + r() * .45}"/>`;
  }
  return out;
}

// Crowd silhouettes against the lit floor: rows grow toward the viewer; some raised hands and phone lights.
function crowd(seed, { top = 436, rows = 6, density = 1, rim = '#fff', haze = rim } = {}) {
  const r = rng(seed);
  let out = '';
  for (let row = 0; row < rows; row++) {
    // Light haze over rows already drawn: farther rows read lighter, so silhouettes separate.
    if (row) out += `<rect x="0" y="${top - 60}" width="${VW}" height="${VH - top + 60}" fill="url(#crowdhaze)" opacity=".09"/>`;
    const scale = .55 + row * .3;
    const y = top + row * 12 + row * row * 3.2;
    const step = 13 * scale / density;
    for (let x = -20 + r() * step; x < VW + 20; x += step * (.75 + r() * .55)) {
      const hy = y + (r() - .5) * 5 * scale;
      const hr = 5.6 * scale;
      const foot = hy + hr * 9; // figure height ≈ 9 head radii below the head centre
      out += `<path d="M${x - hr * 1.6} ${foot}L${x - hr * 2.1} ${hy + hr * 2.6}Q${x - hr * 2} ${hy + hr * 1.3} ${x} ${hy + hr * 1.3}Q${x + hr * 2} ${hy + hr * 1.3} ${x + hr * 2.1} ${hy + hr * 2.6}L${x + hr * 1.6} ${foot}Z" fill="#030203"/>`;
      out += `<circle cx="${x}" cy="${hy}" r="${hr}" fill="#030203"/>`;
      if (row < 5) out += `<path d="M${x - hr * .8} ${hy - hr * .6}A${hr} ${hr} 0 0 1 ${x + hr * .8} ${hy - hr * .6}" fill="none" stroke="${rim}" stroke-opacity=".55" stroke-width="${.7 * scale}"/>`;
      if (r() < .14) {
        const side = r() < .5 ? -1 : 1;
        const ax = x + side * hr * 1.5, ay = hy + hr * 1.6;
        const tx = ax + side * hr * (.3 + r() * .9), ty = hy - hr * (2.4 + r() * 1.8);
        out += `<path d="M${ax} ${ay}L${tx} ${ty}" stroke="#030203" stroke-width="${hr * .7}" stroke-linecap="round"/>`;
        if (r() < .3) out += `<rect x="${tx - .9 * scale}" y="${ty - 3 * scale}" width="${1.8 * scale}" height="${2.6 * scale}" fill="#fff" opacity=".9"/>`;
      }
    }
  }
  return out;
}

function truss(x, y, w, h, color) {
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${color}" stroke-width="1.6"/>`;
  for (let yy = y; yy < y + h - 1; yy += w) out += `<path d="M${x} ${yy}L${x + w} ${Math.min(yy + w, y + h)}M${x + w} ${yy}L${x} ${Math.min(yy + w, y + h)}" stroke="${color}" stroke-width=".9" opacity=".7"/>`;
  return out;
}
const speakers = (x, y, color, n = 4) => Array.from({ length: n }, (_, i) =>
  `<rect x="${x}" y="${y + i * 17}" width="30" height="15" fill="#070507" stroke="${color}" stroke-width="1" stroke-opacity=".7"/>`).join('');

// Each scene returns three layers: back (light/haze), neon (gets bloom), front (crowd, foreground).
const SCENES = {
  // ECLIPSE STAGE — main stage, pink. Map identity: eclipse ring with a vertical solar line.
  eclipse: {
    hue: -55, c1: PAL.pink, c2: PAL.purple,
    back: (c) => `
      <ellipse cx="480" cy="330" rx="400" ry="150" fill="url(#haze)"/>
      ${beams(480, 250, 11, 1.7, 360, 300, 3)}
      <ellipse cx="480" cy="436" rx="470" ry="62" fill="url(#floor)"/>`,
    neon: (c) => `
      <path d="M296 250H664" stroke="${c.c1}" stroke-width="4"/>
      ${truss(282, 238, 18, 182, c.c1)}${truss(660, 238, 18, 182, c.c1)}
      ${speakers(246, 342, c.c1)}${speakers(684, 342, c.c1)}
      <rect x="318" y="264" width="324" height="140" fill="url(#wall)" stroke="${c.c1}" stroke-width="2.5"/>
      <circle cx="480" cy="334" r="56" fill="#050305" stroke="${c.c1}" stroke-width="5"/>
      <circle cx="480" cy="334" r="56" fill="none" stroke="#fff" stroke-width="1.2" opacity=".9"/>
      <path d="M480 286V382" stroke="${PAL.gold}" stroke-width="2.6"/>
      ${star(480, 334, 17, PAL.gold)}
      <path d="M232 420H728" stroke="${c.c1}" stroke-width="3.5"/>
      ${star(812, 116, 8, '#fff')}${star(138, 84, 5, PAL.cyan)}`,
    front: (c) => crowd(7, { rim: c.c1 }),
  },
  // SOLAR STAGE — orange. Map identity: sunburst arch over a circular emblem.
  solar: {
    hue: 0, c1: PAL.orange, c2: PAL.gold,
    back: (c) => `
      <ellipse cx="480" cy="330" rx="420" ry="170" fill="url(#haze)"/>
      ${beams(480, 300, 7, 1.3, 340, 200, 5)}
      <ellipse cx="480" cy="436" rx="470" ry="62" fill="url(#floor)"/>`,
    neon: (c) => {
      let rays = '';
      for (let i = 0; i <= 18; i++) {
        const a = Math.PI + (i / 18) * Math.PI, r0 = 136, r1 = 176 + (i % 2) * 34;
        rays += `<path d="M${480 + Math.cos(a) * r0} ${352 + Math.sin(a) * r0}L${480 + Math.cos(a) * r1} ${352 + Math.sin(a) * r1}" stroke="${i % 2 ? PAL.gold : c.c1}" stroke-width="${i % 2 ? 1.6 : 3}"/>`;
      }
      return `${rays}
      ${speakers(300, 352, c.c1)}${speakers(630, 352, c.c1)}
      <path d="M346 420V352A134 134 0 0 1 614 352V420" fill="url(#wall)" stroke="${c.c1}" stroke-width="5"/>
      <path d="M370 420V356A110 110 0 0 1 590 356V420" fill="none" stroke="${PAL.gold}" stroke-width="1.6" opacity=".9"/>
      <circle cx="480" cy="356" r="42" fill="#060403" stroke="${PAL.gold}" stroke-width="4.5"/>
      <path d="M480 320V392" stroke="${c.c1}" stroke-width="2.6"/>
      ${star(480, 356, 13, '#fff')}
      <path d="M262 420H698" stroke="${c.c1}" stroke-width="3.5"/>
      ${star(150, 120, 6, PAL.gold)}`;
    },
    front: (c) => crowd(19, { rim: c.c2 }),
  },
  // PULSE STAGE — purple. Map identity: headphones around a heartbeat waveform.
  pulse: {
    hue: -115, c1: PAL.purple, c2: PAL.pink,
    back: (c) => {
      let lasers = '';
      for (let i = 0; i < 8; i++) lasers += `<path d="M${400 + i * 23} 262L${-80 + i * 160} ${-10 + (i % 3) * 40}" stroke="${i % 2 ? PAL.cyan : c.c2}" stroke-width="1.2" opacity=".75"/>`;
      return `<ellipse cx="480" cy="330" rx="420" ry="170" fill="url(#haze)"/>${lasers}
      <ellipse cx="480" cy="436" rx="470" ry="62" fill="url(#floor)"/>`;
    },
    neon: (c) => {
      let eq = '';
      const r = rng(41);
      for (let i = 0; i < 6; i++) {
        const h1 = 24 + r() * 86, h2 = 24 + r() * 86;
        eq += `<rect x="${300 + i * 10}" y="${404 - h1}" width="6" height="${h1}" fill="${i % 2 ? PAL.cyan : c.c2}"/>`;
        eq += `<rect x="${604 + i * 10}" y="${404 - h2}" width="6" height="${h2}" fill="${i % 2 ? PAL.cyan : c.c2}"/>`;
      }
      return `
      <path d="M290 262H670" stroke="${c.c1}" stroke-width="4"/>
      ${truss(276, 250, 16, 170, c.c1)}${truss(668, 250, 16, 170, c.c1)}
      <rect x="296" y="272" width="368" height="134" fill="url(#wall)" stroke="${c.c1}" stroke-width="2.5"/>
      ${eq}
      <path d="M418 346V324A62 62 0 0 1 542 324V346" fill="none" stroke="${c.c1}" stroke-width="6"/>
      <rect x="404" y="336" width="26" height="46" rx="8" fill="#08050c" stroke="${c.c1}" stroke-width="4.5"/>
      <rect x="530" y="336" width="26" height="46" rx="8" fill="#08050c" stroke="${c.c1}" stroke-width="4.5"/>
      <path d="M438 360H452L460 340L470 380L482 330L492 372L500 352L522 352" fill="none" stroke="${c.c2}" stroke-width="3.2" stroke-linejoin="round"/>
      <path d="M252 420H708" stroke="${c.c1}" stroke-width="3.5"/>
      ${star(806, 108, 7, PAL.cyan)}`;
    },
    front: (c) => crowd(29, { rim: c.c2 }),
  },
  // ART PLAZA — green. Map identity: monoline pyramid crowned by an eclipse ring.
  art: {
    hue: 125, c1: PAL.green, c2: PAL.cyan,
    back: (c) => `
      <ellipse cx="480" cy="360" rx="380" ry="190" fill="url(#haze)"/>
      <ellipse cx="480" cy="468" rx="470" ry="80" fill="url(#floor)" opacity=".7"/>`,
    neon: (c) => {
      let contours = '';
      for (let i = 1; i <= 8; i++) contours += `<ellipse cx="480" cy="470" rx="${60 + i * 56}" ry="${12 + i * 11}" fill="none" stroke="${c.c1}" stroke-width="1.1" opacity="${.7 - i * .07}"/>`;
      const crystal = (x, y, s, col) => `<path d="M${x} ${y - 46 * s}L${x + 13 * s} ${y}L${x - 13 * s} ${y}Z M${x} ${y - 46 * s}V${y}" fill="#050806" stroke="${col}" stroke-width="2"/>`;
      return `${contours}
      <path d="M480 214L626 458H334Z" fill="#040705" stroke="${c.c1}" stroke-width="5"/>
      <path d="M480 214L514 458M480 214L446 458M376 388H584M408 334H552" stroke="${c.c1}" stroke-width="1.6" opacity=".8"/>
      <circle cx="480" cy="182" r="42" fill="#040605" stroke="${c.c1}" stroke-width="4.5"/>
      <path d="M449 154A42 42 0 0 1 522 182" fill="none" stroke="${PAL.gold}" stroke-width="2.6"/>
      ${star(480, 182, 12, '#fff')}
      ${crystal(262, 474, 1.05, PAL.purple)}${crystal(220, 492, .75, PAL.cyan)}${crystal(700, 476, 1.15, PAL.cyan)}${crystal(748, 496, .72, PAL.purple)}${crystal(326, 502, .58, c.c1)}${crystal(636, 506, .62, c.c1)}
      ${star(772, 104, 7, PAL.gold)}${star(176, 132, 6, PAL.purple)}`;
    },
    front: (c) => crowd(43, { top: 540, rows: 2, density: .14, rim: c.c1 }),
  },
};

await mkdir(OUT, { recursive: true });
const heroArt = path.join(ROOT, 'Website UI/mobile-hero.png');

// Recolour an alpha overlay to one stage colour: alpha' = alpha × luminance × strength.
async function tintedOverlay(file, color, strength) {
  const { data, info } = await sharp(path.join(ROOT, 'Brand World', file))
    .resize(W, H, { fit: 'cover' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [cr, cg, cb] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] * .3 + data[i + 1] * .59 + data[i + 2] * .11) / 255;
    out[i] = cr; out[i + 1] = cg; out[i + 2] = cb;
    out[i + 3] = Math.min(255, data[i + 3] * lum * strength);
  }
  return sharp(out, { raw: info }).png().toBuffer();
}
async function bloom(neonPng, sigma, brightness) {
  // Blur a copy of the neon layer and lift it; composited with screen it reads as emitted light.
  const blurred = await sharp(neonPng).blur(sigma).png().toBuffer();
  // Re-composite a few times so the halo stays bright after the blur spreads it.
  return sharp({ create: { width: W, height: H, channels: 4, background: '#000000ff' } })
    .composite([{ input: blurred }, { input: blurred, blend: 'add' }, { input: blurred, blend: 'add' }]).modulate({ brightness }).png().toBuffer();
}

for (const [name, s] of Object.entries(SCENES)) {
  const bg = await sharp(heroArt)
    .extract({ left: 0, top: 880, width: 941, height: 627 })
    .resize(W, H)
    .modulate({ hue: s.hue, brightness: .62, saturation: .8 })
    .toBuffer();
  const neon = await sharp(svgDoc(s.neon(s), s.c1, s.c2)).png().toBuffer();
  await sharp(bg)
    .composite([
      { input: svgDoc(`<rect width="${VW}" height="${VH}" fill="url(#sky)"/>`) },
      { input: await tintedOverlay('overlay-smoke.png', s.c1, .55) },
      { input: svgDoc(s.back(s), s.c1, s.c2), blend: 'screen' },
      { input: await bloom(neon, 28, 1.6), blend: 'screen' },
      { input: await bloom(neon, 9, 1.4), blend: 'screen' },
      { input: neon },
      { input: svgDoc(s.front(s), s.c1, s.c2) },
      { input: await tintedOverlay('overlay-dust.png', s.c2, .5) },
      { input: svgDoc(`<rect width="${VW}" height="${VH}" fill="url(#vignette)"/>`) },
    ])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, `scene-${name}.png`));
  console.log(`scene-${name}.png`);
}

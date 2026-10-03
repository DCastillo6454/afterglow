# AFTERGLOW — concept festival website

A static, single-page site built from the AFTERGLOW asset collection in the parent folder. No framework and no build step for the page itself. Node is used only to generate images and run tests.

## Run it

```sh
npm install        # sharp (images) + puppeteer-core (tests)
npm run serve      # http://localhost:5173
npm test           # headless checks (needs the server running and a local Chrome/Edge)
npm run images     # regenerate assets/img from the original masters
```

`index.html` also opens directly from disk, but use the server when testing.

## Structure

| Path | Purpose |
| --- | --- |
| `index.html` | All page content: hero, lineup, passes, experience, map, merch, food & partners, mailing list, footer, plus the checkout dialog and zoomable image viewer |
| `css/afterglow-ui.css` | Copied unchanged from `Website UI/`. Provides tokens, buttons, cards, the loader and cursor styles |
| `css/site.css` | Layout and section styles built on those tokens |
| `js/afterglow-cursor.js` | The supplied decorative cursor, with the preview's demo handlers removed |
| `js/site.js` | Mobile nav, scroll reveal, zoom/pan image viewer, demo checkout and demo signup |
| `assets/fonts/` | Chakra Petch 500/600/700 (latin subset, self-hosted) with its SIL Open Font License |
| `assets/img/` | Generated AVIF + WebP derivatives at several widths. `manifest.json` maps each one to its master |
| `assets/ui/` | SVG dividers, glows, loader and favicon |
| `scripts/` | Image build, dev server, test suite |

The original masters are never modified. `scripts/build-images.mjs` reads them from `../` and keeps PNG alpha (logo, stickers, overlays).

## Content rules followed

- VYRA NOR is the sole headliner and gets the hero billing and the lead lineup card. The six supporting artists are equal-sized and appear in poster order, with no hierarchy implied.
- Unknown facts are stated briefly where they matter: dates and venue in the hero, set times in the lineup intro, pricing and benefits once under the passes. A short banner and the footer carry the concept/demo disclosure. There is no event year and no live countdown, and the sample countdown and ticket-sale art are not used.
- The map, vendors and partners are labelled as fictional.
- Logo art is used instead of a typed wordmark. All headings, artist names and practical information are real HTML text, and none is layered on top of art that already has text baked in.

## Demo flows

- **Checkout:** a pass button opens a modal with the tier preselected, name, email and a required "this is a demo" acknowledgement. No payment fields exist. Submitting shows a loader, then `confirmation-ticket` art with a "nothing was charged" message.
- **Mailing list:** validates the email address, then shows `confirmation-signup` art and a "nothing was sent or stored" message.
- Neither flow makes a network request or stores data. To make them real, replace the `setTimeout` in the checkout submit handler and the signup submit handler in `js/site.js`.

## Accessibility and motion

Includes a skip link, semantic landmarks, one `h1` with no skipped heading levels, and native `<dialog>` elements that trap focus, close on Esc and return focus to the button that opened them. Inline errors use `aria-invalid` and `role=status` announcements, and touch targets are at least 44px. Decorative overlays have empty alt text and `pointer-events: none`. Setting `prefers-reduced-motion: reduce` turns off the reveal animations, overlay drift, smooth scrolling and the cursor spark. Without JavaScript all content stays visible and the nav renders as plain links.

## Experience scenes

The four scenes in `assets/src/scenes/` (Eclipse, Solar and Pulse stages, plus the Art Plaza) are the final concept renders, supplied at 1536×1024 in `../afterglow-scenes/`. Their handoff is copied to `assets/src/scenes/README.md`. `npm run images` builds their derivatives at a higher quality setting than the other images, to keep the lighting gradients smooth.

Crops follow that handoff:

| Scene | Desktop | Mobile |
| --- | --- | --- |
| Eclipse | 2.2:1 banner at 50% 55% | 4:3 |
| Solar, Pulse | 4:3 | 4:3 |
| Art | 4:3 | 3:2 |

The captions are HTML.

`npm run scenes:placeholder` only regenerates the earlier vector placeholders, into `assets/src/scenes-placeholder/`. It never touches the final art.

## Typography

Display type, labels and buttons use **Chakra Petch** (SIL OFL 1.1, free for commercial use), whose chamfered corners echo the angular logo. Body copy uses the system UI font. Section titles share one size token (`--fs-h2`) and use `text-wrap: balance`.

## Image viewer

Art that opens in the viewer (headliner card, lineup poster, map, merch) shows full-screen with drag, pinch, wheel, double-tap, arrow-key and +/− zoom, plus a fit button and an "Open full size" link. The map uses `data-zoom="fill"` so on phones it opens at full screen height (about 2.6× fit) with legible labels.

## Not yet decided

- `og:image` uses a relative URL. Make it absolute once a domain exists.

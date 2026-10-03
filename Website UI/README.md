# Batch 04 — Website UI assets

Open preview.html to view the collection. No dependencies, fonts, build step or network needed. These are reusable UI assets, not a complete festival website.

- afterglow-ui.css: brand tokens, 48px minimum-height buttons (primary, cyan, gold, pink, disabled, hover, active, keyboard focus), responsive card borders, CSS loader, atmosphere, mobile crops.
- afterglow-ui.js: optional decorative spark cursor and preview interactions. Native cursor remains available; coarse pointers and reduced-motion preferences disable the decoration.
- Three scalable transparent SVG section dividers.
- eclipse-loader.svg: standalone animated loader, with reduced-motion support.
- cursor-spark.svg: standalone spark.
- glow-green.svg and glow-purple.svg: transparent scalable radial glows.
- mobile-hero.png: text-free 9:16 art generated using the built-in image generator; responsive 4:5 and 1:1 crops demonstrated via CSS, preserving the source.

Use actual button elements for actions and anchors for navigation. Add role=status and an accessible label when embedding a loading indicator. SVG/CSS components were authored directly for sharp rendering and interactive states; raster hero artwork used imagegen. Typography uses local Arial and monospace fallbacks because the reference board contains no licensed font files.

## Mobile artwork prompt

Use case: stylized-concept. Asset: mobile website hero background, portrait 9:16, edge-to-edge cinematic desert artwork matching AFTERGLOW brand reference. Immense eclipse suspended above layered desert mesas, green/cyan left rim transitioning to solar gold/orange right rim and subtle purple edge dust. Dark black sky, fine dust, dramatic light near horizon. Upper central third is mostly black within the eclipse and uncluttered, suitable for live white headline overlaid by website. Detailed desert landscape occupies bottom third. No words, no logo, no people, no buttons, no UI, no watermark. This is mobile art adapted from reference textures, not a poster.


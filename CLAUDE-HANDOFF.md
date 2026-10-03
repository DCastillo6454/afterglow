# AFTERGLOW — Claude build handoff

Read this file and ASSET-MANIFEST.json first. The asset collection covers all five planned batches for a fictional desert music festival. Use the existing imagery and visual direction to build the site.

## Essential creative decisions

- Festival name: AFTERGLOW.
- Campaign phrase: SUNSET TO MIDNIGHT.
- Brand world: desert mesas, eclipse rings, dust, smoke, four-point stars, luminous edges and sharp angular typography.
- VYRA NOR is the sole headliner. Preserve her supplied appearance and give her the leading visual and billing position.
- Supporting artists: NIGHTDRIVE, LUNA VEX, KAIRO, JAX XEN, BLKOUT, AYLA RAE. No further billing hierarchy or performance schedule has been established.
- Canonical matching headliner image: Marketing/vyra-nor-artist.png.
- The project is a concept festival. Dates, real venue, event year, prices, ticket benefits, age policy, set times, booking integrations and merchandise inventory have not been defined.

## Palette

| Token | Hex |
| --- | --- |
| Eclipse black | #050505 |
| Deep charcoal | #111111 |
| Neon green | #19F58A |
| Solar gold | #FFC83A |
| Burnt orange | #FF6A1A |
| Electric cyan | #14D9FF |
| Glow pink | #FF4DB8 |
| Pulse purple | #8D42FF |

Use high-contrast white for readable supporting content. Display type should be uppercase and angular. The source typography board describes styles but supplies no font files. Existing CSS uses Arial and monospace system fallbacks. Avoid recreating the AFTERGLOW wordmark as ordinary text when the logo artwork is appropriate.

## Folder map

| Folder | Contents and application |
| --- | --- |
| Images | Four original brand reference boards and six supporting artist graphics. The icon and texture boards are reference sheets. |
| Ticketing + Maps | GA, GA+, VIP and 3-Day pass graphics; wristband mockup; map-pin sheet; standalone legend; illustrated fictional grounds. |
| Merchandise | Two tee concepts, hoodie, hat, bandana, tote, bottle, transparent sticker assortment. Most files contain product front/reverse views together. |
| Marketing | Hero and lineup posters, Instagram post/story, ticket-sale graphic, sample countdown, Open Graph art, VYRA NOR artist card. |
| Website UI | Reusable CSS/JS, three SVG dividers, CSS and SVG eclipse loaders, cursor spark, SVG glows, text-free mobile hero, preview.html. |
| Brand World | Vendor/sponsor sheets, two confirmation graphics, two email headers, four alpha overlays. |

All paths in ASSET-MANIFEST.json are relative to the project root. Folder names contain spaces; resolve or URL-encode asset paths correctly in the chosen framework. Preserve originals and generate web derivatives separately.

## Reuse guidance

Use Website UI/afterglow-ui.css as the starting token/component system. Its button states, card treatments and reduced-motion rules can be adapted to the chosen stack. Website UI/afterglow-ui.js adds an optional decorative cursor while retaining the native pointer; its demo handlers belong only to the preview. Website UI/preview.html is a component showcase, not the festival site.

The mobile hero is a text-free 9:16 source. The preview demonstrates 4:5 and square CSS crops; those are not separate exported images. Most other marketing graphics have text baked into the image, so do not layer duplicate headings on top of them. For a responsive hero, compose live text over the text-free artwork or place the campaign poster as its own image.

The logo source is a black-background JPG. The map-pin, sticker, vendor and sponsor files are multi-item sheets. Individual transparent logos, separated print artwork and editable design-source files have not been supplied. They may need extraction or recreation if the site requires separate elements.

Tier colors: GA green; GA+ cyan; VIP gold; 3-Day pink/purple with multicolor accents. Treat 3-Day as the supplied weekend-pass concept; its relationship to access tiers remains undefined.

The map is fictional concept art. For consistent stage colors use the full map and legend: Eclipse pink, Solar orange, Pulse purple. The pin sheet includes alternative stage/music symbols and its stage colors are not all identical to the map. Do not imply that this is a surveyed venue or invent geographic coordinates.

Use the four Brand World overlays with preserved alpha. Keep them decorative and below controls. Their transparency was sampled and verified. Any motion should honor reduced-motion settings. The original UI preview received file-link and SVG validation; browser interaction and responsive visual QA remain part of the actual site build.

## Suggested site composition

Hero with VYRA NOR billing; lineup with seven artists; pass selection; festival experience and fictional map; merchandise gallery; food and fictional partners; newsletter; footer. This is a suggested composition, not an approved page count or technical stack.

Marketing/countdown.png is explicitly a sample “03” countdown. Do not start a live countdown until an event date exists. Ticket-sale artwork is campaign concept copy, not evidence of a live ticket sale. Confirmation graphics should only accompany a matching completed action; a portfolio demo should label its simulated flows. Prices and detailed benefits should remain unspecified until provided.

Keep key headings, artist names and practical information available as HTML text. Add suitable alt text to meaningful images and empty alt text to decorative overlays. Optimize image delivery using measured source dimensions from the manifest; retain PNG alpha when needed. Use the original high-resolution files as masters.

## Ready-to-paste starting prompt

Build a responsive AFTERGLOW concept festival website using this supplied asset collection. Read CLAUDE-HANDOFF.md and ASSET-MANIFEST.json first. Preserve the eclipse/desert visual identity and feature VYRA NOR as the sole headliner, with the six named supporting artists. Reuse the Website UI components and the supplied art where appropriate. Keep event facts that have not been provided unspecified. Start by inspecting the project and assets, then implement and test the site in the chosen stack. Ensure responsive layouts, readable text, keyboard access, reduced-motion support, optimized images, and clear behavior for demo ticket and signup flows.


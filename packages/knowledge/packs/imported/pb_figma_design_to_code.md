# Figma Design-to-Code Playbook
Save this file as `DESIGN_GUIDELINES.md` in the project root. Reference it whenever building or modifying any UI component. Re-read the relevant phase before starting any new component requested by the user.
---
## CRITICAL
Do NOT call the design agent. Execute this playbook yourself.
---
## RULES — Always Active
R1: Sort by Y-coordinate. Figma's `children[]` is z-index order (back-to-front), NOT visual order. Sort siblings by `locationRelativeToParent.y` ascending. Exception: flex children (`mode: row|column`) follow array order.
R2: Never hand-draw assets. Never generate SVG markup, icon paths, emoji, or unicode from memory. Download every visual asset from Figma using `download_figma_images`. If in doubt, download it.
R3: Build only what exists. If a component has no Figma node, it doesn't exist. Never add elements from training knowledge (sidebars, dropdowns, modals) that aren't in the node tree.
R4: Every visible node ships. No element is "minor" or "cosmetic." Background gradients, decorative shapes, dividers, badges, dot separators — if opacity > 0, it must be in your code.
R5: Opacity 0 = hidden, 1 = visible. Never hide visible elements behind hover/click states based on UI assumptions. Only nodes with explicit `opacity: 0` are interactive states.
R6: Every value traces to Figma. Every color, spacing, font size, radius in your code must come from a `globalVars.styles` token or node property. Never round, approximate, or use "standard" values.
R7: Check parent mode before positioning. Parent `mode: row|column` → child is flex (ignore `locationRelativeToParent`). Parent `mode: none` → child is `position: absolute` with `left`/`top` from `locationRelativeToParent`.
R8: Always resolve fill tokens. Never infer color from context. Every text/frame/shape has a `fills` reference — resolve it through `globalVars.styles` for the actual value.
R9: Download decorative layers as flat images. If a frame has 10+ children forming a visual texture (scattered text, particles, patterns, noise) rather than distinct UI elements, download the entire parent frame as a single PNG. Do not recreate children individually. Layer names like "bg", "background", "pattern", "texture" are strong signals.
R10: Match visual order exactly. Elements render in Figma's visual Y-order. Never reorder text-image pairs or siblings based on logical assumptions.
R11: Zero additions. Never add any element (icon, label, decoration, component) absent from Figma's node tree. No training data substitutions.
R12: Apply all transforms. Download images with full `imageDownloadArguments` (cropTransform, mirroring, rotation, scaling). Raw assets without transforms are wrong.
R13: Extract all SVGs. Every SVG downloads via `download_figma_images`. Never generate SVG paths or use external icon libraries.
---
## WORKFLOW
### Setup
Extract from Figma URL: `https://www.figma.com/design/<fileKey>/<name>?node-id=<nodeId>`
MCP functions:
- `get_figma_data(fileKey, nodeId?)` → node tree + `globalVars.styles`
- `download_figma_images(fileKey, nodes[], localPath)` → downloads SVGs/PNGs
---
### Phase 0: Visual Inspection
1. Get a screenshot of the full design
2. Create `design-spec.md`. Write what you see: sections, colors, layout patterns, images, typography
3. This screenshot is your ground truth throughout the build
Gate: `design-spec.md` exists with visual overview before any data fetching.
---
### Phase 1: Structural Scan
1. Call `get_figma_data(fileKey, nodeId)` on root node
2. Identify sections from top-level children (sort by Y — R1)
3. Extract ALL tokens from `globalVars.styles` into `tokens.css`:
```css
:root {
  --bg-primary: #FAFBFC;
  --text-primary: #2E3133;
  /* every color from fill_* tokens */
}
```
4. Identify fonts from `style_*` tokens. Map commercial fonts → Google Fonts → system fallback. Add imports. Verify they load.
5. Update `design-spec.md` with:
   - Section inventory (name, nodeId, layout mode, dimensions, background)
   - Font mapping table
   - Parent-child hierarchy for complex/grouped elements
Gate: `tokens.css` written. All sections mapped. All fonts resolved.
---
### Phase 2: Batch Image Download
For each node in the tree, apply:
- `type: IMAGE-SVG` → Download as SVG
- `type: BOOLEAN_OPERATION` → Download as SVG (R2)
- `fills` has `type: IMAGE` with `imageRef` → Download as PNG
- Frame with 10+ decorative children → Download parent frame as PNG (R9)
- `fills` has `type: GRADIENT_LINEAR` → Recreate as CSS `linear-gradient()`
- `fills` is hex like `['#FAFBFC']` → Use as CSS color
- Simple `RECTANGLE` / `ELLIPSE` → Recreate in CSS
- Icons, logos, complex shapes → Download as SVG (R2)
Batch all into one `download_figma_images` call:
```json
{
  "fileKey": "abc123",
  "localPath": "/app/frontend/public/images",
  "nodes": [
    {"nodeId": "2077:30698", "fileName": "logo.svg"},
    {"nodeId": "2077:31048", "fileName": "hero.png", "imageRef": "6d203..."},
    {"nodeId": "2077:30438", "fileName": "bg-pattern.png", "pngScale": 2}
  ]
}
```
When `needsCropping: true` with `filenameSuffix`, output is suffixed: `card2.png` → `card2-5fa541.png`. Copy `cropTransform` and `filenameSuffix` from `imageDownloadArguments` verbatim.
Create `assets-manifest.md` listing every asset: nodeId, filename, path, type. Verify every file exists at expected path with correct filename.
CRA image paths: CSS `url()` in `src/` CANNOT resolve `public/` paths. Use:
```jsx
<div style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/images/bg.svg)` }} />
```
Gate: Every asset verified at expected path.
---
### Phase 3: Build Skeleton
1. Create page with all sections in Y-sorted order
2. Each section: correct layout mode, dimensions, padding, background from tokens
3. Completeness check: Count Figma children per section vs elements generated. Numbers must match.
Gate: Every section's child count matches Figma data.
---
### Phase 4: Section-by-Section Refinement
For each section:
1. Fetch: `get_figma_data(fileKey, sectionNodeId)` for detailed child data
2. Screenshot: Get screenshot of just this section
3. Plan before coding — write exact values:
   ```
   Hero: flex row, gap 32px, padding 48px 80px
   Left (60%): h1 Inter 48px bold #1A1A2E, p 16px #5C6166, button bg #3B82C8 r8
   Right (40%): hero.png object-fit cover
   ```
4. Build the component. Every value from `tokens.css` or node data (R6).
5. Validate against section screenshot. Check: layout, colors, completeness. Fix before moving on.
Node Processing — run for every node:
1. Type? → FRAME/TEXT/IMAGE-SVG/BOOLEAN_OPERATION/RECTANGLE/ELLIPSE/INSTANCE/GROUP
2. Decorative frame? (10+ pattern children) → Download as PNG (R9), skip children
3. Has fills? → Resolve via `globalVars.styles` (R8)
4. Has layout token? → Resolve mode, gap, padding, sizing
5. Parent mode? → flex or absolute (R7)
6. Has children? → Sort by Y (R1)
7. IMAGE-SVG or BOOLEAN_OPERATION? → Download (R2)
8. Fills has `type: IMAGE`? → Download
9. Opacity 0? → Skip, note as interactive state (R5)
10. Walk up to parent → inherit container fills, radius, effects
---
### Phase 5: Final Validation
1. Screenshot full implementation at Figma artboard width (1440 or 1512px)
2. Compare side-by-side with Phase 0 screenshot
3. Check per section: layout, colors, fonts, images present, radii, decorative elements
4. Fix every discrepancy. Re-fetch data for exact values if needed.
5. Re-screenshot after fixes.
Gate: Documented visual comparison with all checks passed.
---
## REFERENCE
### Token Types
fill_* — `['#FAFBFC']` (hex), `['rgba(...)']` (alpha), `type: GRADIENT_LINEAR` (recreate in CSS), `type: IMAGE` with `imageRef` (download). `scaleMode: FILL`=cover, `STRETCH`=fill, `FIT`=contain.
layout_* — `mode: row`=flex, `column`=flex column, `none`=absolute. `sizing: fill`=flex:1, `hug`=fit-content, `fixed`=explicit px. Properties: `gap`, `padding`, `dimensions`, `locationRelativeToParent`.
style_* — `fontFamily`, `fontWeight`, `fontSize`, `lineHeight` (use directly), `letterSpacing` (convert: `-4%` → `-0.04em`), `textCase: UPPER` → `text-transform: uppercase`.
effect_* — `backdropFilter`, `boxShadow`, `textShadow`. Paste directly into CSS.
stroke_* — `colors`, `strokeWeight: '0px 0px 1px'` → `border-width` (top right bottom).
### Quick Conversions
- `scaleMode: FILL` → `object-fit: cover`
- `scaleMode: FIT` → `object-fit: contain`
- `letterSpacing: '-4%'` → `letter-spacing: -0.04em`
- `borderRadius: '8px 8px 0px 0px'` → TL TR BR BL
- `textCase: UPPER` → `text-transform: uppercase`
- Gradient `isBackground: true` → `background-image`
- `position: absolute` in layout → Out of parent flow but still within parent
### Instance Nodes
`type: INSTANCE` → treat as FRAME. Read `children` for content with overrides. Nested IDs: `I2803:45294;3713:72222` = instance 2803:45294, child 3713:72222.
### Children Order
Array order = z-index (back-to-front). Visual order = sort by Y (R1). Opacity 0 = hidden state (R5).
# CToon Showdown — Official Character Art Standard

**Approved by the CTooniverse owner · November 8, 2026**

## Creative direction

Every new fighter must look as though they stepped directly out of their **own original cartoon, anime, or video game** and into a 2D fighting game. **Character authenticity is more important than forcing one universal rendering style.** Keep the source character's recognizable look; use a clean M.U.G.E.N.-style 2D sprite system for gameplay.

**Do not** give all characters a generic Marvel-vs.-Capcom-style body, extra muscles, 3D rendering, photorealistic skin, heavy AI-looking brush texture, or unrelated design choices. Arcade-style UI and combat effects may be shared; character designs should remain distinct to their respective franchises.

## Fidelity checklist (before publishing a fighter)

1. **Character identity:** Match the canonical hairstyle, head and jaw shape, face, eyes, expression, outfit, accessories, colors, proportions, and silhouette. Use relevant source references from the character's specific show or game.
2. **Source-specific rendering:** Match that franchise's line weight, coloring, shading, stylization, and proportions. A flat South Park-style cutout remains a cutout; a Simpsons-style character keeps its show's shapes and coloring; a classic game character retains its native pixel-art or illustrated identity as appropriate.
3. **Real game artwork:** Create consistent transparent individual sprite frames (or a properly aligned transparent sprite atlas) of the *same* model, not a screenshot of a promotional collage with labels, HUD or scenery.
4. **Consistent poses:** Maintain the same character scale, colors, face, outfit, limb lengths, anchor position and visible details frame-to-frame. No missing parts, warped anatomy, duplicate limbs or invented accessories.
5. **Animation coverage:** Idle, walk, run, punch, kick, guard, jump, crouch, special, hurt and KO should each have usable distinct frames. If a motion is not complete, mark the fighter as draft rather than presenting placeholder or recycled frames as finished.
6. **In-engine confirmation:** Inspect the roster portrait and game sprite at actual displayed sizes, check frame cropping and ground alignment, test animations, controls and collision, and check mobile rendering before publishing.

## Technical format

- **Game format:** 2D M.U.G.E.N.-inspired sprites; the game is not the M.U.G.E.N. engine.
- **Current atlas mapping:** 3 columns by 11 rows, ordered from top: idle, walk, run, punch, kick, guard, jump, crouch, special, hurt, KO. Keep frame dimensions identical and transparent.
- **Portrait:** A clean, source-faithful roster image, without unrelated text or the whole character sheet.
- **Reuse:** Shared engine/controls, sprite placement, damage logic, hit effects and selection UI can be standardized. The *art style* cannot be standardized across shows/games.
- **No substitutes:** Don't replace an incomplete source-faithful model with generic procedural geometry or a visually unrelated generated design and call it complete.

## Fighter #001 — Johnny Bravo

The approved design target is **original-cartoon-accurate Johnny Bravo**, including the signature blond pompadour, black sunglasses, face and jaw proportions, black fitted shirt, blue jeans and black shoes. Use readable, clean 2D outlines and sparse cartoon shading. Retain his recognizable source appearance while supplying functional transparent combat frames. The owner supplied a transparent **64×64 pixel-art Johnny Bravo model** on November 8, 2026. Preserve that exact source sprite for the roster portrait and derive all fight sprites from it rather than inventing a different likeness. The active atlas `images/showdown/johnny-bravo-user-atlas.svg` is **3 columns × 11 rows** and uses straightforward pixel-preserving whole-body and limb transformations. These are initial motion frames derived from a single source pose, **not a hand-drawn, production-complete combat animation set**; replace them with distinct approved sprite drawings later while keeping this model's likeness. Retain the prior atlas as a reversible fallback and verify the current live deployment separately.

## Future franchises

For **each** new character, first identify the **specific original show or game and version of the design**. Build a short per-character reference checklist and check likeness before making the full animation set. The roster may mix different art traditions by design: each fighter should look native to their world.

## Owner publishing rule

The Owner Fighter Manager includes an art-reference confirmation checkbox. Checking it means the owner has compared the artwork to the source and confirmed it is usable in the actual game. This checklist is a publishing workflow guardrail; it does not automatically verify image likeness.

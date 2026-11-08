# CToon Showdown V2 — Rebuilt November 8, 2026

The active game is [fighters.html](../fighters.html). V2 is a clean, standalone 2D fighter; the previous implementation is retained in Git history and its unused source files remain in the repository for recovery.

## Source layout

- `showdown-v2.js`: public Supabase fighter catalog, 120-slot expandable character selector, preview, owner-configured unlock rules and server-confirmed coin purchases.
- `showdown-v2-engine.js`: deterministic 60Hz simulation, keyboard/touch input, CPU opponent, hitboxes, guard, specials, timed rounds, best-of-three matches, HUD, original effects.
- `showdown-v2-sprites.js`: transparent 3-column x 11-row sprite atlas loader, stable per-pose cropping, procedural loading fallback.
- `showdown-v2.css`: responsive original anime/arcade UI.
- `fighters.html`: current game page.

## Playable launch roster

Hercules (`disney-hercules`) and Jack Skellington (`jack-skellington`) are resolved from the existing `fighter_catalog` table. Fighter availability and unlock status come from Supabase; the browser cannot grant coins or unlocks. New catalog fighters appear in the expandable roster, but need their own sprite implementation before they can be selected in battle.

## Animation format

Each fighter uses an RGBA atlas with 3 equal-size columns and 11 rows. The rows must appear in this order:

1. idle
2. walk
3. run
4. punch
5. kick
6. block
7. jump
8. crouch
9. special
10. hurt
11. ko

Preferred illustrated assets:

- `public/images/showdown/hercules-illustrated-atlas.png`
- `public/images/showdown/jack-illustrated-atlas.png`

The supplied illustrated pose sheets have already been processed into transparent 576 x 2464 PNGs, but **these files must be uploaded to the paths above**. Until then, the engine automatically uses the existing `*-cleaned-atlas.png` assets and built-in procedural fallbacks. Never claim the illustrated PNGs are deployed until GitHub contains them.

## Controls

A/D or arrow left/right: move; W/up: jump; S/down: crouch; J: punch; K: kick; L: guard; U: special (40 meter). Mobile touch controls mirror these actions. First to two rounds wins.

## Deployment checklist

1. Verify assets are present at the paths above.
2. Verify active `main` deployment serves `fighters.html` and the V2 modules.
3. Check anonymous and signed-in fighter catalog loading.
4. Check character portraits, preview actions, CPU matches and touch controls.
5. Check locked fighter gating and server-side purchase verification.
6. Keep all changes on `main` — no branches for this repository.

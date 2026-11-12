# CToon Speedway (Phase 1)

A standalone arcade kart-racing foundation for the CTooniverse Games section.

## Play

Open \`speedway.html\` from the CTooniverse Games page. The game runs in a browser using the Canvas 2D API; no build tools or server routes are necessary.

- **Desktop**: W/↑ gas, S/↓ brake, A/D or ←/→ steer, Space drift, Shift/B boost, P pause.
- **Mobile**: press and hold GAS, BRAKE, steering, DRIFT, and BOOST buttons.
- **Race**: 3 laps against three computer-controlled rivals. Collect glowing nitro diamonds, drift for energy and use boost on straights.
- **Garage**: upgrade Engine, Handling and Nitro individually for each driver, up to level 5.
- **Records**: track best first-place times, wins and race counts.

## Expansion points

- **Pilots**: edit the \`drivers\` array in \`speedway.js\` (id, name, role, icon, color, speed, handling, boost). Currently they are original placeholder characters, so new CToon heroes and proper licensed/supplied artwork can be added later.
- **Tracks**: edit the \`tracks\` array (id, name, icon, location, length, palette, and curve parameters).
- **Graphics**: replace \`drawKart\`, \`drawBackdrop\`, and \`drawScenery\` with future art/sprites/3D rendering as desired while keeping race progression.
- **Progression**: \`upgradeTypes\`, \`upgradeCost\`, and \`buyUpgrade\` govern kart upgrades.
- **Bots and race rules**: \`startRace\`, \`updateRace\`, \`currentPlace\`, and \`finishRace\` govern the race lifecycle and rankings.
- **Mobile**: controls use Pointer Events with capture/release so held controls work with touch or mouse.

## Important scope and limitations

This phase is an **original 2.5D browser racing prototype**, not a copy of Disney Speedstorm's assets, code, or characters. It includes basic AI racers, tracks, race finishes, boost/drift mechanics, and an upgrade shop. It does not yet provide real online multiplayer, custom character models, matchmaking, server-based leaderboards, or account syncing.

Progress is stored **only in the current browser** under \`ctoon-speedway-save-v1\`. Speedway Tickets are an independent demonstration currency. They are **not** CTooniverse Cartoon Coins, and should not be exchangeable until secure server-side storage, anti-cheat, and economy rules are implemented. Local browser storage is player-editable, so records are not authoritative.

The Game page links directly to \`speedway.html\`. All project changes are committed to GitHub \`main\`.

## Buggy the Clown playable racer (November 12, 2026)

Buggy is a selectable racer with his own pirate kart artwork (`images/speedway/buggy-the-clown-kart.png`), Speed 4, Handling 3, Nitro 4 and the normal upgrade path. He is available immediately in the racer roster. The supplied pixel-art pose is animated procedurally during play with bouncing, turning, drifting, boost flames, collision shake and victory motion; these are visual transforms and effects, **not** separate directional sprite animations. Existing local saves, tracks and other game modes remain unchanged.

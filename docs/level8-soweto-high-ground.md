# Level 8 — Soweto Homecoming: High Ground

**Scope freeze.** This is the build contract for the two people on Level 8. If it is not in this doc, it is out of scope unless both of you agree in writing.

**Check Level 7 first.** If that pair already took floods / Joburg weather, stop and switch to the backup at the bottom.

---

## Story

Levels 1–3 took you through Soweto and Joburg to Park Station. Levels 4–6 were Cape Town (Day Zero, loadshedding, Cape Flats). You are **home**. A summer storm has backed up the drainage canal. Low streets are going under.

You cannot fight the water. You walk the **ridge route**, check on three neighbours, and reach your family’s house on high ground.

```
Spawn (Vilakazi strip) → Clinic → School → Spaza (crate fetch) → Home on the hill
```

**Win:** all three neighbour beats done **and** you stand in the home radius. Score is `runElapsedMs` (lower is better). All flood notes + unused soakings subtract bonus time.

**Target length:** 4–7 minutes. No combat, no mouse-look, no torch.

---

## Player systems

| | Level 6 Cape Flats | Level 8 Soweto |
| --- | --- | --- |
| Kind | Open world, third-person | Same camera / WASD / Shift sprint |
| Hazard | Faceless patrols, vision cones | Rising water + current channels |
| Vital | 3 sightings | 3 soakings |
| Collectible | GBV notes + rand coins | Flood-safety notes + rand coins |
| Goal | Thuthuzela Care Centre | Family house on the ridge |
| Atmosphere | Night, stealth | Storm daylight → heavier rain after school |

Reuse Level 6 movement and checkpoint respawn. Do **not** reuse crouch-as-stealth. Crouch is unused.

### Soakings (replaces strikes)

- Max **3**. Stepping into **deep water** (`waterHeight >= 0.7`) starts a 1.2s wash, then respawn at last checkpoint.
- **Current channels** (visible moving strips) push the player along +Z or ±X. They count as deep if you stay in them > 0.8s.
- **Shallow water** (`0.25–0.69`) only slows walk speed (×0.55). It does not soak.
- Game over copy: `The water took you. Get to high ground next time.`
- No-combat copy if they mash punch: `You can't punch a flood.`

### Water rise (the only new verb)

Three stages, driven by **neighbour progress**, not a real-time clock (so slow players are not punished):

| Stage | After | What changes |
| --- | --- | --- |
| 0 | Spawn | Main road walkable. Canal is a visible hazard. |
| 1 | Clinic done | Lowest east–west street floods (collider + mesh). Nav points at the ridge alley. |
| 2 | School done | Second low street floods. Rain/fog thickens for 25s then eases. |
| 3 | Spaza done | Canal swell. Only the hill path to home stays dry. |

Player should **see** water climb on the low streets. Do not lock the whole map.

---

## Anchors

Map is compact: **160 (x) by 220 (z)**. Walk from **+z spawn** toward **-z home**. `HALF_X = 80`, `HALF_Z = 110`.

```js
export const LEVEL8_ANCHORS = {
  spawn:   { x: 0,  z: 96 },   // Vilakazi-style strip
  clinic:  { x: 48, z: 40 },   // Neighbour 1
  school:  { x: -40, z: -8 },  // Neighbour 2
  spaza:   { x: 28, z: -52 },  // Neighbour 3
  crate:   { x: 52, z: -40 },  // Dry-side crate for the spaza beat
  home:    { x: 0,  z: -92 },  // Family house / win
}

export const LEVEL8_CHECKPOINTS = [
  { id: 'start',  x: 0,  z: 96 },
  { id: 'clinic', x: 48, z: 40 },
  { id: 'school', x: -40, z: -8 },
  { id: 'spaza',  x: 28, z: -52 },
]

export const LEVEL8_CHECKPOINT_RADIUS = 8
export const LEVEL8_INTERACT_RADIUS = 3.2
export const LEVEL8_WIN_RADIUS = 10
export const LEVEL8_MAX_SOAKINGS = 3
export const LEVEL8_SOAK_BONUS_MS = 12000   // per unused soaking on win
export const LEVEL8_ALL_TIPS_BONUS_MS = 8000
```

Checkpoints arm when you **finish** that neighbour beat (E), not when you walk past the building.

**Gating:** none. Wrong roads become water, not locked gates. Nav arrow always points at the **next** incomplete anchor (`clinic` → `school` → `spaza` → `home`).

---

## Neighbour beats (keep tiny)

1. **Clinic** — stand in radius, press **E**. “Fridge is still on. Take the ridge, not the dip.” Stage 1 water. Checkpoint.
2. **School** — **E**. “Kids are inside. Storm’s getting worse.” Stage 2 water + rain window. Checkpoint.
3. **Spaza** — owner waits until you pick up the **crate** (`E` at `crate`) and walk it back (`E` at `spaza`). Checkpoint. Stage 3. Then home.

If you start a crate carry, drop it on soak (crate returns to the dry spot). Do not add inventory UI.

---

## HUD fields

Session writes these on `setHud` (mirror Level 6):

| Field | Type | Use |
| --- | --- | --- |
| `soakingsUsed` | number | 0–3; HUD pips (use 💧, not eyes) |
| `maxSoakings` | number | 3 |
| `navigatorMessage` | string | Current beat / warning |
| `prompt` | string | “Press E — Clinic” / tip text |
| `runTimeMs` | number | Live clock |
| `distanceToGoal` | number | Metres to current nav target |
| `tipsCollected` / `tipsTotal` | number | Notes 0/8 |
| `neighboursDone` | number | 0–3, for a small checklist |
| `waterStage` | number | 0–3, optional HUD badge |
| `checkpointFlashAt` | number | `Date.now()` on new checkpoint |
| `soakFlashAt` | number | `Date.now()` on soak |
| `levelComplete` / `gameOver` | boolean | Existing engine flags |

Do **not** add HP, thirst, battery, torch, or crouch.

### Navigator copy

```
spawn:   Storm’s up. Check the clinic, then get to high ground.
clinic:  Clinic is safe. Cut up to the school — skip the dip.
school:  Kids are inside. Spaza next. Water’s in the low street.
spaza:   Crate’s dry. Bring it back, then go home up the ridge.
crate:   Got the crate. Back to the spaza.
homeNav: All three checked. Home is on the hill.
soak1:   Close. Stay on the ridge.
soak2:   One more soaking and you’re done. High ground only.
nearWater: Current. Step back.
win:     You made it. The house is above the waterline.
```

### Briefing (`levelBriefings.js` key `8`)

```
title:    Soweto Homecoming
setting:  Soweto, summer storm
goal:     Check the clinic, school and spaza, then reach your family’s house on the hill.
avoid:    Deep water soaks you and sends you to the last checkpoint. Three soakings and the flood wins. Do not cut through the canal.
collect:  Read flood-safety notes (E) — find all 8 to cut your time. Rand coins go to your store wallet. The nav arrow marks the next stop.
controls: W A S D: move (camera follows behind you) · Shift: sprint · E: talk / pick up crate / read a note · P or Esc: pause
```

### Level config (`levels.js`)

```
id: 8
label: 'Soweto Homecoming'
playerKind: 'openworld'
hazardKind: 'none'          // water is session-owned, not a spawner
jumpEnabled / rollEnabled / potholesEnabled: false
scoreLabel / hazardPastLabel: 'Time'
scoreKind: 'time'
fogColor: 0x6a7a88
fogNear: 8, fogFar: 420, fogDensity: 0.006
backgroundColor: 0x8aa0b4
collectibleLabel: 'Notes'
```

Add `8` to `PLAYABLE_LEVELS` only when the session can start and win.

---

## Flood notes (8, educational)

Place in open, dry passages — never inside deep water.

1. Fifteen centimetres of moving water can knock you off your feet.
2. Sixty centimetres can sweep a car. Never drive the dip.
3. Get to high ground early. Drains in townships back up fast.
4. Informal homes on floodplains get hit first — check on neighbours.
5. Do not wade in to “save” someone. Call for help from dry ground.
6. After the water drops, assume tap water is unsafe until the city says otherwise.
7. Lightning and downed cables travel through flood water. Keep off metal fences.
8. 112 from a mobile is the free emergency number in South Africa.

Win overlay (before Level Complete, same pattern as `GBVImpactOverlay.jsx`):

- Stat: Informal settlements sit on some of Joburg’s worst flood lines.
- Line: You made it to high ground. Not every street does.
- Help: Emergency — **112** (mobile, free).
- Continue → existing level-complete modal.

---

## File list and split

### Teammate A — world and flow

| File | Job |
| --- | --- |
| `src/game/level8City.js` | Ground, Soweto houses, canal, colliders, anchors, checkpoint spots, water meshes that `setStage(n)` raises |
| `src/game/level8Session.js` | Copy Level 6 session: third-person, bounds, checkpoints, soak/respawn, win, HUD, keys |
| `src/game/levels.js` | `LEVEL_8` config |
| `src/game/useRoadSceneEngine.js` | `createLevel8Session`, `setActive` when `id === 8`, include in `openWorldSession()` |
| `src/game/levelBriefings.js` | Briefing above |
| `src/components/Level8Objective.jsx` | Soak pips, time, notes, neighbours 0/3, navigator, checkpoint flash |
| `src/RoadScene.jsx` | Mount HUD + flood overlay; reset HUD fields on level change |

### Teammate B — water, beats, teaching

| File | Job |
| --- | --- |
| `src/game/level8Water.js` | Stage heights, deep/shallow tests, current push vector, soak timing |
| `src/game/level8Beats.js` | Clinic / school / spaza / crate interact radii and flags |
| `src/game/level8Collectibles.js` | 8 notes + wallet coins (clone `level6Collectibles.js`) |
| `src/game/level3Billboards.js` | `LEVEL8_BILLBOARD_ADS` (HIGH GROUND, DON’T WADE, STORM DRAIN, 112) |
| `src/components/FloodImpactOverlay.jsx` | Win teaching screen |
| CSS next to Level 6 rules | Soak flash (blue, not red), water-stage badge |

Optional GLBs in `Characters/Level8Assets/` later (`Clinic.glb`, `School.glb`, `Spaza.glb`, `Crate.glb`). Procedural boxes until then. Use `new URL(..., import.meta.url)` only once the file exists.

### Shared constants

Put numbers from the Anchors section in `level8City.js` or `gameConstants.js` — pick one file and do not duplicate.

---

## Out of scope (do not build)

- Punch, HP, thugs, looters, stealth cones, crouch
- Thirst, bottles, torch, battery, loadshedding puzzles
- Pipe / valve / Simon-says / circuit minigames
- Driving, taxis, potholes, jump/roll
- Inventory UI, crafting, more than one crate
- A map as large as Level 3–5 cities
- Online multiplayer

If a feature is not required to walk spawn → three beats → home with rising water, cut it.

---

## Build order

1. Empty open-world session + Soweto ground + spawn/home (A). Confirm you can walk and trigger win at home with beats skipped via a debug flag.
2. HUD + briefing + playable flag (A).
3. Water stages + soak/respawn (B + A hook).
4. Three neighbour beats + crate (B).
5. Notes, coins, billboards, overlay (B).
6. Tune: shallow vs deep, rain window, nav copy. Remove debug skip.

---

## Backup if Level 7 already owns floods

**Soweto Homecoming: Power to the People** — same map and third-person shell, replace water with a **sunlight charge** meter (drain in shade, fill in the open). Three plug-in beats at clinic fridge, street robot, home lights. Same file split; `level8Water.js` becomes `level8Solar.js`. Still no combat.

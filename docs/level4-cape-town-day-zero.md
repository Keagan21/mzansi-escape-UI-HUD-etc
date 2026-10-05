# Level 4 — Puzzle Cape Town Day Zero

Visual map: [level4-map.svg](level4-map.svg)

## The story so far

After surviving Park Station, the protagonist boards a long-distance bus from Joburg to Cape Town. He arrives to find the city in crisis — **Day Zero** has hit. There is no water. The taps are dry. The city is desperate.

The municipal supply is cut because **three infrastructure nodes** are broken. The player walks the city, finds each node, and fixes it. Each repair restores the next stretch of the water chain until Table Mountain’s reservoir fills and the level can end at a working tap.

## Core concept — the water chain

Think of it as a chain: each fix unlocks the next map section and makes water flow a little further. The player should **see water returning to the streets**.

```
Bus drop (CBD) → De Waal pipes → Newlands valves → Steenbras pumps → Reservoir → V&A tap
```

| Place | Role | World anchor (BLOCK = 46) |
| --- | --- | --- |
| Spawn / Bo-Kaap CBD | Start, dry queues, bottles | `0, 80` |
| De Waal Drive | Node 1 — pipe puzzle + flood | `BLOCK * 2.2, -BLOCK * 0.5` |
| Newlands Spring | Node 2 — valves + hoarders (later) | `-BLOCK * 2.4, -BLOCK * 2.8` |
| Steenbras Dam terrace | Node 3 — load shedding (later) | `BLOCK * 3.5, -BLOCK * 4.2` |
| Table Mountain | Horizon landmark, reservoir at base | `0, -(bound + 80)` — not walkable |
| V&A Waterfront | Win tap after all three nodes | `-BLOCK * 3.2, BLOCK * 1.8` |

**Gating:** collider roadblocks on the Newlands and Steenbras approaches. Completing a node removes the next barricade and reveals a water ribbon along the unlocked streets.

**Win (full design):** all three nodes fixed **and** the player reaches the V&A public tap. Score is `runElapsedMs` (lower is better).

**Sprint 1 (this build):** Node 2/3 are landmarks plus locked gates. Only Node 1 is solvable. The V&A win is not hooked yet.

## Player systems

| | Level 3 Joburg | Level 4 Cape Town |
| --- | --- | --- |
| Kind | Open world | Open world (same WASD / look / sprint) |
| Hazard | Amaphara (HP) | Water hoarders later; sprint 1 is thirst only |
| Vital | HP bar | Thirst bar |
| Collectible | Rand coins (bus fare) | Water bottles (refill thirst) |
| Goal | Park Station | Water chain → V&A tap |
| Atmosphere | Amber CBD haze | Sunbaked, cracked earth, bleached sky |

### Thirst (replaces HP)

- Max **100**. Drain **~0.35/s** walking (~4.5 minutes dry), **~0.55/s** sprinting.
- Bottle pickup **+28** thirst.
- Thirst at **0** is game over.
- Sprint 1 has **no hoarder combat**.

### Load shedding (documented, not Node 3 yet)

Cycle **ON 8s / OFF 5s**. Lights and fog dim on OFF. Node 3 will only accept cable/breaker steps during ON windows.

## The three puzzles

### Node 1 — De Waal Drive (this sprint)

A burst main floods the road. Rotate pipe-junction tiles to join **source → sink** before a **~45s** timer. Fail: scramble resets and thirst takes a hit (not instant death). Success: flood stops, pressure returns, **Newlands gate opens**.

Mechanic: tile rotation / pipe puzzle. Interact with **E** or **LMB** while standing on a tile.

### Node 2 — Newlands Spring (later)

Pump station vandalised. Collect **3 valve handles** from the precinct (guarded by water hoarders), then set valves in the sequence on a municipal plaque. Unlocks the Steenbras road.

Newlands Spring is also a story beat: a queue with bottles, echoing the real Day Zero spring.

### Node 3 — Steenbras Dam (later)

Pumps have no power. Restart the generator and connect cables **during load-shedding ON windows**. Wrong-window actions shock and rewind a step. Completing this fills the reservoir cascade and opens the V&A.

## Landmarks

- **Table Mountain** — iconic backdrop; reservoir at its base; water should read as coming down the mountain once the chain is live.
- **Newlands Spring** — real Day Zero collection point.
- **V&A Waterfront** — recognisable finale; desalination / harbour theming.
- **Steenbras Dam** — real Cape Town supply dam tied to the crisis.

## Build order

1. Environment — `level4City.js`
2. Thirst bar + bottles — `level4Session.js` + HUD
3. Node 1 pipe puzzle — `level4PipePuzzle.js`

## Asset list (drop-in GLBs)

Place files in `Characters/Level4Assets/` when ready. The level uses procedural fallbacks until then.

| File | Use |
| --- | --- |
| `TableMountain.glb` | Horizon silhouette |
| `Pipes.glb` | Optional Node 1 decoration |
| `WaterBottle.glb` | Collectible (else procedural bottle) |
| `PumpHouse.glb` | Newlands / Steenbras pads |
| `Hoarder.glb` | Node 2 enemies later |

Vite note: prefer `new URL(..., import.meta.url)` **once the file exists** so it is bundled. Optional public-path loads are used until then so a missing file does not break the build.

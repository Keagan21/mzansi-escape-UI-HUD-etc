# Mzansi Escape — UI / NPC / Dialogue Template

This is a Vite + Three.js starter focused on your role in the project.

## Included now

- 8 stage template flow from the GDD
- health + damage system
- screen flash + blur + camera shake
- warning / alert banner
- dialogue system with typewriter effect
- placeholder Durban taxi rank world
- crowd slow zones, potholes, checkpoint system
- teammate integration bridge for real `PlayerController` and `LevelManager`
- placeholder sound files in `public/assets/sounds`

## Startup

```bash
npm install
npm run dev
```

## Controls

- `W A S D` — move
- `E` — advance dialogue
- `M` — test sound playback

## Notes about sounds

The included `.wav` files are generated placeholders so the project runs immediately. Replace them with your own licensed sound files later, keeping the same file names if you want zero code changes.

## Suggested next steps

1. replace placeholder geometry in `EnvironmentFactory.js`
2. connect your teammate's real `PlayerController` through `window.TeamIntegration`
3. connect your teammate's real level flow through `window.TeamIntegration.levels`
4. swap placeholder `.wav` files with final sound assets

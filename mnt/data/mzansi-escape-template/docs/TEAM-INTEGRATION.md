# Team Integration Notes

This template is designed so your UI/NPC/Dialogue work can plug into your teammates' systems without large rewrites.

## 1. PlayerController integration

If your teammate already has a `PlayerController`, expose it globally before `src/main.js` runs:

```js
window.TeamIntegration = {
  player: {
    getPosition() {
      return playerController.mesh.position;
    },
    setPosition(position) {
      playerController.mesh.position.copy(position);
    },
    update(dt, { input, dialogueOpen, bounds, slowedUntil, elapsed }) {
      if (dialogueOpen) return;
      playerController.update(dt, input, bounds, slowedUntil, elapsed);
    }
  }
};
```

If you do not expose this, the built-in fallback player in `src/main.js` is used.

## 2. LevelManager integration

If your teammate already owns the real level flow, expose this too:

```js
window.TeamIntegration = {
  ...window.TeamIntegration,
  levels: {
    next() {
      realLevelManager.next();
    },
    onLevelLoaded(level) {
      console.log('UI/NPC layer received level:', level.id);
    }
  }
};
```

The UI/NPC layer will stop calling its own fallback `LevelManager.next()` once this exists.

## 3. Events you can emit

- `EventBus.emit('ui:hint', 'text')`
- `EventBus.emit('dialogue:open', { levelId, npcId, fallbackName })`
- `EventBus.emit('audio:test')`

## 4. Replace placeholder environments later

All current roads, houses, taxis, stalls, people, and checkpoints are procedural placeholders. Replace them later with GLTF models or final art inside `EnvironmentFactory.js`.

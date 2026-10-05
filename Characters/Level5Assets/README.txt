Level 5 assets (FBXs are gitignored; runtime GLBs live here or in public/media).

- StandingTorchWalkForward.fbx — Mixamo “Standing Torch Walk Forward”
  Runtime: public/media/players/TorchWalk.glb (Draco)
- CapeTownStadium.glb — Level 5 win landmark (Draco + WebP; optimize via
  `node scripts/optimize-glbs.mjs --ratio=0.1 --error=0.01 --tex=512 --join Characters/Level5Assets CapeTownStadium.glb`)

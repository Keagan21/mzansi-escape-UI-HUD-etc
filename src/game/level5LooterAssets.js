// level5LooterAssets.js — Reuses Mixamo Adam / Phara from Level 3 thug cache.

export {
  LEVEL3_THUG_CHARACTERS as LEVEL5_LOOTER_CHARACTERS,
  preloadLevel3Thugs as preloadLevel5Looters,
  areLevel3ThugsReady as areLevel5LootersReady,
  isLevel3ThugCached as isLevel5LooterCached,
  pickThugCharacterId as pickLooterCharacterId,
  createThugCharacterInstance as createLooterCharacterInstance,
  disposeThugCharacterInstance as disposeLooterCharacterInstance,
  pinThugHips as pinLooterHips,
  playThugAttack as playLooterAttack,
  cancelThugAttack as cancelLooterAttack,
  endThugAttack as endLooterAttack,
} from './level3ThugAssets.js'

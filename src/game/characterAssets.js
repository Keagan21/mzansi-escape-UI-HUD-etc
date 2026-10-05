// characterAssets.js — Model URLs, Kenney skins, playable character list (CHARACTERS).

export const TAXI_MODEL = new URL(
  '../../8d8851a240ed463a8803ab59f2097bb5.glb',
  import.meta.url
).href

/** Kenney “Animated Characters Protagonists” (CC0) — one rig + skins + pack run animation. */
export const KENNEY_CHAR_URL = new URL(
  '../../Characters/TestCharacter/Model/characterMedium.fbx',
  import.meta.url
).href
export const KENNEY_RUN_FBX = new URL(
  '../../Characters/TestCharacter/Animations/run.fbx',
  import.meta.url
).href
export const KENNEY_SKINS = {
  skaterM: new URL(
    '../../Characters/TestCharacter/Skins/skaterMaleA.png',
    import.meta.url
  ).href,
  skaterF: new URL(
    '../../Characters/TestCharacter/Skins/skaterFemaleA.png',
    import.meta.url
  ).href,
  criminal: new URL(
    '../../Characters/TestCharacter/Skins/criminalMaleA.png',
    import.meta.url
  ).href,
  cyborgF: new URL(
    '../../Characters/TestCharacter/Skins/cyborgFemaleA.png',
    import.meta.url
  ).href,
}

/**
 * Playable characters: Kenney TestCharacter pack (FBX + skin) and Mixamo GLBs.
 * @typedef {{ id: string, label: string, url: string, format?: 'gltf' | 'fbx', runAnimUrl?: string, skinUrl?: string }} CharacterDef
 */
export const CHARACTERS = [
  {
    id: 'test-skater-m',
    label: 'Skater (male)',
    format: 'fbx',
    url: KENNEY_CHAR_URL,
    runAnimUrl: KENNEY_RUN_FBX,
    skinUrl: KENNEY_SKINS.skaterM,
  },
  {
    id: 'test-skater-f',
    label: 'Skater (female)',
    format: 'fbx',
    url: KENNEY_CHAR_URL,
    runAnimUrl: KENNEY_RUN_FBX,
    skinUrl: KENNEY_SKINS.skaterF,
  },
  {
    id: 'test-criminal',
    label: 'Criminal',
    format: 'fbx',
    url: KENNEY_CHAR_URL,
    runAnimUrl: KENNEY_RUN_FBX,
    skinUrl: KENNEY_SKINS.criminal,
  },
  {
    id: 'test-cyborg-f',
    label: 'Cyborg (female)',
    format: 'fbx',
    url: KENNEY_CHAR_URL,
    runAnimUrl: KENNEY_RUN_FBX,
    skinUrl: KENNEY_SKINS.cyborgF,
  },
  {
    id: 'athletic-lady',
    label: 'Athletic Lady',
    format: 'gltf',
    url: '/media/players/AthleticLady.glb',
    runAnimUrl: '/media/players/AthleticLady.glb',
  },
  {
    id: 'kid',
    label: 'Kid',
    format: 'gltf',
    url: '/media/players/Kid.glb',
    runAnimUrl: '/media/players/Kid.glb',
  },
  {
    id: 'micheale',
    label: 'Micheale',
    format: 'gltf',
    url: '/media/players/Micheale.glb',
    runAnimUrl: '/media/players/Micheale.glb',
  },
  {
    id: 'mousy',
    label: 'Mousy',
    format: 'gltf',
    url: '/media/players/Mousy.glb',
    runAnimUrl: '/media/players/Mousy.glb',
  },
]

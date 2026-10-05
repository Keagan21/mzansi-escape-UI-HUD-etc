// level2ObstacleAssets.js — Level 2 oncoming hazard car GLBs (random spawn, like level 1 taxis).

/**
 * @typedef {{ id: string, label: string, url: string }} Level2HazardCarDef
 */

/** @type {Level2HazardCarDef[]} */
export const LEVEL2_HAZARD_CARS = [
  {
    id: 'hilux',
    label: 'Toyota Hilux',
    url: new URL(
      '../../Characters/Level2Obstacles/Level2Cars/2022_toyota_hilux.glb',
      import.meta.url
    ).href,
  },
  {
    id: 'polo',
    label: 'Polo',
    url: new URL(
      '../../Characters/Level2Obstacles/Level2Cars/Polo.glb',
      import.meta.url
    ).href,
  },
  {
    id: 'mazda',
    label: 'Mazda',
    url: new URL(
      '../../Characters/Level2Obstacles/Level2Cars/Mazda.glb',
      import.meta.url
    ).href,
  },
  {
    id: 'suzuki',
    label: 'Suzuki',
    url: new URL(
      '../../Characters/Level2Obstacles/Level2Cars/Suzuki.glb',
      import.meta.url
    ).href,
  },
  {
    id: 'cherry',
    label: 'Cherry',
    url: new URL(
      '../../Characters/Level2Obstacles/Level2Cars/Cherry.glb',
      import.meta.url
    ).href,
  },
  {
    id: 'gusheshe',
    label: 'Gusheshe',
    url: new URL(
      '../../Characters/Level2Obstacles/Level2Cars/Gusheshe.glb',
      import.meta.url
    ).href,
  },
  {
    id: 'jmpd',
    label: 'JMPD',
    url: new URL(
      '../../Characters/Level2Obstacles/Level2Cars/JMPD.glb',
      import.meta.url
    ).href,
  },
  {
    id: 'mercedes',
    label: 'Mercedes A45 AMG',
    url: new URL(
      '../../Characters/Level2Obstacles/Level2Cars/mercedes-benz_a45_amg_2018.glb',
      import.meta.url
    ).href,
  },
  {
    id: 'urus',
    label: 'Lamborghini Urus',
    url: new URL(
      '../../Characters/Level2Obstacles/Level2Cars/urus_absoluttm.glb',
      import.meta.url
    ).href,
  },
  {
    id: 'raptor',
    label: 'Ford F150 Raptor',
    url: new URL(
      '../../Characters/Level2Obstacles/Level2Cars/ford_f150_raptor.glb',
      import.meta.url
    ).href,
  },
]

/** @deprecated Use LEVEL2_HAZARD_CARS — kept for any legacy imports. */
export const LEVEL2_OBSTACLE_MODELS = LEVEL2_HAZARD_CARS.map((c) => c.url)

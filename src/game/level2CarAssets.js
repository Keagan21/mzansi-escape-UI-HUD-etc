// level2CarAssets.js — Playable Level 2 car list (options menu + in-game).

/**
 * @typedef {{ id: string, label: string, url: string, imageUrl: string, price: number, rarity: 'common' | 'rare' | 'legendary' }} Level2CarDef
 */

/** @type {Level2CarDef[]} */
export const LEVEL2_PLAYER_CARS = [
  {
    id: 'polo',
    label: 'Polo',
    url: new URL(
      '../../Characters/Level2Obstacles/Level2Cars/Polo.glb',
      import.meta.url
    ).href,
    imageUrl: new URL(
      '../../Characters/Level2Obstacles/Polo.png',
      import.meta.url
    ).href,
    price: 0,
    rarity: 'common',
  },
  {
    id: 'car',
    label: 'Chevrolet Camaro',
    url: new URL(
      '../../Characters/Level2Obstacles/Level2Cars/Car.glb',
      import.meta.url
    ).href,
    imageUrl: new URL(
      '../../Characters/Level2Obstacles/Chevrolet Camaro.png',
      import.meta.url
    ).href,
    price: 40,
    rarity: 'common',
  },
  {
    id: 'gusheshe',
    label: 'Gusheshe',
    url: new URL(
      '../../Characters/Level2Obstacles/Level2Cars/Gusheshe.glb',
      import.meta.url
    ).href,
    imageUrl: new URL(
      '../../Characters/Level2Obstacles/Gusheshe.png',
      import.meta.url
    ).href,
    price: 500,
    rarity: 'common',
  },
  {
    id: 'jmpd',
    label: 'JMPD',
    url: new URL(
      '../../Characters/Level2Obstacles/Level2Cars/JMPD.glb',
      import.meta.url
    ).href,
    imageUrl: new URL(
      '../../Characters/Level2Obstacles/JMPD.png',
      import.meta.url
    ).href,
    price: 750,
    rarity: 'common',
  },
  {
    id: 'hilux',
    label: 'Toyota Hilux',
    url: new URL(
      '../../Characters/Level2Obstacles/Level2Cars/2022_toyota_hilux.glb',
      import.meta.url
    ).href,
    imageUrl: new URL(
      '../../Characters/Level2Obstacles/Toyota Hilux.png',
      import.meta.url
    ).href,
    price: 1200,
    rarity: 'rare',
  },
  {
    id: 'mercedes',
    label: 'Mercedes A45 AMG',
    url: new URL(
      '../../Characters/Level2Obstacles/Level2Cars/mercedes-benz_a45_amg_2018.glb',
      import.meta.url
    ).href,
    imageUrl: new URL(
      '../../Characters/Level2Obstacles/Mercedes A45 AMG.png',
      import.meta.url
    ).href,
    price: 2500,
    rarity: 'rare',
  },
  {
    id: 'raptor',
    label: 'Ford F150 Raptor',
    url: new URL(
      '../../Characters/Level2Obstacles/Level2Cars/ford_f150_raptor.glb',
      import.meta.url
    ).href,
    imageUrl: new URL(
      '../../Characters/Level2Obstacles/Ford F150 Raptor.png',
      import.meta.url
    ).href,
    price: 3500,
    rarity: 'legendary',
  },
  {
    id: 'urus',
    label: 'Lamborghini Urus',
    url: new URL(
      '../../Characters/Level2Obstacles/Level2Cars/urus_absoluttm.glb',
      import.meta.url
    ).href,
    imageUrl: new URL(
      '../../Characters/Level2Obstacles/Lamborghini Urus.png',
      import.meta.url
    ).href,
    price: 5000,
    rarity: 'legendary',
  },
]

/**
 * @param {string} id
 * @returns {Level2CarDef}
 */
export function getLevel2CarById(id) {
  return LEVEL2_PLAYER_CARS.find((c) => c.id === id) ?? LEVEL2_PLAYER_CARS[0]
}

/** Cars that cost coins (free starters are excluded). */
export function getPurchasableCars() {
  return LEVEL2_PLAYER_CARS.filter((c) => c.price > 0)
}

/**
 * @param {'common' | 'rare' | 'legendary'} rarity
 */
export function getCarsByRarity(rarity) {
  return LEVEL2_PLAYER_CARS.filter((c) => c.rarity === rarity)
}

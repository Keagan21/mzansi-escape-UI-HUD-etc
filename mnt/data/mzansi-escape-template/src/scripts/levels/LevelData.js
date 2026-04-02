const LevelData = [
  {
    id: 'level1',
    name: 'LEVEL 1 — Durban Taxi Rank',
    objective: 'Talk to the marshal, dodge moving taxis, and reach the checkpoint at the far end of the rank.',
    sky: 0x8ec8ff,
    fog: [28, 96],
    theme: 'durban-rank-day',
    checkpointText: 'Level 1 complete! Heading to Johannesburg pothole streets...',
    npc: {
      id: 'marshal',
      name: 'Taxi Rank Marshal',
      position: [4.5, 1, 6],
      hintText: 'Approach the marshal for directions through the rank.'
    },
    hazards: { taxi: true, potholes: 2, crowdSlowZones: 1 },
    decor: { houses: 8, people: 8, stalls: 6, streetLights: 0 },
    taxiPattern: 'rank-cross'
  },
  {
    id: 'level2',
    name: 'LEVEL 2 — Johannesburg Pothole Streets',
    objective: 'Avoid potholes, keep your footing, and push through to the checkpoint.',
    sky: 0xa9c0cf,
    fog: [20, 76],
    theme: 'joburg-street',
    checkpointText: 'Level 2 complete! Next: Load Shedding Night...',
    npc: {
      id: 'neighbour',
      name: 'Neighbour',
      position: [-5, 1, 5],
      hintText: 'This road is broken. Watch the tar and do not rush.'
    },
    hazards: { taxi: false, potholes: 4, crowdSlowZones: 0 },
    decor: { houses: 7, people: 3, stalls: 1, streetLights: 1 }
  },
  {
    id: 'level3',
    name: 'LEVEL 3 — Load Shedding Night',
    objective: 'Follow the road, stay calm in the dark, and reach the safe checkpoint glow.',
    sky: 0x0d1220,
    fog: [15, 55],
    theme: 'loadshedding-night',
    checkpointText: 'Level 3 complete! Entering the township maze...',
    npc: {
      id: 'candleLady',
      name: 'Candle Lady',
      position: [4.5, 1, 4],
      hintText: 'It is dark here. Keep to the lit path and move carefully.'
    },
    hazards: { taxi: false, potholes: 2, crowdSlowZones: 0 },
    decor: { houses: 8, people: 2, stalls: 0, streetLights: 2 }
  },
  {
    id: 'level4',
    name: 'LEVEL 4 — Township Maze',
    objective: 'Read the environment, avoid dead ends, and follow the right passage to the checkpoint.',
    sky: 0xb4d6ff,
    fog: [24, 84],
    theme: 'township-maze',
    checkpointText: 'Level 4 complete! The market is up ahead...',
    npc: {
      id: 'townshipKid',
      name: 'Township Kid',
      position: [-4, 1, 7],
      hintText: 'The paths all look the same. Follow the open lane and bright walls.'
    },
    hazards: { taxi: false, potholes: 2, crowdSlowZones: 1 },
    decor: { houses: 12, people: 5, stalls: 1, streetLights: 0 }
  },
  {
    id: 'level5',
    name: 'LEVEL 5 — Informal Street Market',
    objective: 'Move through the busy market, avoid crowd slow zones, and deliver yourself to the far checkpoint.',
    sky: 0xf3d29a,
    fog: [30, 95],
    theme: 'market-day',
    checkpointText: 'Level 5 complete! Construction zone ahead...',
    npc: {
      id: 'vendor',
      name: 'Market Vendor',
      position: [5, 1, 6],
      hintText: 'Stay in the lane gaps. The crowd will slow you down if you push through them.'
    },
    hazards: { taxi: false, potholes: 1, crowdSlowZones: 3 },
    decor: { houses: 4, people: 10, stalls: 8, streetLights: 0 }
  },
  {
    id: 'level6',
    name: 'LEVEL 6 — Construction Zone',
    objective: 'Avoid trenches, barriers, and moving danger, then reach the checkpoint.',
    sky: 0xc9d4dd,
    fog: [24, 84],
    theme: 'construction-zone',
    checkpointText: 'Level 6 complete! Taxi road chase loading...',
    npc: {
      id: 'worker',
      name: 'Road Worker',
      position: [-5, 1, 6],
      hintText: 'Mind the trenches and do not stand in front of moving traffic.'
    },
    hazards: { taxi: true, potholes: 2, crowdSlowZones: 0 },
    decor: { houses: 2, people: 4, stalls: 0, streetLights: 1 },
    taxiPattern: 'construction-sweep'
  },
  {
    id: 'level7',
    name: 'LEVEL 7 — Taxi Road Chase',
    objective: 'Stay on the verge, dodge fast taxis, and survive to the checkpoint.',
    sky: 0x7da9d8,
    fog: [22, 100],
    theme: 'highway-chase',
    checkpointText: 'Level 7 complete! Final safe zone ahead...',
    npc: {
      id: 'hawker',
      name: 'Roadside Hawker',
      position: [5, 1, 8],
      hintText: 'Run along the side and never trust the taxi line.'
    },
    hazards: { taxi: true, potholes: 0, crowdSlowZones: 0 },
    decor: { houses: 0, people: 3, stalls: 2, streetLights: 0 },
    taxiPattern: 'highway-chase'
  },
  {
    id: 'level8',
    name: 'LEVEL 8 — Safe Zone',
    objective: 'Walk the final path, talk to the elder, and reach the celebration checkpoint.',
    sky: 0xffc788,
    fog: [28, 100],
    theme: 'safe-zone',
    checkpointText: 'You made it! Mzansi Escape complete.',
    npc: {
      id: 'elder',
      name: 'Community Elder',
      position: [0, 1, 3],
      hintText: 'You are almost there. Walk forward and finish the journey.'
    },
    hazards: { taxi: false, potholes: 0, crowdSlowZones: 0 },
    decor: { houses: 5, people: 6, stalls: 2, streetLights: 2 }
  }
];

export default LevelData;

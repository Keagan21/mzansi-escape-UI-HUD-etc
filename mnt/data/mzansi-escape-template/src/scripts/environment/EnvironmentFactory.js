import * as THREE from 'three';

class EnvironmentFactory {
  buildLevel(level) {
    const root = new THREE.Group();
    const meta = {
      crowdSlowZones: [],
      spawn: new THREE.Vector3(0, 1, 12),
      bounds: { minX: -12, maxX: 12, minZ: -18, maxZ: 14 }
    };

    this.createGround(root, level);

    const checkpoint = this.createCheckpoint(level);
    root.add(checkpoint);

    let taxi = null;
    if (level.hazards?.taxi) {
      taxi = this.createTaxi(level);
      root.add(taxi);
    }

    const potholes = this.createPotholes(level);
    potholes.forEach((p) => root.add(p));

    this.decorateByTheme(root, level, meta);

    return { root, taxi, checkpoint, potholes, crowdSlowZones: meta.crowdSlowZones, spawn: meta.spawn, bounds: meta.bounds };
  }

  createGround(root, level) {
    const roadColor = level.id === 'level3' ? 0x2b3240 : 0x4e5359;
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 42),
      new THREE.MeshStandardMaterial({ color: roadColor })
    );
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    root.add(road);

    const shoulderMat = new THREE.MeshStandardMaterial({ color: level.id === 'level5' ? 0x8a6c3a : 0x72685d });
    const leftShoulder = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 42), shoulderMat);
    const rightShoulder = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 42), shoulderMat);
    leftShoulder.rotation.x = rightShoulder.rotation.x = -Math.PI / 2;
    leftShoulder.position.set(-9.6, 0.01, 0);
    rightShoulder.position.set(9.6, 0.01, 0);
    root.add(leftShoulder, rightShoulder);

    const laneMaterial = new THREE.MeshBasicMaterial({ color: 0xffd84a });
    for (let z = -16; z <= 16; z += 6) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 3), laneMaterial);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.02, z);
      root.add(dash);
    }
  }

  createCheckpoint(level) {
    const group = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.4, 0.18, 14, 28),
      new THREE.MeshStandardMaterial({ color: 0x36e58f, emissive: 0x123f26, metalness: 0.2, roughness: 0.35 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.5;
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 3.2, 12),
      new THREE.MeshStandardMaterial({ color: 0x8af5b7, emissive: 0x1b6a3a, transparent: true, opacity: 0.78 })
    );
    beacon.position.y = 1.6;
    group.add(ring, beacon);
    group.position.set(0, 0, -15.5);
    if (level.id === 'level8') group.position.set(0, 0, -12.5);
    return group;
  }

  createTaxi(level) {
    const taxi = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 1.3, 4.8),
      new THREE.MeshStandardMaterial({ color: 0xffde00, roughness: 0.55, metalness: 0.15 })
    );
    body.castShadow = true;
    taxi.add(body);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(1.85, 0.7, 2.2),
      new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.45 })
    );
    roof.position.y = 0.95;
    taxi.add(roof);

    const bumper = new THREE.Mesh(
      new THREE.BoxGeometry(2.15, 0.25, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x2d2d2d })
    );
    bumper.position.set(0, -0.35, 2.25);
    const bumper2 = bumper.clone();
    bumper2.position.z = -2.25;
    taxi.add(bumper, bumper2);

    const windowMat = new THREE.MeshStandardMaterial({ color: 0x5da7d1, transparent: true, opacity: 0.75 });
    const frontWindow = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.45, 0.08), windowMat);
    frontWindow.position.set(0, 0.95, 1.1);
    const backWindow = frontWindow.clone();
    backWindow.position.z = -1.1;
    taxi.add(frontWindow, backWindow);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.22, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    sign.position.set(0, 1.42, 0);
    taxi.add(sign);

    for (const [x, z] of [[-0.95, 1.55],[0.95, 1.55],[-0.95,-1.55],[0.95,-1.55]]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 0.25, 18),
        new THREE.MeshStandardMaterial({ color: 0x191919 })
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, -0.52, z);
      taxi.add(wheel);
    }

    taxi.position.set(0, 0.8, level.taxiPattern === 'highway-chase' ? -10 : -4);
    taxi.userData.pattern = level.taxiPattern || 'rank-cross';
    return taxi;
  }

  createPotholes(level) {
    const map = {
      level1: [[-2.8, -3.5], [2.7, -8.5]],
      level2: [[-3.6, -3.4], [3.1, -6.4], [-1.6, -10.6], [1.7, -13.2]],
      level3: [[-2.0, -6.0], [2.5, -10.5]],
      level4: [[-1.8, -4.2], [2.2, -8.0]],
      level5: [[0.8, -9.2]],
      level6: [[-2.3, -5.8], [2.9, -11.5]],
      level7: [],
      level8: []
    };
    return (map[level.id] || []).map(([x, z]) => {
      const pothole = new THREE.Mesh(
        new THREE.CircleGeometry(1.0, 20),
        new THREE.MeshStandardMaterial({ color: 0x161616 })
      );
      pothole.rotation.x = -Math.PI / 2;
      pothole.position.set(x, 0.025, z);
      return pothole;
    });
  }

  decorateByTheme(root, level, meta) {
    switch (level.theme) {
      case 'durban-rank-day':
        this.buildDurbanTaxiRank(root, level, meta);
        break;
      case 'joburg-street':
        this.buildJoburgStreet(root, level, meta);
        break;
      case 'loadshedding-night':
        this.buildLoadShedding(root, level, meta);
        break;
      case 'township-maze':
        this.buildTownshipMaze(root, level, meta);
        break;
      case 'market-day':
        this.buildMarket(root, level, meta);
        break;
      case 'construction-zone':
        this.buildConstruction(root, level, meta);
        break;
      case 'highway-chase':
        this.buildHighway(root, level, meta);
        break;
      case 'safe-zone':
        this.buildSafeZone(root, level, meta);
        break;
      default:
        this.createHouses(root, level.decor?.houses || 4);
        this.createPeople(root, level.decor?.people || 2);
    }
  }

  buildDurbanTaxiRank(root, level, meta) {
    meta.spawn.set(0, 1, 12);
    meta.bounds = { minX: -11.5, maxX: 11.5, minZ: -18, maxZ: 14 };
    this.createTerminalCanopy(root, 0, 8.5, 9.5);
    this.createRankLanes(root, 4);
    this.createStalls(root, [
      [-9, 7], [-9, 3], [-9, -1], [9, 7], [9, 2], [9, -2]
    ]);
    this.createPeople(root, 8, [
      [-6.8,1,6.5], [-7.2,1,2.8], [-6.4,1,-0.5], [6.5,1,6], [7.1,1,1.6], [6.3,1,-2.3], [0,1,9.2], [2.5,1,10.5]
    ]);
    this.createSigns(root, [
      ['CBD', -4.5, 1.8, 8.5], ['UMLAZI', 0, 1.8, 8.5], ['ISIPINGO', 4.5, 1.8, 8.5]
    ]);
    this.createHouses(root, 2, [
      [-11.2, 1.8, -10], [11.2, 1.8, -10]
    ], 0x8a6f5c);
    meta.crowdSlowZones.push({ position: new THREE.Vector3(0, 0, 8.2), radius: 2.4, strength: 0.65 });
  }

  buildJoburgStreet(root, level, meta) {
    meta.spawn.set(0, 1, 12);
    this.createHouses(root, 7);
    this.createPeople(root, 3);
    this.createTrafficLights(root, [[-7, 0], [7, -6]]);
    this.createGraffitiWalls(root);
  }

  buildLoadShedding(root, level, meta) {
    meta.spawn.set(0, 1, 12);
    this.createHouses(root, 8);
    this.createPeople(root, 2);
    this.createStreetLights(root, [[-6, 4], [6, -6]], true);
    this.createGenerator(root, [7.8, 0.65, -2]);
  }

  buildTownshipMaze(root, level, meta) {
    meta.spawn.set(0, 1, 12.5);
    meta.bounds = { minX: -12, maxX: 12, minZ: -18, maxZ: 14 };
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8ba0b8 });
    const pieces = [
      [0, -2, 20, 2, 0], [-5, -7, 2, 10, 0], [5, -6, 2, 12, 0],
      [-2.5, -11, 7, 2, 0], [4, -13.5, 8, 2, 0], [-8, -13, 2, 8, 0]
    ];
    pieces.forEach(([x, z, w, d]) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 2.1, d), wallMat);
      wall.position.set(x, 1.05, z);
      wall.castShadow = true;
      root.add(wall);
    });
    this.createPeople(root, 5);
    this.createHouses(root, 6);
    meta.crowdSlowZones.push({ position: new THREE.Vector3(-5.2, 0, -5.5), radius: 1.8, strength: 0.75 });
  }

  buildMarket(root, level, meta) {
    meta.spawn.set(0, 1, 12.5);
    this.createStalls(root, [
      [-8, 8], [-8, 3], [-8, -2], [8, 8], [8, 3], [8, -2], [-4, -8], [4, -8]
    ], true);
    this.createPeople(root, 10);
    this.createHouses(root, 4);
    meta.crowdSlowZones.push(
      { position: new THREE.Vector3(-2.5, 0, 1.2), radius: 2.3, strength: 0.6 },
      { position: new THREE.Vector3(2.2, 0, -3.5), radius: 2.4, strength: 0.6 },
      { position: new THREE.Vector3(0, 0, -8.5), radius: 1.9, strength: 0.65 }
    );
  }

  buildConstruction(root, level, meta) {
    meta.spawn.set(0, 1, 12);
    this.createBarriers(root, [[-6, 3], [6, 0], [-5, -5], [5, -8]]);
    this.createTrenches(root, [[-2, -6], [2.5, -11]]);
    this.createPeople(root, 4);
    this.createStreetLights(root, [[-8, 4]], false);
  }

  buildHighway(root, level, meta) {
    meta.spawn.set(0, 1, 13);
    meta.bounds = { minX: -10, maxX: 10, minZ: -18, maxZ: 14 };
    this.createBillboards(root, [[-8, 5], [8, -2]]);
    this.createStalls(root, [[-8.5, 10], [8.5, 8]], true);
    this.createPeople(root, 3);
  }

  buildSafeZone(root, level, meta) {
    meta.spawn.set(0, 1, 10);
    this.createHouses(root, 5);
    this.createPeople(root, 6);
    this.createBraai(root, [0, 0.4, -4]);
    this.createStreetLights(root, [[-6, 0], [6, 0]], false);
  }

  createTerminalCanopy(root, x, z, width) {
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.3, 6.5),
      new THREE.MeshStandardMaterial({ color: 0x9ea7af })
    );
    roof.position.set(x, 3.3, z);
    root.add(roof);
    [-width / 2 + 0.6, width / 2 - 0.6].forEach((offsetX) => {
      [z - 2.5, z + 2.5].forEach((offsetZ) => {
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 3.2, 10),
          new THREE.MeshStandardMaterial({ color: 0x666b70 })
        );
        pole.position.set(x + offsetX, 1.6, offsetZ);
        root.add(pole);
      });
    });
  }

  createRankLanes(root, count = 4) {
    for (let i = 0; i < count; i++) {
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(0.18, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      line.rotation.x = -Math.PI / 2;
      line.position.set(-6 + i * 4, 0.02, 0);
      root.add(line);
    }
  }

  createSigns(root, labels) {
    labels.forEach(([text, x, y, z]) => {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.2, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x4a4a4a })
      );
      post.position.set(x, y - 0.5, z);
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.7, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x0d1220 })
      );
      board.position.set(x, y, z);
      root.add(post, board);
      board.userData.label = text;
    });
  }

  createTrafficLights(root, positions) {
    positions.forEach(([x, z]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.6, 10), new THREE.MeshStandardMaterial({ color: 0x50565d }));
      pole.position.set(x, 2.3, z);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.45), new THREE.MeshStandardMaterial({ color: 0x1d1d1d }));
      box.position.set(x + 0.3, 3.3, z);
      root.add(pole, box);
    });
  }

  createGraffitiWalls(root) {
    [-9.5, 9.5].forEach((x, idx) => {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(1, 2.6, 12),
        new THREE.MeshStandardMaterial({ color: idx === 0 ? 0x7d6aa0 : 0x5b8a72 })
      );
      wall.position.set(x, 1.3, -2);
      root.add(wall);
    });
  }

  createStreetLights(root, positions, dim = false) {
    positions.forEach(([x, z]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5.5, 10), new THREE.MeshStandardMaterial({ color: 0x5e646d }));
      pole.position.set(x, 2.75, z);
      root.add(pole);
      const lamp = new THREE.PointLight(0xffdc96, dim ? 0.6 : 1.1, 12);
      lamp.position.set(x, 4.8, z);
      root.add(lamp);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
      bulb.position.copy(lamp.position);
      root.add(bulb);
    });
  }

  createGenerator(root, [x, y, z]) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 1.2), new THREE.MeshStandardMaterial({ color: 0x35566d }));
    body.position.set(x, y, z);
    root.add(body);
  }

  createBarriers(root, positions) {
    positions.forEach(([x, z]) => {
      const barrier = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 0.5), new THREE.MeshStandardMaterial({ color: 0xf38b2f }));
      barrier.position.set(x, 0.5, z);
      root.add(barrier);
    });
  }

  createTrenches(root, positions) {
    positions.forEach(([x, z]) => {
      const trench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 1.8), new THREE.MeshStandardMaterial({ color: 0x1d1d1d }));
      trench.position.set(x, 0.09, z);
      root.add(trench);
    });
  }

  createBillboards(root, positions) {
    positions.forEach(([x, z]) => {
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4.5, 0.15), new THREE.MeshStandardMaterial({ color: 0x666 }));
      pole.position.set(x, 2.25, z);
      const board = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.6, 0.18), new THREE.MeshStandardMaterial({ color: 0x20344a }));
      board.position.set(x, 4.2, z);
      root.add(pole, board);
    });
  }

  createBraai(root, [x, y, z]) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.5, 18), new THREE.MeshStandardMaterial({ color: 0x4f4f4f }));
    base.position.set(x, y, z);
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 10), new THREE.MeshBasicMaterial({ color: 0xff7a1a }));
    fire.position.set(x, y + 0.7, z);
    const glow = new THREE.PointLight(0xff8a33, 1.2, 10);
    glow.position.set(x, y + 1.1, z);
    root.add(base, fire, glow);
  }

  createStalls(root, positions, colorful = false) {
    positions.forEach(([x, z], i) => {
      const colors = [0xbf4e4e, 0x4c86b0, 0x6d9f4c, 0xc07d2e];
      const color = colorful ? colors[i % colors.length] : 0x8c5d34;
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.3, 1.5), new THREE.MeshStandardMaterial({ color: 0x6c4927 }));
      base.position.set(x, 0.65, z);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 1.9), new THREE.MeshStandardMaterial({ color }));
      roof.position.set(x, 1.55, z);
      root.add(base, roof);
    });
  }

  createHouses(root, count = 4, positions = null, tint = 0x7d6652) {
    const generated = positions || Array.from({ length: count }, (_, i) => [i % 2 === 0 ? -10.5 : 10.5, 1.45, 8 - i * 4]);
    generated.forEach(([x, y, z], idx) => {
      const colors = [tint, 0x946d55, 0x788f6a, 0x7d6da8, 0xa86d6d];
      const body = new THREE.Mesh(new THREE.BoxGeometry(3, 2.9, 3), new THREE.MeshStandardMaterial({ color: colors[idx % colors.length] }));
      body.position.set(x, y, z);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1.2, 4), new THREE.MeshStandardMaterial({ color: 0x4e392e }));
      roof.position.set(x, y + 2.05, z);
      roof.rotation.y = Math.PI * 0.25;
      root.add(body, roof);
    });
  }

  createPeople(root, count = 2, positions = null) {
    const generated = positions || Array.from({ length: count }, (_, i) => [i % 2 === 0 ? -7.5 : 7.5, 1, 7 - i * 3.2]);
    generated.forEach(([x, y, z], idx) => {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.9, 4, 8), new THREE.MeshStandardMaterial({ color: [0x2f8f83, 0xcc704b, 0x7b5cc2, 0x598a3a][idx % 4] }));
      body.position.set(x, y, z);
      body.castShadow = true;
      root.add(body);
    });
  }
}

export default EnvironmentFactory;

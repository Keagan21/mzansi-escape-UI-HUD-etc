import * as THREE from 'three';
import LevelData from './LevelData.js';
import EventBus from '../utils/EventBus.js';
import NPCController from '../npc/NPCController.js';

class LevelManager {
  constructor({ scene, camera, npcManager, hud, environmentFactory }) {
    this.scene = scene;
    this.camera = camera;
    this.npcManager = npcManager;
    this.hud = hud;
    this.environmentFactory = environmentFactory;
    this.levelIndex = 0;
    this.currentRoot = null;
    this.currentLevel = null;
    this.taxi = null;
    this.checkpoint = null;
    this.potholes = [];
    this.crowdSlowZones = [];
    this.spawnPoint = new THREE.Vector3(0, 1, 10);
    this.bounds = { minX: -12, maxX: 12, minZ: -18, maxZ: 14 };
    this.taxiDirection = 1;
    this.taxiBaseX = 0;
  }

  load(index = 0) {
    this.unload();
    this.levelIndex = index;
    this.currentLevel = LevelData[index];

    this.scene.background = new THREE.Color(this.currentLevel.sky);
    this.scene.fog = new THREE.Fog(this.currentLevel.sky, this.currentLevel.fog[0], this.currentLevel.fog[1]);

    this.currentRoot = this.environmentFactory.buildLevel(this.currentLevel);
    this.scene.add(this.currentRoot.root);
    this.taxi = this.currentRoot.taxi;
    this.checkpoint = this.currentRoot.checkpoint;
    this.potholes = this.currentRoot.potholes;
    this.crowdSlowZones = this.currentRoot.crowdSlowZones || [];
    this.spawnPoint = this.currentRoot.spawn || this.spawnPoint;
    this.bounds = this.currentRoot.bounds || this.bounds;
    this.taxiBaseX = this.taxi?.position?.x || 0;
    this.taxiDirection = 1;

    if (this.currentLevel.npc) {
      const [x, y, z] = this.currentLevel.npc.position;
      const npc = new NPCController({
        scene: this.currentRoot.root,
        id: this.currentLevel.npc.id,
        name: this.currentLevel.npc.name,
        position: new THREE.Vector3(x, y, z),
        levelId: this.currentLevel.id,
        triggerDistance: 3,
        hintText: this.currentLevel.npc.hintText,
        color: 0xffc107,
      });
      this.npcManager.add(npc);
    }

    this.hud.setLevelName(this.currentLevel.name);
    this.hud.setObjective(`Objective: ${this.currentLevel.objective}`);
    EventBus.emit('ui:hint', this.currentLevel.objective);
    EventBus.emit('level:changed', { ...this.currentLevel, spawnPoint: this.spawnPoint.clone() });
  }

  unload() {
    this.npcManager.clear?.();
    if (this.currentRoot?.root) this.scene.remove(this.currentRoot.root);
    this.currentRoot = null;
    this.currentLevel = null;
    this.taxi = null;
    this.checkpoint = null;
    this.potholes = [];
    this.crowdSlowZones = [];
  }

  update(dt, elapsed = 0) {
    if (!this.taxi) return;

    const pattern = this.taxi.userData.pattern || 'rank-cross';
    if (pattern === 'rank-cross') {
      this.taxi.position.x += this.taxiDirection * 6.3 * dt;
      if (this.taxi.position.x > 8) this.taxiDirection = -1;
      if (this.taxi.position.x < -8) this.taxiDirection = 1;
      this.taxi.rotation.y = this.taxiDirection > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else if (pattern === 'construction-sweep') {
      this.taxi.position.x = Math.sin(elapsed * 1.2) * 6;
      this.taxi.position.z = -6 + Math.cos(elapsed * 0.8) * 2.5;
      this.taxi.rotation.y = Math.PI / 2;
    } else if (pattern === 'highway-chase') {
      this.taxi.position.z = -12 + ((elapsed * 10) % 24);
      this.taxi.position.x = Math.sin(elapsed * 2.6) * 4.8;
      this.taxi.rotation.y = Math.PI;
    }
  }

  checkTaxiHit(playerPosition, radius = 1.9) {
    return this.taxi && playerPosition.distanceTo(this.taxi.position) < radius;
  }

  checkPotholeHit(playerPosition, radius = 1.2) {
    return this.potholes.find((p) => playerPosition.distanceTo(p.position) < radius) || null;
  }

  checkCrowdSlow(playerPosition) {
    return this.crowdSlowZones.find((z) => playerPosition.distanceTo(z.position) < z.radius) || null;
  }

  checkCheckpoint(playerPosition, radius = 2.2) {
    return this.checkpoint && playerPosition.distanceTo(this.checkpoint.position) < radius;
  }

  getBounds() {
    return this.bounds;
  }

  next() {
    const nextIndex = this.levelIndex + 1;
    if (nextIndex >= LevelData.length) {
      EventBus.emit('game:complete');
      return;
    }
    this.load(nextIndex);
  }
}

export default LevelManager;

import * as THREE from 'three';
import './style.css';
import EventBus from './scripts/utils/EventBus.js';
import InputHandler from './scripts/utils/InputHandler.js';
import UIManager from './scripts/ui/UIManager.js';
import HUD from './scripts/ui/HUD.js';
import DialogueBox from './scripts/ui/DialogueBox.js';
import DialogueManager from './scripts/dialogue/DialogueManager.js';
import NPCManager from './scripts/npc/NPCManager.js';
import AudioManager from './scripts/audio/AudioManager.js';
import HealthSystem from './scripts/game/HealthSystem.js';
import ScreenEffects from './scripts/effects/ScreenEffects.js';
import LevelManager from './scripts/levels/LevelManager.js';
import EnvironmentFactory from './scripts/environment/EnvironmentFactory.js';
import { createTeamBridge } from './scripts/integration/TeamBridge.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 150);
camera.position.set(0, 6, 10);

const audioManager = new AudioManager(camera);
const uiManager = new UIManager();
const hud = new HUD();
const dialogueBox = new DialogueBox();
const dialogueManager = new DialogueManager();
const input = new InputHandler();
const npcManager = new NPCManager();
const health = new HealthSystem(100);
const effects = new ScreenEffects(camera);
const environmentFactory = new EnvironmentFactory();
const levelManager = new LevelManager({ scene, camera, npcManager, hud, environmentFactory });

const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.15);
sun.position.set(12, 18, 8);
sun.castShadow = true;
scene.add(sun);

const player = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.5, 1.0, 4, 8),
  new THREE.MeshStandardMaterial({ color: 0x2ecc71 })
);
player.castShadow = true;
player.position.set(0, 1.0, 10);
scene.add(player);

const teamBridge = createTeamBridge({ player, fallbackLevelManager: levelManager });

hud.setHealth(100, 100);
EventBus.emit('ui:hint', 'WASD to move • E to advance dialogue • M to test browser audio');
levelManager.load(0);

let taxiHitCooldown = 0;
let potholeCooldown = 0;
let checkpointCooldown = 0;
let slowedUntil = 0;

function resetPlayerForNewLevel() {
  teamBridge.setPlayerPosition(levelManager.spawnPoint.clone());
  checkpointCooldown = 0.8;
}

function updateFallbackPlayer(dt, elapsed) {
  if (dialogueBox.isOpen()) return;

  const crowdZone = levelManager.checkCrowdSlow(teamBridge.getPlayerPosition());
  const crowdMultiplier = crowdZone ? crowdZone.strength : 1;
  const speed = (elapsed < slowedUntil ? 2.4 : 5.2) * crowdMultiplier;
  const moveX = (input.isDown('d') ? 1 : 0) - (input.isDown('a') ? 1 : 0);
  const moveZ = (input.isDown('s') ? 1 : 0) - (input.isDown('w') ? 1 : 0);

  const direction = new THREE.Vector3(moveX, 0, moveZ);
  if (direction.lengthSq() > 0) {
    direction.normalize().multiplyScalar(speed * dt);
    player.position.add(direction);
    const bounds = levelManager.getBounds();
    player.position.x = THREE.MathUtils.clamp(player.position.x, bounds.minX, bounds.maxX);
    player.position.z = THREE.MathUtils.clamp(player.position.z, bounds.minZ, bounds.maxZ);
  }
}

function updatePlayer(dt, elapsed) {
  if (teamBridge && globalThis.TeamIntegration?.player?.update) {
    teamBridge.updatePlayer(dt, {
      input,
      dialogueOpen: dialogueBox.isOpen(),
      bounds: levelManager.getBounds(),
      slowedUntil,
      elapsed
    });
  } else {
    updateFallbackPlayer(dt, elapsed);
  }
}

function updateCamera() {
  const tracked = teamBridge.getPlayerPosition();
  const target = tracked.clone().add(new THREE.Vector3(0, 5, 9));
  camera.position.lerp(target, 0.08);
  camera.lookAt(tracked.x, tracked.y + 1, tracked.z - 2);
}

function handleWarnings(playerPosition) {
  if (levelManager.taxi) {
    const taxiDistance = playerPosition.distanceTo(levelManager.taxi.position);
    if (taxiDistance < 5.2) {
      effects.showWarning('Taxi incoming! Move out of the way!', 420, 'danger');
    }
  }

  const crowd = levelManager.checkCrowdSlow(playerPosition);
  if (crowd) {
    effects.showWarning('Crowd pressure! You are moving slower here.', 320, 'warning');
  }
}

function handleHazards(dt, elapsed, playerPosition) {
  taxiHitCooldown -= dt;
  potholeCooldown -= dt;
  checkpointCooldown -= dt;

  if (levelManager.checkTaxiHit(playerPosition) && taxiHitCooldown <= 0) {
    taxiHitCooldown = 1.1;
    health.damage(20, 'taxi');
    effects.flash('danger');
    effects.shake(0.25, 320);
    effects.showWarning('Ehh! You got hit by a taxi!', 1200, 'danger');
    audioManager.playBrowserAudio('/assets/sounds/taxi-hooter.wav');
  }

  if (levelManager.checkPotholeHit(playerPosition) && potholeCooldown <= 0) {
    potholeCooldown = 1.4;
    slowedUntil = elapsed + 2.0;
    effects.blur(450);
    effects.showWarning('Eish! Pothole! You are slowed down.', 1200, 'warning');
    audioManager.playBrowserAudio('/assets/sounds/pothole-thud.wav');
  }

  if (levelManager.checkCheckpoint(playerPosition) && checkpointCooldown <= 0) {
    checkpointCooldown = 2;
    hud.flashMessage(levelManager.currentLevel.checkpointText);
    audioManager.playBrowserAudio('/assets/sounds/checkpoint.wav');
    setTimeout(() => {
      teamBridge.completeLevel();
      if (!teamBridge.useExternalLevelFlow()) resetPlayerForNewLevel();
    }, 1100);
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

EventBus.on('dialogue:open', (payload) => {
  audioManager.playBrowserAudio('/assets/sounds/dialogue-open.wav');
  dialogueManager.open(payload);
});

EventBus.on('audio:test', () => {
  audioManager.playBrowserAudio('/assets/sounds/taxi-hooter.wav');
  uiManager.showHint('Played placeholder audio.');
});

EventBus.on('player:health-changed', ({ health: current, maxHealth, reason }) => {
  hud.setHealth(current, maxHealth);
  if (reason === 'taxi') {
    hud.flashMessage(`Health reduced to ${current}/${maxHealth}`);
  }
});

EventBus.on('player:died', () => {
  effects.flash('danger', 650);
  effects.showWarning('You were knocked out. Restarting level...', 1800, 'danger');
  setTimeout(() => {
    health.reset();
    levelManager.load(levelManager.levelIndex);
    resetPlayerForNewLevel();
  }, 1200);
});

EventBus.on('game:complete', () => {
  effects.flash('success', 700);
  effects.showWarning('All 8 template levels complete! Start replacing placeholders with final assets.', 2600, 'success');
  hud.flashMessage('Mzansi Escape template run complete.');
});

EventBus.on('level:changed', (level) => {
  const index = levelManager.levelIndex + 1;
  hud.setStage(`Stage ${index} / 8`);
  if (!teamBridge.useExternalLevelFlow()) resetPlayerForNewLevel();
  teamBridge.onLevelLoaded(level);
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const elapsed = clock.elapsedTime;

  updatePlayer(dt, elapsed);
  levelManager.update(dt, elapsed);
  const playerPosition = teamBridge.getPlayerPosition();
  player.position.copy(playerPosition);
  npcManager.update(playerPosition, dt);
  handleWarnings(playerPosition);
  handleHazards(dt, elapsed, playerPosition);
  updateCamera();

  renderer.render(scene, camera);
}

animate();

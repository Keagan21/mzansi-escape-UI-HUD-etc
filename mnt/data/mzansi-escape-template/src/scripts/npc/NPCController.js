import * as THREE from 'three';
import EventBus from '../utils/EventBus.js';

class NPCController {
  constructor({ scene, id, name, position, levelId, triggerDistance = 3, hintText = '', color = 0xffc107 }) {
    this.id = id;
    this.name = name;
    this.levelId = levelId;
    this.triggerDistance = triggerDistance;
    this.hintText = hintText;
    this.hasTriggered = false;

    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 2, 1),
      new THREE.MeshStandardMaterial({ color })
    );
    this.mesh.castShadow = true;
    this.mesh.position.copy(position);
    scene.add(this.mesh);
  }

  update(playerPosition) {
    const distance = playerPosition.distanceTo(this.mesh.position);

    if (!this.hasTriggered && distance < 5 && this.hintText) {
      EventBus.emit('ui:hint', this.hintText);
    }

    if (!this.hasTriggered && distance <= this.triggerDistance) {
      this.hasTriggered = true;
      EventBus.emit('dialogue:open', {
        levelId: this.levelId,
        npcId: this.id,
        fallbackName: this.name
      });
    }
  }
}

export default NPCController;

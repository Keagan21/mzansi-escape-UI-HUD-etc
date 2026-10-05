import * as THREE from 'three';

export function createTeamBridge({ player, fallbackLevelManager }) {
  const integration = globalThis.TeamIntegration || null;

  const bridge = {
    getPlayerPosition() {
      if (integration?.player?.getPosition) {
        const p = integration.player.getPosition();
        return p instanceof THREE.Vector3 ? p : new THREE.Vector3(p.x, p.y, p.z);
      }
      return player.position;
    },

    setPlayerPosition(position) {
      if (integration?.player?.setPosition) {
        integration.player.setPosition(position);
      } else {
        player.position.copy(position);
      }
    },

    updatePlayer(dt, context) {
      if (integration?.player?.update) {
        integration.player.update(dt, context);
      }
    },

    onLevelLoaded(level) {
      integration?.levels?.onLevelLoaded?.(level);
    },

    completeLevel() {
      if (integration?.levels?.next) {
        integration.levels.next();
      } else {
        fallbackLevelManager.next();
      }
    },

    useExternalLevelFlow() {
      return Boolean(integration?.levels?.next);
    }
  };

  return bridge;
}

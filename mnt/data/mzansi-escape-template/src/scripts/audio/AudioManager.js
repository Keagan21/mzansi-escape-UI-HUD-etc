import * as THREE from 'three';

class AudioManager {
  constructor(camera) {
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);
    this.loader = new THREE.AudioLoader();
  }

  playBrowserAudio(path) {
    const audio = new Audio(path);
    audio.play().catch(() => {
      console.warn(`Audio could not autoplay for ${path}. Click or press a key, then try again.`);
    });
  }

  attachPositionalAudio(mesh, path, { loop = true, refDistance = 5 } = {}) {
    const sound = new THREE.PositionalAudio(this.listener);
    this.loader.load(path, (buffer) => {
      sound.setBuffer(buffer);
      sound.setLoop(loop);
      sound.setRefDistance(refDistance);
      sound.play();
    });
    mesh.add(sound);
    return sound;
  }
}

export default AudioManager;

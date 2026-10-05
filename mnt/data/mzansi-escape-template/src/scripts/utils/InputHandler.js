import EventBus from './EventBus.js';

class InputHandler {
  constructor() {
    this.keys = new Set();

    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      this.keys.add(key);

      if (key === 'e') EventBus.emit('dialogue:advance');
      if (key === 'm') EventBus.emit('audio:test');
    });

    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
  }

  isDown(key) {
    return this.keys.has(key.toLowerCase());
  }
}

export default InputHandler;

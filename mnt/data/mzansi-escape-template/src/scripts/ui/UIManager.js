import EventBus from '../utils/EventBus.js';

class UIManager {
  constructor() {
    this.hintEl = document.getElementById('hint');
    this.hideHintTimeout = null;
    EventBus.on('ui:hint', (text) => this.showHint(text));
  }

  showHint(text, duration = 5000) {
    this.hintEl.textContent = text;
    this.hintEl.classList.remove('hidden');

    if (this.hideHintTimeout) clearTimeout(this.hideHintTimeout);
    this.hideHintTimeout = setTimeout(() => this.hideHint(), duration);
  }

  hideHint() {
    this.hintEl.classList.add('hidden');
  }
}

export default UIManager;

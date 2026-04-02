import EventBus from '../utils/EventBus.js';
import { typeText } from '../utils/Typewriter.js';

class DialogueBox {
  constructor() {
    this.box = document.getElementById('dialogue-box');
    this.nameEl = document.getElementById('npc-name');
    this.textEl = document.getElementById('dialogue-text');
    this.lines = [];
    this.index = 0;
    this.open = false;
    this.typing = false;
    this.skipTyping = false;

    EventBus.on('dialogue:start-ui', ({ npcName, lines }) => this.start(npcName, lines));
    EventBus.on('dialogue:advance', () => this.advance());
  }

  async start(npcName, lines) {
    this.lines = lines;
    this.index = 0;
    this.open = true;
    this.box.classList.remove('hidden');
    this.nameEl.textContent = npcName;
    await this.showCurrentLine();
  }

  async showCurrentLine() {
    this.typing = true;
    this.skipTyping = false;
    await typeText(this.textEl, this.lines[this.index], 20, () => this.skipTyping);
    this.typing = false;
  }

  async advance() {
    if (!this.open) return;

    if (this.typing) {
      this.skipTyping = true;
      return;
    }

    this.index += 1;
    if (this.index >= this.lines.length) {
      this.close();
      return;
    }

    await this.showCurrentLine();
  }

  close() {
    this.open = false;
    this.box.classList.add('hidden');
    this.textEl.textContent = '';
    EventBus.emit('dialogue:closed');
  }

  isOpen() {
    return this.open;
  }
}

export default DialogueBox;

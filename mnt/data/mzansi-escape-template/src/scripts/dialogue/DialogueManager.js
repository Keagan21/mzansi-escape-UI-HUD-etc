import EventBus from '../utils/EventBus.js';
import DialogueData from './DialogueData.js';

class DialogueManager {
  open({ levelId, npcId, fallbackName = 'NPC' }) {
    const entry = DialogueData[levelId]?.[npcId];
    if (!entry) {
      EventBus.emit('dialogue:start-ui', {
        npcName: fallbackName,
        lines: ['Dialogue not found yet. Add it in src/scripts/dialogue/DialogueData.js']
      });
      return;
    }

    EventBus.emit('dialogue:start-ui', {
      npcName: entry.npcName,
      lines: entry.lines
    });
  }
}

export default DialogueManager;

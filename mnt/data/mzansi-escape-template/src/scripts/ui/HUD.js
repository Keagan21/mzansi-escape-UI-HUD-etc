class HUD {
  constructor() {
    this.levelEl = document.getElementById('level-name');
    this.objectiveEl = document.getElementById('objective-text');
    this.healthFill = document.getElementById('health-fill');
    this.healthLabel = document.getElementById('health-label');
    this.stageCounter = document.getElementById('stage-counter');
  }

  setLevelName(text) {
    this.levelEl.textContent = text;
  }

  setObjective(text) {
    this.objectiveEl.textContent = text;
  }

  setStage(text) {
    if (this.stageCounter) this.stageCounter.textContent = text;
  }

  setHealth(current, max) {
    const pct = Math.max(0, Math.min(100, (current / max) * 100));
    this.healthFill.style.width = `${pct}%`;
    this.healthLabel.textContent = `Health: ${current}/${max}`;
  }

  flashMessage(text) {
    const previous = this.objectiveEl.textContent;
    this.objectiveEl.textContent = text;
    setTimeout(() => {
      this.objectiveEl.textContent = previous;
    }, 3000);
  }
}

export default HUD;

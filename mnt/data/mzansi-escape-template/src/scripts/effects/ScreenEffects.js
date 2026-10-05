class ScreenEffects {
  constructor(camera) {
    this.camera = camera;
    this.overlay = document.getElementById('fx-overlay');
    this.root = document.documentElement;
    this.warningEl = document.getElementById('warning-banner');
    this.warningTimeout = null;
  }

  flash(type = 'danger', duration = 220) {
    this.overlay.className = '';
    this.overlay.classList.add('active', `flash-${type}`);
    setTimeout(() => this.overlay.classList.remove('active', `flash-${type}`), duration);
  }

  blur(duration = 400) {
    this.root.classList.add('world-blur');
    setTimeout(() => this.root.classList.remove('world-blur'), duration);
  }

  shake(intensity = 0.19, duration = 280) {
    const original = this.camera.position.clone();
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      if (elapsed >= duration) {
        this.camera.position.copy(original);
        return;
      }
      const falloff = 1 - elapsed / duration;
      this.camera.position.x = original.x + (Math.random() - 0.5) * intensity * falloff;
      this.camera.position.y = original.y + (Math.random() - 0.5) * intensity * falloff;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  showWarning(text, duration = 1400, type = 'danger') {
    this.warningEl.textContent = text;
    this.warningEl.className = `panel warning ${type}`;
    this.warningEl.classList.remove('hidden');
    clearTimeout(this.warningTimeout);
    this.warningTimeout = setTimeout(() => this.warningEl.classList.add('hidden'), duration);
  }
}

export default ScreenEffects;

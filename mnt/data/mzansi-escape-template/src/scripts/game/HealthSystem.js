import EventBus from '../utils/EventBus.js';

class HealthSystem {
  constructor(maxHealth = 100) {
    this.maxHealth = maxHealth;
    this.health = maxHealth;
  }

  damage(amount, reason = 'damage') {
    this.health = Math.max(0, this.health - amount);
    EventBus.emit('player:health-changed', {
      health: this.health,
      maxHealth: this.maxHealth,
      reason,
      amount
    });

    if (this.health <= 0) {
      EventBus.emit('player:died', { reason });
    }
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    EventBus.emit('player:health-changed', {
      health: this.health,
      maxHealth: this.maxHealth,
      reason: 'heal',
      amount
    });
  }

  reset() {
    this.health = this.maxHealth;
    EventBus.emit('player:health-changed', {
      health: this.health,
      maxHealth: this.maxHealth,
      reason: 'reset',
      amount: 0
    });
  }
}

export default HealthSystem;

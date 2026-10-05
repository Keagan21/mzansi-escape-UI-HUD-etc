class EventBus {
  static listeners = new Map();

  static on(eventName, callback) {
    if (!this.listeners.has(eventName)) this.listeners.set(eventName, []);
    this.listeners.get(eventName).push(callback);
  }

  static emit(eventName, payload) {
    const callbacks = this.listeners.get(eventName) || [];
    callbacks.forEach((callback) => callback(payload));
  }
}

export default EventBus;

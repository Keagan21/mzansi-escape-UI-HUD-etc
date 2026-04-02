class NPCManager {
  constructor() {
    this.npcs = [];
  }

  add(npc) {
    this.npcs.push(npc);
  }

  clear() {
    this.npcs = [];
  }

  update(playerPosition) {
    this.npcs.forEach((npc) => npc.update(playerPosition));
  }
}

export default NPCManager;

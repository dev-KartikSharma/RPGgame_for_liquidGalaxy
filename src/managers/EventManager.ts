import Phaser from "phaser";

/**
 * Global Event Manager for cross-scene communication.
 */
class EventManager extends Phaser.Events.EventEmitter {
  constructor() {
    super();
  }
}

export const events = new EventManager();

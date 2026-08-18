import Phaser from "phaser";

export type EventCallback = (...args: any[]) => void;

/**
 * Global Event Manager for cross-scene communication.
 * Overrides off() and removeListener() to require a callback handler reference,
 * blocking accidental global wiping of listeners across scenes.
 */
export class EventManager extends Phaser.Events.EventEmitter {
  constructor() {
    super();
  }

  /**
   * Safely removes a specific listener for an event.
   * Requires a callback handler reference to prevent accidental global wipes.
   */
  override off(
    event: string | symbol,
    fn?: EventCallback,
    context?: any,
    once?: boolean,
  ): this {
    if (!fn) {
      console.warn(
        `[EventManager] Blocked wildcard off() call without callback handler for event "${String(
          event,
        )}". Pass the specific callback handler reference to avoid unregistering listeners in other scenes.`,
      );
      return this;
    }
    return super.off(event, fn, context, once);
  }

  /**
   * Safely removes a specific listener for an event (alias for off).
   */
  override removeListener(
    event: string | symbol,
    fn?: EventCallback,
    context?: any,
    once?: boolean,
  ): this {
    return this.off(event, fn, context, once);
  }
}

export const events = new EventManager();

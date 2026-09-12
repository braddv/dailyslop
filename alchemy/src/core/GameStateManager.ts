import type { GameState } from '../data/types';

export class GameStateManager extends EventTarget {
  current: GameState = 'HUB';
  set(next: GameState): void {
    const previous = this.current;
    this.current = next;
    this.dispatchEvent(new CustomEvent('change', { detail: { previous, next } }));
  }
}

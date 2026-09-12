export interface MoveVector { x: number; y: number }
export class InputManager {
  private keys = new Set<string>();
  move: MoveVector = { x: 0, y: 0 };
  constructor() {
    window.addEventListener('keydown', (event) => this.keys.add(event.key.toLowerCase()));
    window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()));
  }
  update(): MoveVector {
    const keyX = Number(this.keys.has('d') || this.keys.has('arrowright')) - Number(this.keys.has('a') || this.keys.has('arrowleft'));
    const keyY = Number(this.keys.has('w') || this.keys.has('arrowup')) - Number(this.keys.has('s') || this.keys.has('arrowdown'));
    return { x: Math.max(-1, Math.min(1, keyX + this.move.x)), y: Math.max(-1, Math.min(1, keyY + this.move.y)) };
  }
  bindJoystick(element: HTMLElement): void {
    let active = false;
    const update = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      this.move = { x: Math.max(-1, Math.min(1, (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2))), y: Math.max(-1, Math.min(1, ((rect.top + rect.height / 2) - event.clientY) / (rect.height / 2))) };
      element.style.setProperty('--stick-x', `${this.move.x * 25}px`);
      element.style.setProperty('--stick-y', `${-this.move.y * 25}px`);
    };
    element.addEventListener('pointerdown', (event) => { active = true; element.setPointerCapture(event.pointerId); update(event); });
    element.addEventListener('pointermove', (event) => { if (active) update(event); });
    const end = () => { active = false; this.move = { x: 0, y: 0 }; element.style.setProperty('--stick-x', '0px'); element.style.setProperty('--stick-y', '0px'); };
    element.addEventListener('pointerup', end); element.addEventListener('pointercancel', end);
  }
}

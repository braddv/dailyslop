export const isTouchDevice = () => navigator.maxTouchPoints > 0 || window.matchMedia('(any-pointer: coarse)').matches;

/** Persistent controls live outside the frequently updated HUD. Pointer capture
 * lets a thumb leave the pad; independent pointer IDs allow two-thumb play. */
export class TouchControls {
  readonly axis = { x: 0, y: 0 };
  private root = document.createElement('div');
  private pad: HTMLDivElement;
  private knob: HTMLSpanElement;
  private action: HTMLButtonElement;
  private pointer: number | null = null;
  private active = false;
  private targetAvailable = false;
  private media = window.matchMedia('(any-pointer: coarse)');

  constructor(onInteract: () => void) {
    this.root.id = 'touch-controls';
    this.root.innerHTML = `<div class="touch-pad" role="group" aria-label="Movement joystick"><span class="pad-cross" aria-hidden="true">✥</span><span class="touch-knob" aria-hidden="true"></span><span class="pad-label">WALK</span></div><button class="touch-interact" aria-label="Interact with nearby object" disabled><span aria-hidden="true">✦</span><b>Investigate</b></button>`;
    document.body.append(this.root);
    this.pad = this.root.querySelector('.touch-pad')!;
    this.knob = this.root.querySelector('.touch-knob')!;
    this.action = this.root.querySelector('.touch-interact')!;
    const detect = () => {
      document.documentElement.classList.toggle('touch-enabled', isTouchDevice());
      this.reset();
      this.render();
    };
    this.media.addEventListener('change', detect);
    detect();
    this.pad.addEventListener('pointerdown', e => {
      if (!this.active || this.pointer !== null) return;
      e.preventDefault();
      this.pointer = e.pointerId;
      this.pad.setPointerCapture(e.pointerId);
      this.move(e);
    });
    this.pad.addEventListener('pointermove', e => {
      if (e.pointerId === this.pointer) { e.preventDefault(); this.move(e); }
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      this.pad.addEventListener(event, e => {
        if ((e as PointerEvent).pointerId === this.pointer) this.reset();
      });
    }
    this.action.addEventListener('click', () => {
      if (this.active && this.targetAvailable) onInteract();
    });
    window.addEventListener('blur', () => this.reset());
    window.addEventListener('resize', () => this.reset());
    document.addEventListener('visibilitychange', () => this.reset());
  }

  setActive(active: boolean) {
    if (active !== this.active) this.reset();
    this.active = active;
    this.render();
  }

  setTarget(available: boolean, label = 'Investigate') {
    this.targetAvailable = available;
    this.action.disabled = !available;
    this.action.querySelector('b')!.textContent = label;
  }

  reset() {
    const pointer = this.pointer;
    this.pointer = null;
    this.axis.x = this.axis.y = 0;
    this.knob.style.transform = 'translate(-50%, -50%)';
    if (pointer !== null && this.pad.hasPointerCapture(pointer)) this.pad.releasePointerCapture(pointer);
  }

  private render() {
    this.root.hidden = !this.active || !isTouchDevice();
  }

  private move(e: PointerEvent) {
    const rect = this.pad.getBoundingClientRect();
    const radius = rect.width * .32;
    const dx = e.clientX - rect.left - rect.width / 2;
    const dy = e.clientY - rect.top - rect.height / 2;
    const distance = Math.hypot(dx, dy);
    const magnitude = Math.min(distance / radius, 1);
    const strength = magnitude < .16 ? 0 : (magnitude - .16) / .84;
    this.axis.x = distance ? dx / distance * strength : 0;
    this.axis.y = distance ? dy / distance * strength : 0;
    const scale = distance ? Math.min(distance, radius) / distance : 0;
    this.knob.style.transform = `translate(calc(-50% + ${dx * scale}px), calc(-50% + ${dy * scale}px))`;
  }
}

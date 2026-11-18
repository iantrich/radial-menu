export type GestureAction = 'tap' | 'hold' | 'double_tap';

export interface GestureOptions {
  hasDoubleTap: boolean;
  emit: (action: GestureAction) => void;
  holdMs?: number;
  doubleTapMs?: number;
}

/**
 * Pointer-gesture timing, free of DOM references. Hold fires from a timer once
 * the press lasts `holdMs`, so it does not depend on a later pointerup (touch
 * long-presses can end in pointercancel). With double tap enabled a lone tap
 * is delayed by `doubleTapMs` so a second tap can upgrade it to `double_tap`.
 */
export class Gesture {
  private readonly hasDoubleTap: boolean;
  private readonly emit: (action: GestureAction) => void;
  private readonly holdMs: number;
  private readonly doubleTapMs: number;
  private pressed = false;
  private holdTimer: ReturnType<typeof setTimeout> | undefined;
  private tapTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(opts: GestureOptions) {
    this.hasDoubleTap = opts.hasDoubleTap;
    this.emit = opts.emit;
    this.holdMs = opts.holdMs ?? 500;
    this.doubleTapMs = opts.doubleTapMs ?? 250;
  }

  down(): void {
    this.clearHoldTimer();
    this.pressed = true;
    this.holdTimer = setTimeout(() => {
      this.holdTimer = undefined;
      if (!this.pressed) return;
      // Consume the press: the release that follows must not become a tap.
      this.pressed = false;
      this.clearTapTimer();
      this.emit('hold');
    }, this.holdMs);
  }

  up(): void {
    if (!this.pressed) return;
    this.pressed = false;
    this.clearHoldTimer();
    if (!this.hasDoubleTap) {
      this.emit('tap');
      return;
    }
    if (this.tapTimer !== undefined) {
      this.clearTapTimer();
      this.emit('double_tap');
      return;
    }
    this.tapTimer = setTimeout(() => {
      this.tapTimer = undefined;
      this.emit('tap');
    }, this.doubleTapMs);
  }

  cancel(): void {
    this.pressed = false;
    this.clearHoldTimer();
  }

  dispose(): void {
    this.pressed = false;
    this.clearHoldTimer();
    this.clearTapTimer();
  }

  private clearHoldTimer(): void {
    if (this.holdTimer !== undefined) {
      clearTimeout(this.holdTimer);
      this.holdTimer = undefined;
    }
  }

  private clearTapTimer(): void {
    if (this.tapTimer !== undefined) {
      clearTimeout(this.tapTimer);
      this.tapTimer = undefined;
    }
  }
}

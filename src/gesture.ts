export type GestureAction = 'tap' | 'hold' | 'double_tap';

export interface GestureOptions {
  hasDoubleTap: boolean;
  emit: (action: GestureAction) => void;
  holdMs?: number;
  doubleTapMs?: number;
}

/**
 * Pointer-gesture timing, free of DOM references. Hold is decided on release
 * from the press duration; with double tap enabled a lone tap is delayed by
 * `doubleTapMs` so a second tap can upgrade it to `double_tap`.
 */
export class Gesture {
  private readonly hasDoubleTap: boolean;
  private readonly emit: (action: GestureAction) => void;
  private readonly holdMs: number;
  private readonly doubleTapMs: number;
  private pressedAt: number | undefined;
  private tapTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(opts: GestureOptions) {
    this.hasDoubleTap = opts.hasDoubleTap;
    this.emit = opts.emit;
    this.holdMs = opts.holdMs ?? 500;
    this.doubleTapMs = opts.doubleTapMs ?? 250;
  }

  down(): void {
    this.pressedAt = Date.now();
  }

  up(): void {
    if (this.pressedAt === undefined) return;
    const heldFor = Date.now() - this.pressedAt;
    this.pressedAt = undefined;

    if (heldFor >= this.holdMs) {
      this.clearTapTimer();
      this.emit('hold');
      return;
    }
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
    this.pressedAt = undefined;
  }

  dispose(): void {
    this.pressedAt = undefined;
    this.clearTapTimer();
  }

  private clearTapTimer(): void {
    if (this.tapTimer !== undefined) {
      clearTimeout(this.tapTimer);
      this.tapTimer = undefined;
    }
  }
}

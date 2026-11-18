import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Gesture } from '../src/gesture';

type Action = 'tap' | 'hold' | 'double_tap';

describe('Gesture', () => {
  let emit: ReturnType<typeof vi.fn<(a: Action) => void>>;

  beforeEach(() => {
    vi.useFakeTimers();
    emit = vi.fn();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits tap immediately on a quick press without double tap', () => {
    const g = new Gesture({ hasDoubleTap: false, emit });
    g.down();
    vi.advanceTimersByTime(50);
    g.up();
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('tap');
  });

  it('emits only hold when the press lasts at least holdMs', () => {
    const g = new Gesture({ hasDoubleTap: false, emit });
    g.down();
    vi.advanceTimersByTime(600);
    expect(emit).not.toHaveBeenCalled();
    g.up();
    expect(emit.mock.calls).toEqual([['hold']]);
  });

  it('treats a press of exactly holdMs as a hold, and honors custom holdMs', () => {
    const g = new Gesture({ hasDoubleTap: false, emit, holdMs: 300 });
    g.down();
    vi.advanceTimersByTime(300);
    g.up();
    expect(emit.mock.calls).toEqual([['hold']]);
  });

  it('delays tap by doubleTapMs when hasDoubleTap', () => {
    const g = new Gesture({ hasDoubleTap: true, emit });
    g.down();
    g.up();
    vi.advanceTimersByTime(249);
    expect(emit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(emit.mock.calls).toEqual([['tap']]);
  });

  it('emits only double_tap for two taps inside the window', () => {
    const g = new Gesture({ hasDoubleTap: true, emit });
    g.down();
    g.up();
    vi.advanceTimersByTime(100);
    g.down();
    g.up();
    vi.advanceTimersByTime(1000);
    expect(emit.mock.calls).toEqual([['double_tap']]);
  });

  it('starts a fresh sequence after a double tap', () => {
    const g = new Gesture({ hasDoubleTap: true, emit });
    g.down();
    g.up();
    g.down();
    g.up();
    g.down();
    g.up();
    vi.advanceTimersByTime(250);
    expect(emit.mock.calls).toEqual([['double_tap'], ['tap']]);
  });

  it('emits hold (not tap) for a long press with hasDoubleTap', () => {
    const g = new Gesture({ hasDoubleTap: true, emit });
    g.down();
    vi.advanceTimersByTime(600);
    g.up();
    vi.advanceTimersByTime(1000);
    expect(emit.mock.calls).toEqual([['hold']]);
  });

  it('cancel after down emits nothing and clears state', () => {
    const g = new Gesture({ hasDoubleTap: false, emit });
    g.down();
    vi.advanceTimersByTime(600);
    g.cancel();
    g.up();
    expect(emit).not.toHaveBeenCalled();
  });

  it('up() without a matching down() emits nothing', () => {
    const g = new Gesture({ hasDoubleTap: false, emit });
    g.up();
    vi.advanceTimersByTime(1000);
    const dt = new Gesture({ hasDoubleTap: true, emit });
    dt.up();
    vi.advanceTimersByTime(1000);
    expect(emit).not.toHaveBeenCalled();
  });

  it('dispose during a held press then up() emits nothing', () => {
    const g = new Gesture({ hasDoubleTap: false, emit });
    g.down();
    vi.advanceTimersByTime(600);
    g.dispose();
    g.up();
    expect(emit).not.toHaveBeenCalled();
  });

  it('dispose clears a pending tap', () => {
    const g = new Gesture({ hasDoubleTap: true, emit });
    g.down();
    g.up();
    g.dispose();
    vi.advanceTimersByTime(1000);
    expect(emit).not.toHaveBeenCalled();
  });
});

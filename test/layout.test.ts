import { describe, it, expect } from 'vitest';
import { itemPosition } from '../src/layout';

const defaults = { offset: 35, startAngle: 0, arc: 360 };

describe('itemPosition', () => {
  it('reproduces the 1.6.0 formula with defaults for count 1..12', () => {
    const off = 35;
    for (let count = 1; count <= 12; count++) {
      for (let i = 0; i < count; i++) {
        const left = (50 - off * Math.cos(-0.5 * Math.PI - 2 * (1 / count) * i * Math.PI)).toFixed(4) + '%';
        const top = (50 + off * Math.sin(-0.5 * Math.PI - 2 * (1 / count) * i * Math.PI)).toFixed(4) + '%';
        expect(itemPosition(i, count, defaults), `count ${count} index ${i}`).toEqual({ left, top });
      }
    }
  });

  it('puts item 0 directly above center at startAngle 0', () => {
    expect(itemPosition(0, 4, defaults)).toEqual({ left: '50.0000%', top: '15.0000%' });
  });

  it('puts item 0 at the right for startAngle 90', () => {
    expect(itemPosition(0, 4, { ...defaults, startAngle: 90 }).left).toBe('85.0000%');
  });

  it('places first and last items on the arc ends when arc < 360', () => {
    const opts = { ...defaults, arc: 180 };
    expect(itemPosition(0, 3, opts)).toEqual({ left: '50.0000%', top: '15.0000%' });
    expect(itemPosition(2, 3, opts)).toEqual({ left: '50.0000%', top: '85.0000%' });
    expect(itemPosition(2, 3, { ...opts, startAngle: 30 })).toEqual(
      itemPosition(0, 3, { ...opts, startAngle: 210 }),
    );
  });

  it('puts a single item at startAngle when arc < 360', () => {
    expect(itemPosition(0, 1, { ...defaults, arc: 180, startAngle: 90 })).toEqual({
      left: '85.0000%',
      top: '50.0000%',
    });
  });

  it('handles negative and over-360 startAngle', () => {
    const right = itemPosition(0, 4, { ...defaults, startAngle: 90 });
    expect(itemPosition(0, 4, { ...defaults, startAngle: -270 })).toEqual(right);
    expect(itemPosition(0, 4, { ...defaults, startAngle: 450 })).toEqual(right);
  });
});

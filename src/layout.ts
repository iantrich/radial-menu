export interface LayoutOptions {
  /** Radius as a percentage of the box. */
  offset: number;
  /** Degrees clockwise from 12 o'clock for the first item. */
  startAngle: number;
  /** Total degrees the items span. */
  arc: number;
}

/** Position of item `index` (of `count`) as percent strings anchored to the box center. */
export function itemPosition(
  index: number,
  count: number,
  { offset, startAngle, arc }: LayoutOptions,
): { left: string; top: string } {
  const step = arc === 360 ? 360 / count : count > 1 ? arc / (count - 1) : 0;
  const radians = ((startAngle + index * step) * Math.PI) / 180;
  return {
    left: (50 + offset * Math.sin(radians)).toFixed(4) + '%',
    top: (50 - offset * Math.cos(radians)).toFixed(4) + '%',
  };
}

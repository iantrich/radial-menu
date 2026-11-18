import { describe, expect, it } from 'vitest';
import { CARD_VERSION } from '../src/const';

describe('smoke', () => {
  it('exposes the 2.0.0 card version', () => {
    expect(CARD_VERSION).toBe('2.0.0');
  });
});

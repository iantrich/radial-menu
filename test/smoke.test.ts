import { describe, expect, it } from 'vitest';
import pkg from '../package.json';
import { CARD_VERSION } from '../src/const';

describe('smoke', () => {
  it("uses package.json's version as the card version", () => {
    expect(CARD_VERSION).toBe(pkg.version);
    expect(CARD_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});

import { version } from '../package.json';

/** The card version is package.json's version, so a release only has to bump that one file. */
export const CARD_VERSION: string = version;

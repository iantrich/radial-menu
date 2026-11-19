# Radial Menu 2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the `radial-menu` Lovelace element on current tooling, fixing the open issues and adding the approved features without breaking 1.6.0 configs.

**Architecture:** One Lit 3 element (`radial-menu`) with reactive `open` state. Pure modules hold the testable logic: layout math, config normalization, and a timing-only gesture class. The element wires pointer events to the gesture class and calls `custom-card-helpers` `handleAction`. A separate `radial-menu-editor` element provides the visual editor on `ha-form`.

**Tech Stack:** TypeScript 5 (strict), Lit 3, Vite library build, Vitest + happy-dom, ESLint 9 (flat config), Prettier 3, `custom-card-helpers` ^2.2.1.

**Spec:** `docs/superpowers/specs/2026-11-17-radial-menu-rewrite-design.md`

## Global Constraints

- Element name `radial-menu`; release asset is the single file `dist/radial-menu.js`, loaded as `type: module`.
- Every 1.6.0 config renders and behaves the same, except two approved changes: embedded `card:` items are centered on their position point (1.6.0 offset dropped), and `close_on_outside_click` defaults to `true` for all configs, no exemptions.
- 1.6.0 defaults: `icon: mdi:menu`, `name: menu`, `tap_action: {action: toggle-menu}`, `hold_action: {action: none}`, `double_tap_action: {action: none}`, `default_dismiss: true`, `items_offset: 35`. Missing `items` throws `Invalid configuration: No items defined`; missing config throws `Invalid configuration`.
- New options and defaults: `size` (CSS length, `250px`), `start_angle` (`0`, degrees clockwise from 12 o'clock), `arc` (`360`), per-item `color`, `close_on_outside_click` (`true`).
- Theme variables kept: `--radial-icon-size`, `--radial-menu-button-color`, `--radial-menu-item-color`. Added: `--radial-menu-item-hover-color` (fallback `--accent-color`), `--radial-menu-item-hover-background` (fallback `--secondary-background-color`), `--radial-menu-transition` (`0.4s ease-out`).
- No `mwc-ripple`. Keep `state-badge` for `entity_picture` (fed `{attributes:{entity_picture}, entity_id:'sensor.fake'}` as in 1.6.0). Keep `ha-icon` for mdi icons.
- No keyboard or screen-reader work. No new action types, no nested menus.
- Version `2.0.0`; `hacs.json` `homeassistant` minimum `2024.1.0`.

## Review Focus

1. A single item (`n = 1`) with `arc < 360`: spacing is `arc / (n - 1)`, a divide by zero. Expect the item at `start_angle`.
2. `items: []` or an `items` entry that is `null`/not an object: expect no crash; empty menu renders only the button; invalid entries are skipped.
3. `hass` arriving after `setConfig`, and `setConfig` called repeatedly (the editor does this): expect `default_open` to open once, and later `setConfig` calls not to re-close a menu the user opened.
4. Element removed from the DOM while open: expect the outside-click document listener removed (no leak, no calls on a detached element).
5. Long press on an item with no `hold_action`: 1.6.0 sends a `hold` event that `handleAction` resolves to its default; expect that identical path, not a tap.

---

### Task 1: Tooling and build scaffold

**Files:**
- Modify: `package.json`, `tsconfig.json`, `.gitignore`
- Create: `vite.config.ts`, `eslint.config.js`, `.prettierrc.json`, `test/smoke.test.ts`
- Delete: `rollup.config.js`, `rollup.config.dev.js`, `.eslintrc.js`, `.prettierrc.js`, `src/action-handler-directive.ts`

**Interfaces:**
- Produces: npm scripts `build` (writes `dist/radial-menu.js`), `test` (`vitest run`), `lint`, `start` (Vite dev/watch build). `src/const.ts` exports `CARD_VERSION = '2.0.0'`.

- [ ] **Step 1: Replace dependencies** in `package.json`: runtime `lit`, `custom-card-helpers`; dev `typescript`, `vite`, `vitest`, `happy-dom`, `eslint`, `typescript-eslint`, `prettier`. Remove `lit-element`, `lit-html`, `home-assistant-js-websocket`, Babel and all `rollup-*` packages. Set `"version": "2.0.0"`, `"type": "module"`.
- [ ] **Step 2: Write `test/smoke.test.ts`** asserting `CARD_VERSION === '2.0.0'` imported from `../src/const`. Run `npx vitest run`; expected FAIL (version is `1.6.0`).
- [ ] **Step 3: Configure** `vite.config.ts` for library mode: entry `src/radial-menu.ts`, `formats: ['es']`, `fileName: () => 'radial-menu.js'`, no externals, minified; Vitest `environment: 'happy-dom'`. `tsconfig.json`: `target ES2022`, `strict`, `experimentalDecorators: true`, `useDefineForClassFields: false` (needed for Lit decorators). Delete the files listed above; update `src/const.ts`.
- [ ] **Step 4: Verify.** `npx vitest run` passes; `npm run lint` is clean; `npm run build` creates `dist/radial-menu.js` (build may be run once the element exists in Task 5; until then run it against a stub export and expect success).
- [ ] **Step 5: Commit** `chore: modern toolchain (Vite, Vitest, Lit 3, TS 5)`.

### Task 2: Types and config normalization

**Files:**
- Modify: `src/types.ts`
- Create: `src/config.ts`, `test/config.test.ts`

**Interfaces:**
- Produces: `RadialMenuConfig` (1.6.0 fields plus `size?: string`, `start_angle?: number`, `arc?: number`, `close_on_outside_click?: boolean`), `RadialMenuItemConfig` (1.6.0 fields plus `color?: string`; the cached `element` field is removed from the type). `normalizeConfig(config: unknown): ResolvedConfig` where `ResolvedConfig` is `RadialMenuConfig` with all defaults from Global Constraints filled in and `items` filtered to plain objects.

- [ ] **Step 1: Write failing tests** in `test/config.test.ts`: `normalizeConfig(undefined)` throws `'Invalid configuration'`; `normalizeConfig({type:'x'})` throws `'Invalid configuration: No items defined'`; `{items:[]}` yields the 1.6.0 defaults plus `size:'250px'`, `start_angle:0`, `arc:360`, `close_on_outside_click:true`; user values override defaults; `items:[null, 3, {icon:'mdi:a'}]` yields one item; an input object is not mutated.
- [ ] **Step 2:** Run `npx vitest run test/config.test.ts`; expect FAIL (module missing).
- [ ] **Step 3: Implement** `normalizeConfig` in `src/config.ts` as a pure function returning a new object.
- [ ] **Step 4:** Run tests; expect PASS.
- [ ] **Step 5: Commit** `feat: config normalization with 1.6.0 defaults`.

### Task 3: Layout math

**Files:**
- Create: `src/layout.ts`, `test/layout.test.ts`

**Interfaces:**
- Produces: `itemPosition(index: number, count: number, opts: { offset: number; startAngle: number; arc: number }): { left: string; top: string }`. Values are percent strings with 4 decimals (e.g. `'50.0000%'`), anchored to the box center.

- [ ] **Step 1: Write failing tests.** Golden test: for `count` 1..12 and every index, with defaults (`offset 35, startAngle 0, arc 360`), `itemPosition` equals the 1.6.0 formula written inline in the test: `left = (50 - off*cos(-0.5π - 2*(1/count)*i*π)).toFixed(4)+'%'`, `top = (50 + off*sin(-0.5π - 2*(1/count)*i*π)).toFixed(4)+'%'`. Further tests: item 0 at `startAngle 0` is directly above center (`left '50.0000%'`, `top '15.0000%'`); `startAngle: 90` puts item 0 at the right (`left '85.0000%'`); `arc: 180, count: 3` puts item 0 at `startAngle` and item 2 at `startAngle + 180`; `arc: 180, count: 1` returns the `startAngle` position (no NaN); negative and over-360 `startAngle` work.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3: Implement** `itemPosition`. Angle for item `i` is `startAngle + i * step` degrees clockwise from the top, with `step = arc === 360 ? 360 / count : count > 1 ? arc / (count - 1) : 0`; `left = 50 + offset*sin(a)`, `top = 50 - offset*cos(a)`.
- [ ] **Step 4:** Run; expect PASS.
- [ ] **Step 5: Commit** `feat: layout math with start_angle and arc`.

### Task 4: Gesture timing

**Files:**
- Create: `src/gesture.ts`, `test/gesture.test.ts`

**Interfaces:**
- Produces: `class Gesture` with `constructor(opts: { hasDoubleTap: boolean; emit: (action: 'tap' | 'hold' | 'double_tap') => void; holdMs?: number /* 500 */; doubleTapMs?: number /* 250 */ })`, `down(): void`, `up(): void`, `cancel(): void`, `dispose(): void`. Mirrors 1.6.0: hold is decided on release (press lasted at least `holdMs`, regardless of whether a hold action is configured); with `hasDoubleTap`, a lone tap emits after `doubleTapMs` and a second tap inside that window emits `double_tap` instead; otherwise tap emits immediately.

- [ ] **Step 1: Write failing tests** with Vitest fake timers: quick down/up emits `tap` once and immediately; down, 600 ms, up emits only `hold`; with `hasDoubleTap`, down/up emits nothing until 250 ms then `tap`; two down/up pairs within 250 ms emit only `double_tap`; `cancel()` after `down()` emits nothing; `dispose()` clears a pending tap.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3: Implement** `Gesture` using `setTimeout`/`clearTimeout`; keep it free of DOM references.
- [ ] **Step 4:** Run; expect PASS.
- [ ] **Step 5: Commit** `feat: pointer-gesture timing (tap, hold, double tap)`.

### Task 5: The element

**Files:**
- Create: `src/radial-menu.ts` (replace entirely), `src/styles.ts`, `test/element.test.ts`

**Interfaces:**
- Consumes: `normalizeConfig`, `itemPosition`, `Gesture`; from `custom-card-helpers`: `handleAction`, `hasAction`, `applyThemesOnElement`.
- Produces: custom element `radial-menu` with `setConfig(config)`, `getCardSize(): number` (returns `1`), `hass` property, `@state() open: boolean`, static `getConfigElement()` returning `document.createElement('radial-menu-editor')` and static `getStubConfig(): RadialMenuConfig` (Task 6 supplies the editor element), and `window.customCards` registration with name `Radial Menu`.

- [ ] **Step 1: Write failing tests** in `test/element.test.ts` (create the element via `document.createElement`, stub `window.loadCardHelpers` and `ha-icon`/`state-badge` as plain elements): (a) with `default_open: true`, `setConfig` then later assigning `hass` leaves `open === true` and the `.circle` has class `open` (issue #26); (b) item icons render when `hass` is unset; (c) a `card:` item calls `createCardElement` once across several `hass` assignments and the element receives each new `hass`; changing that item's `card` config via `setConfig` creates a new element; (d) tapping an item calls `handleAction` with that item's config and, with `default_dismiss` true, closes the menu; tapping the menu button with default `toggle-menu` toggles `open` and does not call `handleAction`; (e) `close_on_outside_click` default: a `pointerdown` on `document.body` closes an open menu, a `pointerdown` inside the element does not, and `close_on_outside_click: false` ignores it; (f) removing the element from the DOM removes the document listener; (g) `size: '100%'` sets `--radial-size: 100%` on the box; (h) per-item `color` sets that item's color; (i) `setConfig` called twice does not close an already-open menu; (j) `items` with a single entry and `arc: 90` renders without error.
- [ ] **Step 2:** Run `npx vitest run test/element.test.ts`; expect FAIL.
- [ ] **Step 3: Implement** the element. Rules: `open` is initialized from `default_open` inside `setConfig` only the first time a config arrives; the render never waits on `hass` or helpers except for `card:` items, which are created lazily in a cache keyed by item index with the item's `card` object identity; the document `pointerdown` listener is added in `connectedCallback` and removed in `disconnectedCallback`, and ignores events whose `composedPath()` includes the element; item wrapper positions come from `itemPosition` as inline `left`/`top`; embedded `card:` wrappers are centered on that point (margin of half their size, no 1.6.0 offset); the menu button and items keep the 1.6.0 elements (`ha-icon`, `state-badge`) and sizes; actions go `pointerdown`/`pointerup`/`pointercancel` → `Gesture` → `handleAction(this, hass, config, action)`; `contextmenu` is prevented on interactive items as in 1.6.0; `applyThemesOnElement` on theme change as in 1.6.0. Styles in `src/styles.ts` use the theme variables from Global Constraints and an `:active` opacity change in place of the ripple.
- [ ] **Step 4:** Run the full suite and `npm run build`; expect all PASS and `dist/radial-menu.js` produced.
- [ ] **Step 5: Commit** `feat: rewrite radial-menu element (reactive open state, sizing, outside click)`.

### Task 6: Visual editor

**Files:**
- Create: `src/editor.ts`, `test/editor.test.ts`

**Interfaces:**
- Consumes: `RadialMenuConfig`, `RadialMenuItemConfig`.
- Produces: custom element `radial-menu-editor` with `setConfig(config)`, `hass` property; it fires HA's `config-changed` event (`detail: { config }`) with the full updated config.

- [ ] **Step 1: Write failing tests:** changing a top-level field (e.g. `name`) fires `config-changed` whose config keeps every other key, including unknown ones such as `theme` and `foo`; adding an item appends `{ icon: 'mdi:...' }`-shaped default; removing and reordering items produce the expected `items` array; an item with `card:` is shown as read-only ("edit in YAML") and is returned byte-for-byte unchanged after other items are edited.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3: Implement** using `ha-form` with schemas for top-level options (`name`, `icon`, `entity_picture`, `entity`, `default_open`, `default_dismiss`, `close_on_outside_click`, `items_offset`, `size`, `start_angle`, `arc`, `tap_action`/`hold_action`/`double_tap_action` via the `ui_action` selector) and, per item, `icon`, `entity_picture`, `name`, `entity`, `color`, and the three actions. Merge changes into a copy of the incoming config rather than rebuilding from the schema.
- [ ] **Step 4:** Run; expect PASS; manually load the built file in the devcontainer HA (`.devcontainer`) and open the card editor once.
- [ ] **Step 5: Commit** `feat: visual editor`.

### Task 7: CI, HACS metadata, and docs

**Files:**
- Modify: `.github/workflows/build.yml`, `.github/workflows/release.yml`, `hacs.json`, `README.md`, `.devcontainer/ui-lovelace.yaml`

**Interfaces:** none (leaf task).

- [ ] **Step 1:** Update workflows: Node 20, `actions/checkout@v4`, `actions/setup-node@v4`, `npm ci`; build workflow runs `npm run lint`, `npm test`, `npm run build`; release workflow keeps uploading `dist/radial-menu.js` as asset `radial-menu.js` (use `softprops/action-gh-release@v2` or the maintained equivalent).
- [ ] **Step 2:** Set `hacs.json` `homeassistant` to `2024.1.0`.
- [ ] **Step 3: Rewrite the README:** fix the usage example (remove the stray `-card` typo from #27), document `size` (including `100%` for responsive use, #15), `start_angle`, `arc`, per-item `color`, `close_on_outside_click` (default on) and all theme variables with a `card_mod`-free theming example (#23, #27), a "Upgrading to 2.0" section stating the two behavior changes and the `close_on_outside_click: false` opt-out, and a visual editor note.
- [ ] **Step 4:** Add a 2.0 demo menu to `.devcontainer/ui-lovelace.yaml` exercising `arc`, `color` and a `card:` item.
- [ ] **Step 5: Verify:** `npm ci && npm run lint && npm test && npm run build` all succeed from a clean checkout.
- [ ] **Step 6: Commit** `chore: CI, HACS metadata, docs for 2.0`.

## Self-review notes

- Spec coverage: goals 1-5, every listed theme variable, editor, tests, CI, and release are covered by Tasks 1-7. Issues: #26 (Task 5a), #24 (mwc removal, Task 1 and 5), #15 (`size`, Task 5g), #23 (theme variables, Task 5/7), #27 (README, Task 7).
- Decision for the owner to check during first testing: centered `card:` items.

# Radial Menu 2.0: rewrite design

Status: draft for approval. Date: 2026-11-17.

## Intent and why

`radial-menu` is a Home Assistant Lovelace custom element (distributed through
HACS) that shows a circular popout menu of actions. It is maintained for other
HACS users, and the owner expects to use it again too. It has not been touched
since 2022 and now fails in current HA (open issues #15, #23, #24, #26, #27).

Goal: a clean rewrite on current tooling that fixes the open issues, adds the
requested features, and **never breaks an existing config**.

## Goals

1. Every config valid under 1.6.0 renders and behaves the same under 2.0,
   except the two owner-approved changes below (centered `card:` items;
   outside-click close on by default) (same element name `radial-menu`, same option names, same defaults, same
   item positions, same action semantics including `haptic`).
2. Fix the open issues:
   - #26 `default_open: true` ignored when hass/helpers arrive after first
     render (panel views).
   - #24 card not showing on current HA (dead `mwc-ripple` dependency).
   - #15 menu does not scale with its parent (fixed 250px).
   - #23 colors not customizable.
   - #27 README example wrong; theming undocumented.
3. Drop `mwc-ripple`. Keep `custom-card-helpers` (still maintained, v2.2.1).
4. New features (all opt-in except `close_on_outside_click`, see below):
   - `size`, `start_angle`, `arc` layout options
   - per-item `color`
   - `close_on_outside_click` (owner decision: **on by default**, the one
     deliberate exception to the no-behavior-change rule; see Interaction)
   - more theme variables
   - a visual editor
5. Tests for the parts that can regress silently.

## Non-goals

- Keyboard navigation and screen-reader support (owner: overkill).
- New action types, nested/multi-level menus, templating.
- Supporting HA older than the version set in `hacs.json`.

## Anti-goals

- A config that worked in 1.6.0 silently changing appearance or behavior.
- Large bundle growth; the card should stay a single small file.

## Constraints

- Release asset must remain a single file named `radial-menu.js` (HACS and the
  release workflow depend on it); users load it as `type: module`.
- Embedded `card:` items must keep working (they are created through HA's
  `loadCardHelpers().createCardElement`).
- `custom-card-helpers` supplies `handleAction`, `hasAction`,
  `applyThemesOnElement`, so action behavior (incl. default `more-info`) stays
  identical to 1.6.0.

## Approaches considered

- **A. Modernize in place, two phases.** Lowest regression risk; keeps current
  structure. Recommended by me.
- **B. Rewrite from scratch (chosen by owner).** Cleanest architecture; the
  risk is subtle config regressions, which this design controls with the
  compatibility rules and tests below.
- **C. Fixes only.** Fast and safe, but no new features.

Owner picked **B** knowing the regression trade-off.

## Design

### Architecture

- Lit 3 (`lit` package, replaces `lit-element`/`lit-html`), TypeScript 5,
  strict. Remove unused `home-assistant-js-websocket` and Babel.
- Build: Vite library mode (ES module, everything bundled, minified) producing
  `dist/radial-menu.js`. Tests: Vitest with happy-dom. ESLint 9 flat config and
  Prettier 3. (My call: builder may substitute equivalents.)
- Files: `radial-menu.ts` (element), `layout.ts` (pure position math),
  `action-controller.ts` (pointer-event tap/hold/double-tap), `config.ts`
  (normalize/validate), `editor.ts` (visual editor), `styles.ts`, `types.ts`.

### State and rendering (fixes #26)

- `open` is a reactive property, initialized from `default_open` when the
  config is set. It does not depend on `hass` or card helpers being ready.
- Icons and pictures render without `hass`. Only embedded `card:` items wait on
  helpers.
- Embedded card elements are created once per item config (cached by item
  index plus config identity), re-created only when that item's `card` config
  changes, and receive `hass` updates by property assignment. They are not
  rebuilt on every render.

### Layout and sizing (fixes #15)

- Menu box is `aspect-ratio: 1` with `width: var(--radial-size)`; `size`
  (CSS length, default `250px`) sets it, so `size: 100%` makes it fill its
  parent. Item and button sizes stay fixed (icon size theme var as today).
- Position math lives in `layout.ts`. With defaults it must reproduce 1.6.0
  exactly: first item at 12 o'clock, clockwise, radius `items_offset`
  percent (default 35) of the box.
- `start_angle` (degrees, default 0 = top, clockwise) and `arc` (degrees,
  default 360). For `arc` below 360 items are spread so the first and last sit
  on the arc ends (spacing `arc / (n - 1)`); at 360, spacing is `360 / n`. (My
  call.)
- Embedded `card:` items drop the 1.6.0 wrapper quirk (100x100 box with
  margins of -40px/-25px, which put the card center 10px right and 25px below
  its position point). They are centered on the position point like icons.
  (Owner decision: this is a deliberate visual change for `card:` items;
  evaluate it in the first round of testing and adjust if it looks wrong.)

### Interaction

- Own action controller on pointer events: tap, hold (500 ms), double-tap
  (only waits for a second tap when `double_tap_action` is configured, as
  today). Emits the same actions into `handleAction`. CSS `:active` state
  replaces the ripple.
- `entity_picture` items/button keep using HA's `state-badge` as in 1.6.0
  (owner decision). Note 1.6.0 only feeds it a fake entity carrying the picture
  URL; item `entity` is used only as an action target, never displayed.
- `default_dismiss` unchanged. New `close_on_outside_click` closes the menu on
  a pointer-down anywhere outside it. **Default `true` for all configs, no
  exemptions** (owner decision). This changes behavior for existing configs,
  for example a menu with `default_open: true` that is meant to stay open will
  now close on an outside click. The 2.0.0 release notes must call this out
  and show `close_on_outside_click: false` as the opt-out.

### Styling (fixes #23)

Existing variables kept: `--radial-icon-size`, `--radial-menu-button-color`,
`--radial-menu-item-color`. Added (all falling back to today's values):
`--radial-menu-item-hover-color` (accent-color),
`--radial-menu-item-hover-background` (secondary-background-color),
`--radial-menu-transition` (`0.4s ease-out`). Per-item `color` overrides the
item color. The README documents all of this and shows how to use
`card_mod`-style overrides.

### Visual editor

`getConfigElement()` and `getStubConfig()` provide an editor built on HA's
`ha-form`. It covers top-level options and a reorderable item list (icon,
picture, name, entity, color, and the three actions via HA's action selector).
Items using `card:` show a "edit in YAML" note and are preserved untouched. The
editor must never drop unknown keys from the config.

### Compatibility and tests

- Config normalization keeps 1.6.0 defaults (`icon: mdi:menu`, `name: menu`,
  `tap_action: toggle-menu`, `default_dismiss: true`, `items_offset: 35`).
  Missing `items` still throws the same error.
- Tests: a golden test comparing `layout.ts` output with the 1.6.0 formula for
  n = 1..12 at defaults; config-normalization tests; action-controller timing
  tests (tap vs hold vs double); a render test that `default_open` opens even
  when `hass` is set later; editor round-trip preserves unknown keys.
- CI: Node 20, current `actions/*`, run lint + test + build on PRs; release
  workflow keeps uploading `dist/radial-menu.js` as `radial-menu.js`.

### Release

Version 2.0.0 (a rewrite, and the minimum HA version moves up; no config
breaks). `hacs.json` minimum HA set to 2024.1.0 (my call; builder should
confirm it against what is actually tested). README rewritten with a correct
example and the new options.

## Left to the builder

Exact CSS, editor schema details, tooling versions, test file layout, and
README wording, within the rules above.

## Calls I made (please check)

1. Vite + Vitest instead of staying on Rollup.
2. `arc` below 360 puts first and last items on the arc ends.
3. (Changed by owner) Drop the 1.6.0 geometry quirk for embedded `card:`
   items; center them and review in first testing.
4. (Changed by owner) Keep `state-badge` for pictures.
5. Version 2.0.0; minimum HA 2024.1.0.
6. (Changed by owner) `close_on_outside_click` defaults to **on** for every
   config, no exemption.

# web_lic - Claude Code Instructions

Web Lic is a browser-based LEGO instruction book builder. Users load an LDraw `.ldr`/`.mpd` model, and the app auto-generates paginated step-by-step assembly instructions with a WYSIWYG editor.

## Commands

```bash
npm run typecheck   # vue-tsc -b (project references, both tsconfig.app.json + tsconfig.node.json)
npm run lint        # eslint --max-warnings 0 && html-validate src/**/*.vue
npm run start       # vite dev server at localhost:8080
npm run build       # tsc -b && lint && vite build
npm run test        # cypress open
```

**Always run `npm run typecheck` and `npm run lint` after any code change before reporting done.**

## Architecture

### State / Store
- `src/store.ts` - top-level store object with `state`, `get`, `mutations`, `render`
- `src/store/getters.ts` - all read-only accessors
- `src/store/mutations.ts` - top-level `Mutations` object, assembles all setter modules
- `src/store/*_setters.ts` - one file per item type (page, step, part, pli, book, etc.)
- Setter interfaces are being migrated to `typeof MutationObject` pattern (avoid separate interface + implementation)
- `src/undo_stack.ts` - undo/redo via `fast-json-patch` JSON diffs

### UI
- `src/ui.vue` - root component, wires everything together
- `src/components/nav_tree_container.vue` + `src/navtree.ts` - left-side tree, manually rendered DOM (not Vue)
- `src/components/page_view.vue` - center canvas area
- `src/components/controlPanels/` - right-side property editors (one per item type)
- `src/dialogs/` - modal dialogs (import, export, color picker, etc.)
- `src/menu.ts` - top menu bar actions
- `src/context_menu.ts` - right-click context menus (large file, ~1600 lines)

### Rendering
- `src/webgl/` - WebGL rendering via twgl.js + custom GLSL shaders
- `src/ld_render.ts` - LDraw part rendering
- `src/ld_parse.js` - LDraw file parser (being converted to TS; has `// @ts-nocheck` at top during migration)
- `src/draw.ts` - 2D canvas drawing (page layout, annotations)
- `src/layout.ts` - page layout engine (step merging, pagination)

### Other
- `src/translations.ts` - i18n (English default, French/German available)
- `src/item_types.ts` - all TypeScript types for store items (Page, Step, Part, PLI, etc.)
- `src/util.ts` - shared utilities; re-exports lodash functions (import lodash only here via `lodash/functionName`)
- `src/event_bus.ts` - mitt-based event bus
- `src/file_ops.ts` - open/import/save file operations
- `src/export.ts` - PDF and PNG export

## Layout & Coordinate System

- All item positions (`x`, `y`, `width`, `height`) are in **page-local pixels**, 1:1 with canvas pixels. No DPI scaling.
- The canvas is always sized to `store.state.template.page.width` × `store.state.template.page.height`.
- Origin is top-left of the page canvas. `draw.ts` calls `ctx.clearRect(0, 0, template.width, template.height)` on each redraw.
- `page.innerContentOffset` is a `ctx.translate()` applied before drawing steps - step `x`/`y` coords are relative to this offset, not the page origin.
- `store.get.targetBox(item)` - returns the click-target bounding box in page coordinates.
- `store.get.highlightBox(item, size, page)` - returns the selection-highlight bounding box.
- `store.get.pageCount()` returns `pages.length - 1` - it deliberately excludes the template page (always `pages[0]`).
- `store.get.firstPage()` returns `pages[1]` - skips the template page.
- `store.get.templatePage()` returns `pages[0]` - or `undefined` if not yet initialized.

## Template Page Initialization

The template page is always present, even with no model loaded. Three things must happen in order:

```ts
await LDParse.loadLDConfig();              // loads color table; without this, all parts are black
await store.mutations.templatePage.add();  // creates pages[0]
LDRender.setModel(store.state.template.modelData.model);  // initializes WebGL canvas
```

`file_ops.ts:ensureTemplatePage()` handles this. It is called on startup (no saved model) and before every model import. `closeModelAndReturnToStart()` in `file_ops.ts` also calls it after clearing state.

## Vue Reactivity Pitfalls

- **`store.model` is NOT reactive** - it is a plain JS property. Never read it directly in a Vue template or computed to drive conditional rendering. Use `filename.value != null` as a reactive proxy instead (`filename` is a ref in `ui_reactive_state.ts` that is set/cleared alongside `store.model`).
- Use `shallowRef` (not `ref`) for Vue component objects stored in reactive state - `ref` tries to deeply track components and emits a warning.
- Canvas 2D contexts used for repeated `getImageData` calls must be created with `{ willReadFrequently: true }` and cached at module level (see `ld_render.ts`).
- `forceUIUpdate()` emits `'force-update'` on the EventBus - this triggers nav tree and page view redraws but does NOT cause `ui.vue` to re-render. To force a `ui.vue` re-render, mutate a reactive ref like `currentPageId`.

## CSS

- **Single source of truth**: all global CSS lives in `src/styles/global.css`, imported via `src/app.ts`. There is no `static/style.css` anymore.
- **Load order**: Bootstrap `<link>` in `index.html` → Vite-injected CSS (from `global.css` import). Bootstrap overrides work because Vite CSS always injects after static `<link>` tags.
- Always use native CSS nesting. For pseudo-classes and modifier classes (`&:hover`, `&.active`, `&:checked`), use `&`. For simple descendant and child selectors, write them directly without `&`.
- Component-scoped styles go in `<style>` blocks within Vue SFCs; only truly global rules belong in `global.css`.

## Code Style

### TypeScript
- `strict: true` plus `noImplicitReturns` in `tsconfig.app.json`
- Avoid `!` non-null assertions - prefer type narrowing or early returns
- No TypeScript syntax in Vue `<template>` expressions (casts, generics) - move them into `<script setup>` functions
- Store setter interfaces: use `export type XMutationInterface = typeof XMutations` instead of a hand-written duplicate interface

### Vue
- Vue 3 Composition API (`<script setup lang="ts">`) throughout
- Use `<template #slotName>` syntax (not deprecated `slot="slotName"`)
- For purely visual selection UIs (pickers, grids), use plain `<div>` with click handlers + CSS `.selected` class rather than `<input type="radio">`
- Preserve commented-out code blocks - never delete them silently

### General
- No extra comments explaining what code does - only add comments for non-obvious WHY
- No `as const` on rule objects that will be passed to typed APIs (causes readonly mismatch)
- Prettier runs via ESLint (`eslint-plugin-prettier`) - run `npx eslint . --fix` to auto-format

## Toolchain

| Tool | Config |
|------|--------|
| Vite 6 | `vite.config.ts` (vue + glsl + tsconfig-paths plugins) |
| TypeScript 5 | `tsconfig.json` (references) → `tsconfig.app.json` (src/) + `tsconfig.node.json` (config files) |
| ESLint 10 | `eslint.config.ts` (flat config, `defineConfig` from `eslint/config`) |
| Prettier | `prettier.config.js` (tabs, single quotes, printWidth 100) |
| html-validate | `.htmlvalidate.json` - validates Vue templates for HTML spec compliance |
| vue-tsc | Used for type-checking (not tsc directly) - `vue-tsc -b` uses project references |

## Branch Status

Currently on `to-vue3` branch (Vue 2 -> Vue 3 migration). Key completed migration work:
- Webpack -> Vite
- Element UI removed, replaced with custom base components (`src/components/base/`)
- ESLint v8 -> v10 flat config
- Prettier added
- `slot=` attributes converted to `v-slot` syntax
- `#app` height CSS fix (Vue 3 mounts inside `#app`, not replacing it)
- html-validate violations fixed
- split.js removed, replaced with `src/components/base/SplitView.vue` (flexbox + passive touch listeners)
- Template page always visible in nav tree, even with no model loaded (`ensureTemplatePage()`)
- `static/style.css` merged into `src/styles/global.css`; Bootstrap overrides now Vite-processed

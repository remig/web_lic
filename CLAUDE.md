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

## Code Style

### TypeScript
- `strict: true` plus `noImplicitReturns` in `tsconfig.app.json`
- Avoid `!` non-null assertions - prefer type narrowing or early returns
- No TypeScript syntax in Vue `<template>` expressions (casts, generics) - move them into `<script setup>` functions
- Store setter interfaces: use `export type XMutationInterface = typeof XMutations` instead of a hand-written duplicate interface

### CSS
- Always use native CSS nesting (nest pseudo-classes, modifier classes, descendants inside parent block)
- Do not use `&` for simple descendant selectors inside a parent block - just write the child selector directly

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

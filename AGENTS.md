# Context Resolver - Agent Instructions

This file contains the definitive instructions for AI agents (Claude, Copilot, Cursor, etc.) working on the `@gqm/context-resolver` project.

## 🏗️ Architecture Rules

- **Dual Runtime:** The source code is strictly Node.js ESM. The test suite is strictly Deno.
- **Platform Agnostic (Universal):** Source files (`src/core`, `src/sync`) MUST NOT import Node built-ins (`fs`, `path`, `crypto`), nor use Deno globals (`Deno.*`). The output must run in Browsers, Edge Workers, Node, and Deno seamlessly.
- **Imports:** TypeScript files MUST use `.js` extensions for relative imports to comply with `NodeNext` module resolution (e.g., `import { Scope } from './scope.js';`). Do not use `.ts` in import paths.

## 🧪 Testing Rules

- **Framework:** Tests live in `*.spec.ts` files alongside the source.
- **Style:** Use BDD style (`describe`, `it`) imported from `@std/testing/bdd`.
- **Assertions:** Use `assertEquals`, `assertThrows`, etc., imported from `@std/assert`.
- **Black-box:** Tests should primarily test the public API (`IScope`, `createScope`) to allow internal refactoring without breaking tests.

## 🛠️ Tooling Rules

- **Linter/Formatter:** We use Biome exclusively. Do not add ESLint or Prettier config files or disable comments. Use `npm run format` and `npm run lint`.
- **Types:** Strict TypeScript. Use `npm run typecheck` to verify without emitting.
- **Build:** Handled by `tsc -p tsconfig.build.json`.

## 📦 Commits & Releases

- **Conventional Commits:** All commits MUST follow the Conventional Commits specification.
- **Releases:** Handled automatically by Semantic Release in GitHub Actions.
- **Breaking Changes:** Any change that breaks backward compatibility MUST include `BREAKING CHANGE:` in the commit footer or use the `!` syntax (e.g., `feat!: change API`).

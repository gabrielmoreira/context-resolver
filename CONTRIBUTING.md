# Contributing to @gqm/context-resolver

Welcome to the `@gqm/context-resolver` project! Thank you for considering contributing. 
This document serves as a brief guide to the philosophy, architecture, and developer workflow of this repository.

## 🏗️ Architecture & Philosophy

This project employs a **Dual Runtime** setup:

1. **Source Code & Publish Target (Node.js & Pure ESM)**
   The actual library source (`src/core`, `src/sync`) is written in pure TypeScript and published as standard ECMAScript Modules (ESM) compatible with modern Node.js (`>=22`) and browsers.
   **Rule:** Never use Deno-specific APIs (like `Deno.*`), global imports from URLs, or `jsr:`/`npm:` specifiers inside the library source code.

2. **Local Testing Environment (Deno)**
   We use Deno exclusively as our blazing-fast local test runner. All tests live alongside the source code in `*.spec.ts` files and are written using Deno's standard testing and assertion libraries (e.g., `@std/testing/bdd`, `@std/assert`).
   **Rule:** The `deno.json` file manages these testing dependencies. The library itself has zero runtime dependencies.

3. **Formatting & Linting (Biome)**
   We use [Biome](https://biomejs.dev/) to format and lint our code instantly. We do not use Prettier or ESLint.

## 🚀 Getting Started

We highly recommend trying out the **Deno Native Workflow** for local development, as it is blazing fast and requires zero `node_modules` installation just to run tests. However, we fully support a standard **NPM Workflow** too.

### Option A: The Deno Way (Highly Recommended ❤️)

If you have [Deno installed globally](https://docs.deno.com/runtime/manual/getting_started/installation), you can start hacking immediately without running `npm install`:

```bash
# 1. Clone the repository
git clone https://github.com/gabrielmoreira/context-resolver.git
cd context-resolver

# 2. Run the tests! (Deno automatically downloads @std dependencies on the fly)
deno task test
```
*Note: To build the library (`dist/`) or format/lint with Biome before opening a PR, you'll still need to run `npm install` eventually.*

### Option B: The NPM Way (Standard)

You **do not need** to install Deno globally on your machine to contribute. We provide the Deno binary as a standard `devDependency` in `package.json`.

```bash
# 1. Clone the repository
git clone https://github.com/gabrielmoreira/context-resolver.git
cd context-resolver

# 2. Install dependencies (Downloads TypeScript, Biome, and the local Deno binary)
npm install

# 3. Run the test suite!
npm run test
```

## 🛠️ Commands

### Testing
- `deno task test` (or `npm run test`) - Runs the BDD test suite.

### Formatting & Linting
- `npm run format` - Automatically formats all files using Biome.
- `npm run lint` - Checks for linting errors using Biome.

### Building & Verification
- `npm run build` - Compiles the TypeScript source into the `dist/` folder.
- `npm run check` - Runs Biome linting and the TypeScript compiler (`noEmit`) to verify type safety.
- `npm run prepublishOnly` - Cleans, builds, and verifies everything before publishing to npm.

## 💻 IDE Setup (VS Code)

To get the best experience contributing to this project, we recommend installing the following VS Code extensions:

1. **Biome** (`biomejs.biome`): For instant formatting and linting.
2. **Deno** (`denoland.vscode-deno`): Because the root of the project contains a `deno.json` file, the extension will prompt you to enable it for this workspace. **You should enable it!** It provides excellent language server support for the `jsr:` imports used in our test files, while still respecting standard TypeScript for our source code.

## 📝 Pull Request Guidelines

1. **Write tests:** If you fix a bug or add a feature, please add a test in the corresponding `*.spec.ts` file. We use a BDD style (`describe`, `it`).
2. **Run checks locally:** Before committing, ensure you run `npm run check` and `npm run test`.
3. **Commit cleanly:** Keep commit messages clear, concise, and focused on the "why".

Happy coding! We appreciate your contributions.

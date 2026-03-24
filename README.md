# @gqm/context-resolver

[![npm version](https://img.shields.io/npm/v/@gqm/context-resolver?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/@gqm/context-resolver)
[![npm downloads](https://img.shields.io/npm/dw/@gqm/context-resolver?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/@gqm/context-resolver)
[![CI](https://img.shields.io/github/actions/workflow/status/gabrielmoreira/context-resolver/ci.yml?branch=main&style=flat-square&label=CI&logo=githubactions&logoColor=white)](https://github.com/gabrielmoreira/context-resolver/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/actions/workflow/status/gabrielmoreira/context-resolver/release.yml?branch=main&style=flat-square&label=Release&logo=githubactions&logoColor=white)](https://github.com/gabrielmoreira/context-resolver/actions/workflows/release.yml)
[![CodeQL](https://img.shields.io/github/actions/workflow/status/gabrielmoreira/context-resolver/codeql.yml?branch=main&style=flat-square&label=CodeQL&logo=github)](https://github.com/gabrielmoreira/context-resolver/actions/workflows/codeql.yml)
[![API Regression](https://img.shields.io/github/actions/workflow/status/gabrielmoreira/context-resolver/api-compatibility.yml?style=flat-square&label=API%20Regression&logo=githubactions&logoColor=white)](https://github.com/gabrielmoreira/context-resolver/actions/workflows/api-compatibility.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![ESM only](https://img.shields.io/badge/ESM-only-f7df1e?style=flat-square&logo=javascript&logoColor=black)](https://nodejs.org/api/esm.html)
[![Node \u2265 18](https://img.shields.io/node/v/%40gqm%2Fcontext-resolver?style=flat-square&logo=nodedotjs&logoColor=white&color=339933)](https://nodejs.org/)
[![Biome](https://img.shields.io/badge/code%20style-Biome-60a5fa?style=flat-square&logo=biome&logoColor=white)](https://biomejs.dev)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-fa6673?style=flat-square&logo=conventionalcommits&logoColor=white)](https://conventionalcommits.org)
[![semantic-release](https://img.shields.io/badge/semantic--release-automated-e10079?style=flat-square&logo=semantic-release)](https://github.com/semantic-release/semantic-release)

A dynamic scoped context and configuration resolver.
Supports hierarchical overrides, path interpolation, protocols, and structured path-based resolution.

## ✨ Features

- **🌐 Universal (Isomorphic)**: 100% ECMAScript. Runs flawlessly in Node.js, Deno, Bun, Cloudflare Workers, and modern browsers.
- **📦 Pure ESM & Side-effect Free**: Zero dependencies, fully tree-shakable.
- **👨‍👦 Hierarchical Scoping**: Shadow parent keys seamlessly.
- **🪄 Dynamic Interpolation**: `{{ var }}` tags resolve properly inside parent configurations using local child scope values.
- **🔌 Protocols (Schemas)**: Built-in support for String Protocols (e.g. `env:VAR`) and Object Protocols (e.g. `{ $ref: 'path' }`).
- **🗺️ Path Semantics**: `a.b.c`, `a[0].b`, and `a.0.b` parsed robustly.
- **🛡️ Type Guards**: Runtime assertions for bulletproof type safety.
- **⚡ Epoch Cache**: O(1) invalidation across the tree when any local context changes.

## 📦 Installation

Pick your favorite package manager:

```bash
# npm
npm install @gqm/context-resolver

# pnpm
pnpm add @gqm/context-resolver

# yarn
yarn add @gqm/context-resolver

# bun
bun add @gqm/context-resolver

# deno
deno add npm:@gqm/context-resolver
```

## Features Tour

### 1. Hierarchical Scoping & Shadowing
Children inherit values from their parents but can shadow them locally.

```typescript
import { createScope } from '@gqm/context-resolver';

const root = createScope();
root.set('api.timeout', 5000);
root.set('api.host', 'example.com');

const child = createScope({ parent: root });
child.set('api.timeout', 1500); // Shadow only the timeout

console.log(child.resolve('api.host'));    // 'example.com' (from parent)
console.log(child.resolve('api.timeout')); // 1500 (local override)
```

### 2. Dynamic Interpolation (Child-First Semantics)
When a parent template is resolved by a child, it interpolates using the **child's context**.

```typescript
const root = createScope();
root.set('prefix', '/v1');
root.set('url', 'https://api.example.com{{prefix}}');

const child = createScope({ parent: root });
child.set('prefix', '/beta');

// The parent's template naturally adapts to the child's environment!
console.log(child.resolve('url')); // 'https://api.example.com/beta'
```

### 3. Deep Path Set & Resolve
Containers are created automatically. You can use dot-notation or brackets.

```typescript
const scope = createScope();
scope.set('database.credentials.user', 'admin');
scope.set('servers[0].port', 8080);

console.log(scope.resolve('database')); 
// { credentials: { user: 'admin' } }

console.log(scope.resolve('servers[0].port')); 
// 8080
```

### 4. Built-in `$ref` Object Protocol
Reference values stored elsewhere in the tree.

```typescript
const scope = createScope();
scope.set('system.adminEmail', 'admin@example.com');
scope.set('alerts.to', { $ref: 'system.adminEmail' });

console.log(scope.resolve('alerts.to')); // 'admin@example.com'
```

### 5. ⚡ Runtime Type Guards
Ensure the resolved value matches your TypeScript type safely.

```typescript
const scope = createScope();
scope.set('retries', 3);

// Throws TypeError if the resolved value is not a number
const retries = scope.resolve('retries', (v): v is number => typeof v === 'number');
```

### 6. 🔌 Custom String Protocols (Schemas)
String protocols intercept paths with the `schema:path` format, letting you source values from any external provider — environment variables, vaults, files, and more.

```typescript
const scope = createScope();

// Register your own `env:` schema
scope.registerStringProtocol('env', (path) => process.env[path]);

// Now resolves naturally alongside regular scope keys
console.log(scope.resolve('env:API_KEY'));

// And scope values can OVERRIDE the protocol — great for testing!
scope.set('env:API_KEY', 'mock-key-for-tests');
console.log(scope.resolve('env:API_KEY')); // 'mock-key-for-tests'
```

> 💡 The community refers to this pattern as **"String Protocols"** or **"Schemas"** — the prefix before `:` is the schema name.

## 🧠 Advanced Usage

Need to create custom Object Protocols (like `$join`), disable built-in protocols (`$ref`), or understand the O(1) Epoch Cache internals?
Check out the **[Advanced Usage Guide](ADVANCED.md)**.

## 🤝 Contributing

We love contributions! Please read our **[Contributing Guide](CONTRIBUTING.md)** to learn about our Dual Runtime (Node + Deno) setup, how to run tests, and the workflow to follow.

🤖 **AI Agents:** If you are using Claude, GitHub Copilot, Cursor, or any AI assistant to contribute to this repo, please point it to **[AGENTS.md](AGENTS.md)** as the absolute source of truth.


## 🗺️ Roadmap

### Async Scope

Add `resolveAsync(path)` returning a `Promise`, allowing String and Object Protocol handlers to be async. Unlocks use cases like fetching secrets from a remote vault, reading config from the file system, or calling feature-flag APIs as part of resolution.

Open design questions: parallel `AsyncScope` class vs async overloads on `Scope`; how the Epoch Cache handles concurrent resolves.

### Scope Sealing

A `scope.seal()` operation that makes a scope (or specific paths/protocols within it) immutable. Any `set()` after sealing throws a `ScopeSealed` error.

```typescript
const scope = createScope();
scope.set('db.host', 'prod-db.example.com');
scope.seal();

scope.set('db.host', 'other'); // throws: ScopeSealed
```

Variants under consideration: `seal()` for the whole scope, `seal('path')` for a specific key, `sealProtocols()` to prevent new protocol registrations.
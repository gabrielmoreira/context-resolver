# @gqm/context-resolver

A dynamic scoped context and configuration resolver.
Supports hierarchical overrides, path interpolation, protocols, and structured path-based resolution.

## Features

- **Hierarchical Scoping**: Shadow parent keys seamlessly.
- **Dynamic Interpolation**: `{{ var }}` tags resolve properly inside parent configurations using local child scope values.
- **Protocols**: Built-in support for String Protocols (e.g. `env:VAR`) and Object Protocols (e.g. `$ref`).
- **Path Semantics**: `a.b.c`, `a[0].b`, and `a.0.b` parsed robustly.
- **Type Guards**: Runtime assertions.
- **Epoch Cache**: O(1) invalidation across the tree when any local context changes.
- **Pure ESM & Side-effect Free**: Zero dependencies, fully tree-shakable.
- **Universal (Isomorphic)**: 100% ECMAScript. Runs flawlessly in Node.js, Deno, Bun, Cloudflare Workers, and modern browsers.

## Installation

```bash
npm install @gqm/context-resolver
```

## Basic Usage

```ts
import { createScope } from '@gqm/context-resolver';

const root = createScope();
root.set('app.prefix', '/v1');
root.set('api.url', 'https://api.example.com{{app.prefix}}');

const child = createScope({ parent: root });
child.set('app.prefix', '/beta');

// Dynamic scoping respects the child override during interpolation!
console.log(child.resolve('api.url')); // 'https://api.example.com/beta'
```

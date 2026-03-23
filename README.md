# @gqm/context-resolver

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
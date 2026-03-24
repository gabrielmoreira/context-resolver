# Advanced Usage Guide

This guide details the internal mechanisms of `@gqm/context-resolver` and how you can extend the engine for advanced configuration scenarios.

---

## 1. String Protocols

String Protocols act as interceptors for strings formatted like `schema:path`. This allows you to resolve values from external environments, like `process.env` in Node.js, `Deno.env` in Deno, or even file systems.

### Creating a Protocol
```typescript
import { createScope } from '@gqm/context-resolver';

const scope = createScope();

// Example: Resolving "env:VAR_NAME"
scope.registerStringProtocol('env', (path, options, utils) => {
  // In a Node.js environment:
  return process.env[path];
});

scope.resolve('env:API_KEY'); // Returns the environment variable
```

### Protocol Priority
The resolution order is strictly:
1. **Local Store:** (e.g. `scope.set('env:API_KEY', 'local-mock')`)
2. **Parent Chain:** Ancestors are checked for overrides.
3. **Protocol Handler:** Executed only if no scope in the tree explicitly overrides the key.

This ensures you can easily mock or override external protocols inside a child scope for testing or specific scenarios!

---

## 2. Object Protocols

Object Protocols intercept JSON objects that match a specific shape, transforming them dynamically. The engine ships with `$ref` out-of-the-box, but you can build anything, like a `$join` protocol.

### Creating a Custom Object Protocol
```typescript
scope.registerObjectProtocol(
  // 1. The Matcher: Returns true if this protocol should handle the object
  (data) => typeof (data as any).$join !== 'undefined',
  
  // 2. The Handler: Executes the transformation
  (data, options, utils) => {
    const obj = data as { $join: unknown[], sep?: string };
    
    // Crucial: Resolve inner items first so templates/refs inside the array are evaluated
    // context is always populated by the engine before handlers are called — no assertion needed
    const resolvedArray = options.context.resolveValues<string[]>(obj.$join, options);
    
    return resolvedArray.join(obj.sep ?? '');
  }
);

scope.set('expr', { $join: ['eu', 'west', '1'], sep: '-' });
scope.resolve('expr'); // "eu-west-1"
```

---

## 3. Epoch Cache Mechanism

When `resolve()` evaluates a template or reference, it saves the result to avoid redundant work. Instead of using expensive `EventEmitter` structures or deep dirty-checking, the engine uses an **O(1) Epoch Cache Pattern**.

- Every scope tree shares a single `TreeState` integer clock.
- When `set()` is called on *any* scope in the tree (parent or child), the shared clock is bumped (`version++`).
- When reading from cache, the scope compares the entry's version against the global clock. If they mismatch, it recalculates instantly.

This guarantees zero memory leaks and guarantees that a change in the root scope safely invalidates cached templates inside the deepest child.

---

## 4. Raw Materialization & Deep Fallback

Why doesn't a parent scope interpolate templates when queried by a child?
Because of **Child-First Semantics**.

When `child.resolve('api.url')` asks the parent for a missing value, the engine calls `parent.resolveRaw('api.url')`. The parent returns the *uninterpolated* raw string (`https://{{host}}`). 

The child then runs `resolveValues()` on that raw string locally. This forces `{{host}}` to be resolved against the child's store first. If the child doesn't have `host`, the request bubbles up to the parent naturally.

---

## 5. Scope Options

When creating a scope, you can pass options to adjust parsing behaviors:

```typescript
const scope = createScope({
  // Fallback scope
  parent: rootScope,
  
  // Path Parsing Behavior
  numericSegmentsAsArrays: true 
});
```

### `numericSegmentsAsArrays` explained:
By default, the path `tenants.0.slug` parses `0` as a string key in an object:
```json
{ "tenants": { "0": { "slug": "..." } } }
```

If you set `numericSegmentsAsArrays: true`, the engine treats `0` as an array index:
```json
{ "tenants": [ { "slug": "..." } ] }
```

> **⚠ Always-array rule:** Explicit bracket notation — `tenants[0].slug` or `tenants.[0].slug` — **always** produces an array index, regardless of the `numericSegmentsAsArrays` setting. This applies even when the option is `false`.


---

## 6. Disabling Built-in Protocols

By default, the engine automatically registers the `$ref` Object Protocol on every root scope. If your data model contains objects with a `$ref` key that should be treated as plain data (not as a resolver reference), you can opt out.

```typescript
const scope = createScope({ disableBuiltinProtocols: true });

scope.set('meta', { $ref: 'some-json-schema-url' });

// Without disableBuiltinProtocols, this would try to resolve 'some-json-schema-url'.
// With it disabled, the object is returned as-is.
console.log(scope.resolve('meta'));
// { $ref: 'some-json-schema-url' }
```

You can then register your own `$ref` handler (or nothing at all) as needed:

```typescript
// Register a custom $ref that resolves only within a specific namespace
scope.registerObjectProtocol(
  (data) => typeof (data as any).$ref === 'string'
  (data, opts) => opts.context.resolve((data as { $ref: string }).$ref, opts)
);
```
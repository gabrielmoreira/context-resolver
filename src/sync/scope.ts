import { parsePath } from '../core/path.js';
import { treeGet, treeMerge, treeSet } from '../core/tree.js';
import type {
  BoundResolveOptions,
  IScope,
  ObjectProtocolHandler,
  ObjectProtocolMatcher,
  PathSegment,
  ProtocolUtils,
  ResolveOptions,
  ScopeOptions,
  ScopeReference,
  ScopeValue,
  StringProtocolHandler,
  TypeGuard,
} from '../core/types.js';
import { isPlainObject } from '../core/utils.js';

class TreeState {
  public version = 0;
  public bump(): void {
    this.version++;
  }
}

interface CacheEntry {
  value: unknown;
  version: number;
}

const TEMPLATE_RE = /\{\{([^{}]+)\}\}/g;
const FULL_TEMPLATE_RE = /^\{\{([^{}]+)\}\}$/;
const PROTOCOL_RE = /^([a-zA-Z0-9_-]+):(.+)$/;

const NOT_MATCHED: unique symbol = Symbol('NOT_MATCHED');

export class Scope implements IScope {
  public readonly parent?: Scope;
  private readonly treeState: TreeState;
  private readonly opts: ScopeOptions;

  private readonly data: Record<string, unknown> = {};
  private readonly cache = new Map<string, CacheEntry>();

  private readonly stringProtocols = new Map<string, StringProtocolHandler>();
  private readonly objectProtocols: Array<{
    match: ObjectProtocolMatcher;
    handle: ObjectProtocolHandler;
  }> = [];

  private readonly utils: ProtocolUtils;

  constructor(options?: ScopeOptions) {
    const parent = options?.parent;
    if (parent !== undefined && !(parent instanceof Scope)) {
      throw new Error('Invalid parent scope: parent must be an instance of Scope.');
    }
    this.parent = parent as Scope | undefined;
    this.treeState = this.parent ? this.parent.treeState : new TreeState();
    this.opts = options ?? {};

    if (!this.parent && !this.opts.disableBuiltinProtocols) {
      this.objectProtocols.push({
        match: (d): boolean =>
          isPlainObject(d) && typeof (d as Record<string, unknown>).$ref === 'string',
        handle: (d, opts): unknown => opts.context.resolve((d as ScopeReference).$ref, opts),
      });
    }

    this.utils = {
      deepGet: (data: unknown, path: string): unknown =>
        treeGet(data, parsePath(path, this.opts.numericSegmentsAsArrays)),
      parsePath: (path: string): PathSegment[] =>
        parsePath(path, this.opts.numericSegmentsAsArrays),
    };
  }

  public set(key: string, value: ScopeValue): void;
  public set(values: Record<string, ScopeValue>): void;
  public set(keyOrValues: string | Record<string, ScopeValue>, value?: ScopeValue): void {
    if (typeof keyOrValues === 'string') {
      const segs = parsePath(keyOrValues, this.opts.numericSegmentsAsArrays);
      treeSet(this.data, segs, value as ScopeValue);
    } else {
      treeMerge(this.data, keyOrValues as Record<string, unknown>);
    }
    this.treeState.bump();
  }

  public has(path: string): boolean {
    return this.resolve(path, { optional: true }) !== undefined;
  }

  public registerStringProtocol(schema: string, handler: StringProtocolHandler): void {
    this.stringProtocols.set(schema, handler);
    this.treeState.bump();
  }

  public registerObjectProtocol(match: ObjectProtocolMatcher, handle: ObjectProtocolHandler): void {
    this.objectProtocols.push({ match, handle });
    this.treeState.bump();
  }

  public resolve<T = unknown>(path: string): T;
  public resolve<T>(path: string, guard: TypeGuard<T>): T;
  public resolve<T = unknown>(path: string, options: ResolveOptions): T;
  public resolve<T>(path: string, options: ResolveOptions, guard: TypeGuard<T>): T;
  public resolve<T>(path: string, arg2?: ResolveOptions | TypeGuard<T>, arg3?: TypeGuard<T>): T {
    const options: ResolveOptions = typeof arg2 !== 'function' ? (arg2 ?? {}) : {};
    const guard: TypeGuard<T> | undefined = typeof arg2 === 'function' ? arg2 : arg3;

    const context = options.context ?? this;
    const isEntryPoint = context === this;
    const opts: BoundResolveOptions = { ...options, context };

    if (isEntryPoint) {
      const cached = this.cache.get(path);
      if (cached !== undefined && cached.version === this.treeState.version) {
        return this.applyGuard(cached.value, path, guard);
      }
    }

    const resolved = this.internalResolve(path, opts);

    if (isEntryPoint) {
      this.cache.set(path, { value: resolved, version: this.treeState.version });
    }

    return this.applyGuard(resolved, path, guard);
  }

  public resolveValues<T = unknown>(data: unknown, options: ResolveOptions = {}): T {
    const context = options.context ?? this;
    const opts: BoundResolveOptions = { ...options, context };

    if (Array.isArray(data)) {
      return data.map((item) => this.resolveValues(item, opts)) as unknown as T;
    }

    if (data !== null && typeof data === 'object') {
      const result = this.matchObjectProtocol(data, opts);
      if (result !== NOT_MATCHED) return result as T;

      const out: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
        out[key] = this.resolveValues(val, opts);
      }
      return out as T;
    }

    if (typeof data === 'string' && opts.interpolate !== false) {
      const fullMatch = FULL_TEMPLATE_RE.exec(data);
      if (fullMatch) {
        return context.resolve(fullMatch[1].trim(), {
          ...opts,
          optional: true,
        }) as T;
      }
      return this.interpolateString(data, opts) as unknown as T;
    }

    return data as T;
  }

  private internalResolve(path: string, options: BoundResolveOptions): unknown {
    const visitedPaths = options.visitedPaths ?? new Set<string>();

    const actualPath = this.interpolatePath(path, options, visitedPaths);

    if (visitedPaths.has(actualPath)) {
      // Build the full cycle chain for a useful error message:
      // visited paths are insertion-ordered, so we can reconstruct the loop.
      const chain = [...visitedPaths, actualPath].join(' → ');
      throw new Error(`Circular dependency detected: ${chain}`);
    }
    visitedPaths.add(actualPath);
    const opts: BoundResolveOptions = { ...options, visitedPaths };

    try {
      let value = this.getFromStore(actualPath);

      if (value === undefined && this.parent) {
        value = this.parent.resolveRaw(actualPath);
      }

      if (value === undefined) {
        const m = PROTOCOL_RE.exec(actualPath);
        if (m) {
          const handler = this.findStringProtocol(m[1]);
          if (handler) {
            value = handler(m[2], opts, this.utils);
          }
        }
      }

      if (value === undefined) {
        if (opts.optional) return undefined;
        throw new Error(`Scope value not found: "${actualPath}"`);
      }

      return this.resolveValues(value, opts);
    } finally {
      visitedPaths.delete(actualPath);
    }
  }

  private interpolatePath(
    path: string,
    options: BoundResolveOptions,
    visitedPaths: Set<string>,
  ): string {
    if (!path.includes('{{')) return path;
    return path.replace(TEMPLATE_RE, (_match, captured: string) => {
      const resolved = options.context.resolve(captured.trim(), {
        ...options,
        visitedPaths,
        optional: true,
      });
      return resolved !== undefined ? String(resolved) : _match;
    });
  }

  protected resolveRaw(path: string): unknown {
    const local = this.getFromStore(path);
    if (local !== undefined) return local;
    return this.parent?.resolveRaw(path);
  }

  private getFromStore(path: string): unknown {
    const segs = parsePath(path, this.opts.numericSegmentsAsArrays);
    return treeGet(this.data, segs);
  }

  protected matchObjectProtocol(
    data: unknown,
    opts: BoundResolveOptions,
  ): unknown | typeof NOT_MATCHED {
    for (const proto of this.objectProtocols) {
      if (proto.match(data)) return proto.handle(data, opts, this.utils);
    }
    return this.parent?.matchObjectProtocol(data, opts) ?? NOT_MATCHED;
  }

  protected findStringProtocol(schema: string): StringProtocolHandler | undefined {
    return this.stringProtocols.get(schema) ?? this.parent?.findStringProtocol(schema);
  }

  private interpolateString(str: string, options: BoundResolveOptions): string {
    const context = options.context;
    return str.replace(TEMPLATE_RE, (_match, captured: string) => {
      const resolved = context.resolve(captured.trim(), {
        interpolate: true,
        optional: true,
        context,
        visitedPaths: options.visitedPaths,
      });
      return resolved !== undefined ? String(resolved) : _match;
    });
  }

  private applyGuard<T>(value: unknown, path: string, guard?: TypeGuard<T>): T {
    if (guard !== undefined && !guard(value)) {
      throw new TypeError(
        `Type validation failed for path "${path}". Received: ${JSON.stringify(value)}`,
      );
    }
    return value as T;
  }
}

export function createScope(options?: ScopeOptions): IScope {
  return new Scope(options);
}

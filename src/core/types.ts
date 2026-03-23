export type ScopeReference<TPath extends string = string> = { $ref: TPath };

export type ScopeValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>
  | unknown[];

export type TypeGuard<T> = (value: unknown) => value is T;

export type PathSegment = string | number;

export type ProtocolUtils = {
  deepGet(data: unknown, path: string): unknown;
  parsePath(path: string): PathSegment[];
};

export type StringProtocolHandler = (
  path: string,
  options: ResolveOptions,
  utils: ProtocolUtils,
) => unknown;

export type ObjectProtocolMatcher = (data: unknown) => boolean;

export type ObjectProtocolHandler = (
  data: unknown,
  options: ResolveOptions,
  utils: ProtocolUtils,
) => unknown;

export interface ResolveOptions {
  interpolate?: boolean;
  optional?: boolean;
  context?: IScope;
  visitedPaths?: Set<string>;
}

export type ScopeOptions = {
  parent?: IScope;
  numericSegmentsAsArrays?: boolean;
};

export interface IScope {
  readonly parent?: IScope;

  set(key: string, value: ScopeValue): void;
  set(values: Record<string, ScopeValue>): void;

  has(path: string): boolean;

  registerStringProtocol(schema: string, handler: StringProtocolHandler): void;
  registerObjectProtocol(match: ObjectProtocolMatcher, handle: ObjectProtocolHandler): void;

  resolve<T = unknown>(path: string): T;
  resolve<T>(path: string, guard: TypeGuard<T>): T;
  resolve<T = unknown>(path: string, options: ResolveOptions): T;
  resolve<T>(path: string, options: ResolveOptions, guard: TypeGuard<T>): T;

  resolveValues<T = unknown>(data: unknown, options?: ResolveOptions): T;
}

import type { ScopeReference } from './types.js';

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function ref<TPath extends string>(path: TPath): ScopeReference<TPath> {
  return { $ref: path };
}

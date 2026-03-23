import type { PathSegment } from './types.js';
import { isPlainObject } from './utils.js';

export function treeGet(root: unknown, segments: PathSegment[]): unknown {
  let cur = root;
  for (const seg of segments) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) {
      cur = typeof seg === 'number' ? cur[seg] : undefined;
    } else if (typeof cur === 'object') {
      cur = (cur as Record<string, unknown>)[String(seg)];
    } else {
      return undefined;
    }
  }
  return cur;
}

export function treeSet(
  root: Record<string, unknown>,
  segments: PathSegment[],
  value: unknown,
): void {
  if (segments.length === 0) return;

  let cur: unknown = root;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    const nextSeg = segments[i + 1];
    const needsArray = typeof nextSeg === 'number';

    if (Array.isArray(cur)) {
      const idx = seg as number;
      if (cur[idx] === undefined || cur[idx] === null || typeof cur[idx] !== 'object') {
        cur[idx] = needsArray ? [] : {};
      }
      cur = cur[idx];
    } else if (cur !== null && typeof cur === 'object') {
      const obj = cur as Record<string, unknown>;
      const key = String(seg);
      if (obj[key] === undefined || obj[key] === null || typeof obj[key] !== 'object') {
        obj[key] = needsArray ? [] : {};
      }
      cur = obj[key];
    }
  }

  const last = segments[segments.length - 1];
  if (Array.isArray(cur)) {
    (cur as unknown[])[last as number] = value;
  } else if (cur !== null && typeof cur === 'object') {
    (cur as Record<string, unknown>)[String(last)] = value;
  }
}

export function treeMerge(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const [key, val] of Object.entries(source)) {
    if (isPlainObject(val) && isPlainObject(target[key]) && Object.keys(val).length > 0) {
      treeMerge(target[key] as Record<string, unknown>, val as Record<string, unknown>);
    } else {
      target[key] = val;
    }
  }
}

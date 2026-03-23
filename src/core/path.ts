import type { PathSegment } from './types.js';

export function parsePath(rawPath: string, numericAsArrays = false): PathSegment[] {
  if (!rawPath) throw new Error('Invalid path: path cannot be empty.');

  const segments: PathSegment[] = [];
  let i = 0;
  let current = '';

  const flush = (): void => {
    if (!current) return;
    segments.push(numericAsArrays && /^\d+$/.test(current) ? Number(current) : current);
    current = '';
  };

  while (i < rawPath.length) {
    const ch = rawPath[i];

    if (ch === '[') {
      flush();
      const close = rawPath.indexOf(']', i + 1);
      if (close === -1) {
        throw new Error(`Invalid path "${rawPath}": unclosed bracket at position ${i}.`);
      }
      const inner = rawPath.slice(i + 1, close);
      if (inner === '') {
        throw new Error(`Invalid path "${rawPath}": empty bracket at position ${i}.`);
      }
      if (!/^\d+$/.test(inner)) {
        throw new Error(
          `Invalid path "${rawPath}": bracket must contain a numeric index, got "${inner}".`,
        );
      }
      segments.push(Number(inner));
      i = close + 1;
      if (rawPath[i] === '.') i++;
    } else if (ch === '.') {
      flush();
      i++;
    } else {
      current += ch;
      i++;
    }
  }

  flush();

  if (segments.length === 0) {
    throw new Error(`Invalid path "${rawPath}": resolves to an empty segment list.`);
  }

  return segments;
}

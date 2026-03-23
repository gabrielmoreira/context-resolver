import { assertEquals, assertThrows } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { createScope } from './scope.js';

describe('guards', () => {
  it('passes for correct primitive type', () => {
    // Given
    const scope = createScope();
    scope.set('api.timeoutMs', 3000);
    const isNumber = (v: unknown): v is number => typeof v === 'number';

    // When
    const res = scope.resolve('api.timeoutMs', isNumber);

    // Then
    assertEquals(res, 3000);
  });

  it('fails for wrong primitive type', () => {
    // Given
    const scope = createScope();
    scope.set('api.timeoutMs', 3000);
    const isString = (v: unknown): v is string => typeof v === 'string';

    // When / Then
    assertThrows(
      () => scope.resolve('api.timeoutMs', isString),
      TypeError,
      'Type validation failed for path "api.timeoutMs"',
    );
  });

  it('validates resolved object shape', () => {
    // Given
    const scope = createScope();
    scope.set({
      database: {
        host: 'db.internal',
        port: 5432,
      },
    });

    function isDatabaseConfig(v: unknown): v is { host: string; port: number } {
      return (
        typeof v === 'object' &&
        v !== null &&
        typeof (v as any).host === 'string' &&
        typeof (v as any).port === 'number'
      );
    }

    // When
    const res = scope.resolve('database', isDatabaseConfig);

    // Then
    assertEquals(res, { host: 'db.internal', port: 5432 });
  });

  it('validates cached values too', () => {
    // Given
    const scope = createScope();
    scope.set('api.timeoutMs', 3000);
    const isString = (v: unknown): v is string => typeof v === 'string';

    // When
    // Prime cache with unguarded resolution
    scope.resolve('api.timeoutMs');

    // Then
    // Cache hit still runs the guard
    assertThrows(() => scope.resolve('api.timeoutMs', isString), TypeError);
  });
});

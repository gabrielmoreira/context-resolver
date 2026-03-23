import { assertEquals, assertThrows } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { createScope } from './scope.js';

describe('cycles', () => {
  it('direct cycle in string interpolation', () => {
    // Given
    const scope = createScope();
    scope.set('a', '{{b}}');
    scope.set('b', '{{a}}');

    // When / Then
    assertThrows(() => scope.resolve('a'), Error, 'Circular dependency detected');
  });

  it('longer cycle across multiple references', () => {
    // Given
    const scope = createScope();
    scope.set('a', '{{b}}');
    scope.set('b', '{{c}}');
    scope.set('c', '{{a}}');

    // When / Then
    assertThrows(() => scope.resolve('a'), Error, 'Circular dependency detected');
  });

  it('cycle through path interpolation', () => {
    // Given
    const scope = createScope();
    scope.set('envName', '{{targetEnv}}');
    scope.set('targetEnv', '{{envName}}');

    // When / Then
    assertThrows(
      () => scope.resolve('config.api.{{envName}}.url'),
      Error,
      'Circular dependency detected',
    );
  });

  it('cycle involving object protocol references', () => {
    // Given
    const scope = createScope();
    scope.set('a', { $ref: 'b' });
    scope.set('b', { $ref: 'a' });

    // When / Then
    assertThrows(() => scope.resolve('a'), Error, 'Circular dependency detected');
  });

  it('siblings resolving the same path do not false-positive', () => {
    // Given
    const scope = createScope();
    scope.set('x', 'val');

    // When
    // Both items in the array trigger resolution of 'x', but sequentially.
    const res = scope.resolveValues(['{{ x }}', '{{ x }}']);

    // Then
    assertEquals(res, ['val', 'val']);
  });
});

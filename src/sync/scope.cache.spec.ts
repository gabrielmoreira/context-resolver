import { assertEquals, assertNotEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { createScope } from './scope.js';

describe('cache', () => {
  it('entry-point scope caches successful resolution', () => {
    // Given
    let calls = 0;
    const scope = createScope();
    scope.registerStringProtocol('env', (path) => {
      if (path === 'APP_ENV') {
        calls += 1;
        return 'staging';
      }
      return undefined;
    });

    // When
    const res1 = scope.resolve('env:APP_ENV');
    const res2 = scope.resolve('env:APP_ENV');

    // Then
    assertEquals(res1, 'staging');
    assertEquals(res2, 'staging');
    assertEquals(calls, 1); // Only evaluated once
  });

  it('child and parent do not share local caches incorrectly', () => {
    // Given
    const rootScope = createScope();
    rootScope.set('api.url', 'https://{{tenant}}.api.com');
    rootScope.set('tenant', 'root-tenant');

    const childScope = createScope({ parent: rootScope });
    childScope.set('tenant', 'child-tenant');

    // When
    const childRes = childScope.resolve('api.url');
    const parentRes = rootScope.resolve('api.url');

    // Then
    assertEquals(childRes, 'https://child-tenant.api.com');
    assertEquals(parentRes, 'https://root-tenant.api.com');
    assertNotEquals(childRes, parentRes);
  });

  it('any set() in the tree invalidates caches through epoch version', () => {
    // Given
    const rootScope = createScope();
    rootScope.set('api.baseUrl', 'https://api-a.example.com');
    const executionScope = createScope({ parent: rootScope });

    // Cache the value
    assertEquals(executionScope.resolve('api.baseUrl'), 'https://api-a.example.com');

    // When
    rootScope.set('api.baseUrl', 'https://api-b.example.com');

    // Then
    // Resolves the new value because tree version bumped
    assertEquals(executionScope.resolve('api.baseUrl'), 'https://api-b.example.com');
  });

  it('child mutation invalidates ancestor-derived results too', () => {
    // Given
    const rootScope = createScope();
    rootScope.set('api.prefix', '/v1');
    rootScope.set('api.baseUrl', 'https://api.example.com{{api.prefix}}');
    const executionScope = createScope({ parent: rootScope });

    // Cache initial
    assertEquals(executionScope.resolve('api.baseUrl'), 'https://api.example.com/v1');

    // When
    // Child overrides dependency
    executionScope.set('api.prefix', '/test');

    // Then
    // Cache invalidated, resolves using new dependency
    assertEquals(executionScope.resolve('api.baseUrl'), 'https://api.example.com/test');
  });

  it('keys on interpolated path result, not raw unresolved template', () => {
    // Given
    const scope = createScope();
    scope.set('env.APP_ENV', 'staging');
    scope.set('config.api.staging.url', 'https://staging.api.example.com');
    scope.set('config.api.prod.url', 'https://api.example.com');

    // When
    const path = 'config.api.{{env.APP_ENV}}.url';
    assertEquals(scope.resolve(path), 'https://staging.api.example.com');

    // Mutate the dependency of the path
    scope.set('env.APP_ENV', 'prod');

    // Then
    // Must hit the new actual path
    assertEquals(scope.resolve(path), 'https://api.example.com');
  });
});

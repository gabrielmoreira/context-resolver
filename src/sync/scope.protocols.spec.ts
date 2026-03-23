import { assertEquals, assertThrows } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { createScope } from './scope.js';

// ---------------------------------------------------------------------------
// String protocols
// ---------------------------------------------------------------------------

describe('protocols', () => {
  it('resolve through string protocol when scope tree does not contain value', () => {
    // Given
    const scope = createScope();
    scope.registerStringProtocol('env', (path) => {
      if (path === 'APP_NAME') return 'Retail Portal';
      return undefined;
    });

    // When
    const res = scope.resolve('env:APP_NAME');

    // Then
    assertEquals(res, 'Retail Portal');
  });

  it('local value overrides string protocol', () => {
    // Given
    const scope = createScope();
    scope.registerStringProtocol('env', () => 'Retail Portal');
    scope.set('env:APP_NAME', 'Retail Portal Local Override');

    // When
    const res = scope.resolve('env:APP_NAME');

    // Then
    assertEquals(res, 'Retail Portal Local Override');
  });

  it('parent value overrides string protocol', () => {
    // Given
    const rootScope = createScope();
    rootScope.set('env:APP_NAME', 'Root Override');

    const childScope = createScope({ parent: rootScope });
    childScope.registerStringProtocol('env', () => 'protocol');

    // When
    const res = childScope.resolve('env:APP_NAME');

    // Then
    assertEquals(res, 'Root Override');
  });

  it('string protocol receives useful structured source support via deepGet utils', () => {
    // Given
    const scope = createScope();
    scope.registerStringProtocol('configFile', (path, _opts, { deepGet }) => {
      const fileData = {
        database: {
          credentials: {
            user: 'file_user',
          },
        },
      };
      return deepGet(fileData, path);
    });

    // When
    const res = scope.resolve('configFile:database.credentials.user');

    // Then
    assertEquals(res, 'file_user');
  });

  // ---------------------------------------------------------------------------
  // Object protocols
  // ---------------------------------------------------------------------------

  it('resolves a $ref-style object protocol', () => {
    // Given
    const scope = createScope(); // $ref is built-in
    scope.set('api.baseUrl', 'https://api.example.com');
    scope.set('api.login', { $ref: 'api.baseUrl' });

    // When
    const res = scope.resolve('api.login');

    // Then
    assertEquals(res, 'https://api.example.com');
  });

  it('object protocol inside resolveValues()', () => {
    // Given
    const scope = createScope();
    scope.set('tenant.slug', 'acme');

    // When
    const res = scope.resolveValues({
      slug: { $ref: 'tenant.slug' },
    });

    // Then
    assertEquals(res, { slug: 'acme' });
  });

  it('nested object protocol inside a larger resolved object', () => {
    // Given
    const scope = createScope();
    scope.set('api.baseUrl', 'https://api.example.com');
    scope.set({
      service: {
        endpoints: {
          login: { $ref: 'api.baseUrl' },
        },
      },
    });

    // When
    const res = scope.resolve('service');

    // Then
    assertEquals(res, { endpoints: { login: 'https://api.example.com' } });
  });

  // ---------------------------------------------------------------------------
  // Protocol Inheritance
  // ---------------------------------------------------------------------------

  it('child inherits string protocols registered on root', () => {
    // Given
    const rootScope = createScope();
    rootScope.registerStringProtocol('myenv', (path) => `${path}_value`);
    const childScope = createScope({ parent: rootScope });

    // When
    const res = childScope.resolve('myenv:SECRET');

    // Then
    assertEquals(res, 'SECRET_value');
  });

  it('child inherits object protocols registered on root', () => {
    // Given
    const rootScope = createScope();
    rootScope.registerObjectProtocol(
      (d) => typeof (d as Record<string, unknown>).$upper === 'string',
      (d) => ((d as Record<string, unknown>).$upper as string).toUpperCase(),
    );
    const childScope = createScope({ parent: rootScope });

    // When
    const res = childScope.resolveValues({ $upper: 'hello' });

    // Then
    assertEquals(res, 'HELLO');
  });

  it('registering on child does not affect parent', () => {
    // Given
    const rootScope = createScope();
    const childScope = createScope({ parent: rootScope });

    childScope.registerStringProtocol('childonly', () => 'secret');

    // When / Then
    assertEquals(childScope.resolve('childonly:token'), 'secret');
    // Parent doesn't have it
    assertThrows(() => rootScope.resolve('childonly:token'));
  });
});

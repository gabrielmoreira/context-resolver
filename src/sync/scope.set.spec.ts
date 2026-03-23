import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { createScope } from './scope.js';

describe('set', () => {
  it('simple flat value', () => {
    // Given
    const scope = createScope();

    // When
    scope.set('app.name', 'Retail Portal');

    // Then
    assertEquals(scope.resolve('app.name'), 'Retail Portal');
  });

  it('creates nested object containers from dotted path', () => {
    // Given
    const scope = createScope();

    // When
    scope.set('database.credentials.user', 'app_user');

    // Then
    assertEquals(scope.resolve('database.credentials.user'), 'app_user');
  });

  it('numeric dotted path with default settings (objects, not arrays)', () => {
    // Given
    const scope = createScope(); // default numericSegmentsAsArrays = false

    // When
    scope.set('tenants.0.slug', 'blue-shop');

    // Then
    assertEquals(scope.resolve('tenants.0.slug'), 'blue-shop');
    // It's an object with key '0', not an array
    assertEquals(Array.isArray(scope.resolve('tenants')), false);
    assertEquals(typeof scope.resolve('tenants'), 'object');
  });

  it('bracketed numeric path as array', () => {
    // Given
    const scope = createScope();

    // When
    scope.set('servers[0].host', 'api-1.internal');

    // Then
    assertEquals(scope.resolve('servers[0].host'), 'api-1.internal');
    assertEquals(Array.isArray(scope.resolve('servers')), true);
  });

  it('a.[0].b as array', () => {
    // Given
    const scope = createScope();

    // When
    scope.set('servers.[0].port', 8080);

    // Then
    assertEquals(scope.resolve('servers[0].port'), 8080);
    assertEquals(Array.isArray(scope.resolve('servers')), true);
  });

  it('treat numeric dotted segments as arrays when enabled', () => {
    // Given
    const scope = createScope({ numericSegmentsAsArrays: true });

    // When
    scope.set('regions.0.name', 'eu-west');

    // Then
    assertEquals(scope.resolve('regions[0].name'), 'eu-west');
    assertEquals(Array.isArray(scope.resolve('regions')), true);
  });

  it('overwrite an existing leaf value', () => {
    // Given
    const scope = createScope();
    scope.set('api.timeoutMs', 3000);

    // When
    scope.set('api.timeoutMs', 5000);

    // Then
    assertEquals(scope.resolve('api.timeoutMs'), 5000);
  });

  it('replace a primitive with a deep structure', () => {
    // Given
    const scope = createScope();
    scope.set('api', 'disabled');

    // When
    // Writing deeper replaces the primitive with a container
    scope.set('api.baseUrl', 'https://example.com');

    // Then
    assertEquals(scope.resolve('api.baseUrl'), 'https://example.com');
    assertEquals(typeof scope.resolve('api'), 'object');
  });

  // --- set(object) behavior ---
});

describe('set(object)', () => {
  it('set a nested configuration object', () => {
    // Given
    const scope = createScope();

    // When
    scope.set({
      api: {
        baseUrl: 'https://api.example.com',
        timeoutMs: 3000,
      },
    });

    // Then
    assertEquals(scope.resolve('api.baseUrl'), 'https://api.example.com');
    assertEquals(scope.resolve('api.timeoutMs'), 3000);
  });

  it('set an object containing arrays', () => {
    // Given
    const scope = createScope();

    // When
    scope.set({
      servers: [
        { host: 'api-1.internal', port: 8080 },
        { host: 'api-2.internal', port: 8081 },
      ],
    });

    // Then
    assertEquals(scope.resolve('servers[0].host'), 'api-1.internal');
    assertEquals(scope.resolve('servers[1].port'), 8081);
  });

  it('empty objects and empty arrays survive the write', () => {
    // Given
    const scope = createScope();

    // When
    scope.set({
      featureFlags: {},
      fallbackServers: [],
    });

    // Then
    assertEquals(scope.resolve('featureFlags'), {});
    assertEquals(scope.resolve('fallbackServers'), []);
  });

  it('semantically compatible with set(path, value)', () => {
    // Given
    const scopeA = createScope();
    const scopeB = createScope();

    // When
    scopeA.set({
      database: {
        credentials: {
          user: 'app_user',
        },
      },
    });
    scopeB.set('database.credentials.user', 'app_user');

    // Then
    assertEquals(scopeA.resolve('database.credentials.user'), 'app_user');
    assertEquals(scopeB.resolve('database.credentials.user'), 'app_user');
  });

  it('deep merges when called multiple times', () => {
    // Given
    const scope = createScope();

    // When
    scope.set({
      api: {
        baseUrl: 'https://api.example.com',
      },
    });

    scope.set({
      api: {
        timeoutMs: 3000,
      },
    });

    // Then
    // Both values must survive
    assertEquals(scope.resolve('api.baseUrl'), 'https://api.example.com');
    assertEquals(scope.resolve('api.timeoutMs'), 3000);
  });
});

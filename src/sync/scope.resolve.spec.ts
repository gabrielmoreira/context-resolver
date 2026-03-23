import { assertEquals, assertThrows } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { createScope } from './scope.js';

// ---------------------------------------------------------------------------
// Local resolution
// ---------------------------------------------------------------------------

describe('resolve', () => {
  it('local primitive value', () => {
    // Given
    const scope = createScope();
    scope.set('app.region', 'eu');

    // When
    const res = scope.resolve('app.region');

    // Then
    assertEquals(res, 'eu');
  });

  it('local object value', () => {
    // Given
    const scope = createScope();
    scope.set({
      database: {
        host: 'db.internal',
        port: 5432,
      },
    });

    // When
    const res = scope.resolve('database');

    // Then
    assertEquals(res, { host: 'db.internal', port: 5432 });
  });

  it('unknown local path throws by default', () => {
    // Given
    const scope = createScope();

    // When / Then
    assertThrows(() => scope.resolve('missing.path'), Error, 'Scope value not found');
  });

  it('missing path returns undefined when optional is true', () => {
    // Given
    const scope = createScope();

    // When
    const res = scope.resolve('missing.path', { optional: true });

    // Then
    assertEquals(res, undefined);
  });

  // ---------------------------------------------------------------------------
  // Hierarchy and fallback
  // ---------------------------------------------------------------------------

  it('falls back to parent when local scope misses', () => {
    // Given
    const rootScope = createScope();
    rootScope.set('api.timeoutMs', 3000);
    const childScope = createScope({ parent: rootScope });

    // When
    const res = childScope.resolve('api.timeoutMs');

    // Then
    assertEquals(res, 3000);
  });

  it('local shadowing overrides parent', () => {
    // Given
    const rootScope = createScope();
    rootScope.set('api.timeoutMs', 3000);
    const childScope = createScope({ parent: rootScope });
    childScope.set('api.timeoutMs', 1000);

    // When
    const res = childScope.resolve('api.timeoutMs');

    // Then
    assertEquals(res, 1000);
  });

  it('multi-level fallback', () => {
    // Given
    const rootScope = createScope();
    rootScope.set('storage.buckets.assets', 'assets-prod');
    const envScope = createScope({ parent: rootScope });
    const userScope = createScope({ parent: envScope });
    const executionScope = createScope({ parent: rootScope });

    // When
    const res = executionScope.resolve('storage.buckets.assets');

    // Then
    assertEquals(res, 'assets-prod');
  });

  it('nearest ancestor wins', () => {
    // Given
    const rootScope = createScope();
    rootScope.set('api.timeoutMs', 5000);
    const envScope = createScope({ parent: rootScope });
    envScope.set('api.timeoutMs', 3000);
    const userScope = createScope({ parent: envScope });
    userScope.set('api.timeoutMs', 1500);
    const executionScope = createScope({ parent: userScope });

    // When
    const res = executionScope.resolve('api.timeoutMs');

    // Then
    assertEquals(res, 1500);
  });

  // ---------------------------------------------------------------------------
  // Dynamic scoping during interpolation
  // ---------------------------------------------------------------------------

  it('parent template uses child override during interpolation', () => {
    // Given
    const rootScope = createScope();
    rootScope.set('api.prefix', '/v1');
    rootScope.set('api.baseUrl', 'https://api.example.com{{api.prefix}}');
    rootScope.set('api.loginUrl', '{{api.baseUrl}}/login');

    const executionScope = createScope({ parent: rootScope });
    executionScope.set('api.prefix', '/test'); // shadows parent's prefix

    // When
    const res = executionScope.resolve('api.loginUrl');

    // Then
    assertEquals(res, 'https://api.example.com/test/login');
  });

  it('parent template uses parent values if child does not override', () => {
    // Given
    const rootScope = createScope();
    rootScope.set('api.prefix', '/v1');
    rootScope.set('api.baseUrl', 'https://api.example.com{{api.prefix}}');
    rootScope.set('api.loginUrl', '{{api.baseUrl}}/login');

    const executionScope = createScope({ parent: rootScope });
    // No child overrides

    // When
    const res = executionScope.resolve('api.loginUrl');

    // Then
    assertEquals(res, 'https://api.example.com/v1/login');
  });

  it('interpolation chain across multiple nested templates', () => {
    // Given
    const rootScope = createScope();
    rootScope.set('app.protocol', 'https');
    rootScope.set('api.host', 'api.example.com');
    rootScope.set('api.baseUrl', '{{app.protocol}}://{{api.host}}');
    rootScope.set('api.loginUrl', '{{api.baseUrl}}/login');

    const executionScope = createScope({ parent: rootScope });

    // When
    const res = executionScope.resolve('api.loginUrl');

    // Then
    assertEquals(res, 'https://api.example.com/login');
  });

  it('child override inside deep interpolation chain', () => {
    // Given
    const rootScope = createScope();
    rootScope.set('app.protocol', 'https');
    rootScope.set('api.host', 'api.example.com');
    rootScope.set('api.baseUrl', '{{app.protocol}}://{{api.host}}');
    rootScope.set('api.loginUrl', '{{api.baseUrl}}/login');

    const executionScope = createScope({ parent: rootScope });
    executionScope.set('api.host', 'localhost:3000'); // deep override

    // When
    const res = executionScope.resolve('api.loginUrl');

    // Then
    assertEquals(res, 'https://localhost:3000/login');
  });

  // ---------------------------------------------------------------------------
  // Path interpolation
  // ---------------------------------------------------------------------------

  it('path containing interpolation', () => {
    // Given
    const rootScope = createScope();
    rootScope.registerStringProtocol('env', (path) => {
      if (path === 'APP_ENV') return 'staging';
      return undefined;
    });

    rootScope.set({
      config: {
        api: {
          production: { url: 'https://api.example.com' },
          staging: { url: 'https://staging-api.example.com' },
        },
      },
    });

    // When
    const res = rootScope.resolve('config.api.{{env:APP_ENV}}.url');

    // Then
    assertEquals(res, 'https://staging-api.example.com');
  });

  it('path interpolation uses scope context, not only root', () => {
    // Given
    const rootScope = createScope();
    rootScope.set('tenant.slug', 'default');
    rootScope.set('config.tenants.default.theme', 'light');

    const userScope = createScope({ parent: rootScope });
    userScope.set('tenant.slug', 'acme');
    userScope.set('config.tenants.acme.theme', 'dark');

    // When
    const res = userScope.resolve('config.tenants.{{tenant.slug}}.theme');

    // Then
    assertEquals(res, 'dark');
  });

  // ---------------------------------------------------------------------------
  // Priority and resolution order
  // ---------------------------------------------------------------------------

  it('priority is local > parent > string protocol', () => {
    // Given
    const rootScope = createScope();
    rootScope.set('env:APP_ENV', 'parent');

    const childScope = createScope({ parent: rootScope });
    childScope.set('env:APP_ENV', 'local');
    childScope.registerStringProtocol('env', () => 'protocol');

    // When (Local exists)
    assertEquals(childScope.resolve('env:APP_ENV'), 'local');

    // When (Local removed, Parent exists)
    childScope.set('env:APP_ENV', undefined); // Remove local shadow
    assertEquals(childScope.resolve('env:APP_ENV'), 'parent');

    // When (Parent removed, Protocol remains)
    rootScope.set('env:APP_ENV', undefined);
    assertEquals(childScope.resolve('env:APP_ENV'), 'protocol');
  });

  it('object protocol runs before generic object traversal', () => {
    // Given
    const scope = createScope();
    scope.registerObjectProtocol(
      (obj) => typeof (obj as any).$join !== 'undefined',
      (obj: any, opts) => {
        const items = opts.context!.resolveValues<string[]>(obj.$join, opts);
        return items.join(obj.sep ?? '');
      },
    );
    scope.set('expr', { $join: ['eu', 'west'], sep: '-' });

    // When
    const res = scope.resolve('expr');

    // Then
    // Returns the processed string, not the raw object
    assertEquals(res, 'eu-west');
  });

  it('string interpolates after source selection', () => {
    // Given
    const scope = createScope();
    scope.registerStringProtocol('configService', (path) => {
      if (path === 'apiUrl') return 'https://{{app.host}}';
      return undefined;
    });
    scope.set('app.host', 'api.example.com');

    // When
    const res = scope.resolve('configService:apiUrl');

    // Then
    assertEquals(res, 'https://api.example.com');
  });
});

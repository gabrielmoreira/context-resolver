import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { createScope } from './scope.js';

describe('scenarios', () => {
  it('app defaults with environment override', () => {
    // Given
    const rootScope = createScope();
    rootScope.set({
      app: { name: 'Retail Portal' },
      api: {
        host: 'api.example.com',
        protocol: 'https',
        baseUrl: '{{api.protocol}}://{{api.host}}',
      },
    });

    const environmentScope = createScope({ parent: rootScope });
    environmentScope.set('api.host', 'staging-api.example.com');

    // When
    const res = environmentScope.resolve('api.baseUrl');

    // Then
    assertEquals(res, 'https://staging-api.example.com');
  });

  it('environment-variable-driven config selection', () => {
    // Given
    const rootScope = createScope();
    rootScope.registerStringProtocol('env', () => 'production');

    rootScope.set({
      services: {
        checkout: {
          production: { url: 'https://checkout.example.com' },
          staging: { url: 'https://staging-checkout.example.com' },
        },
      },
    });

    // When
    const res = rootScope.resolve('services.checkout.{{env:APP_ENV}}.url');

    // Then
    assertEquals(res, 'https://checkout.example.com');
  });

  it('request scope overriding tenant-specific values', () => {
    // Given
    const rootScope = createScope();
    rootScope.set({
      tenants: {
        default: { theme: 'light' },
        acme: { theme: 'dark' },
      },
    });

    const executionScope = createScope({ parent: rootScope });
    executionScope.set('tenant.slug', 'acme');

    // When
    const res = executionScope.resolve('tenants.{{tenant.slug}}.theme');

    // Then
    assertEquals(res, 'dark');
  });

  it('.env-like override loaded into child scope', () => {
    // Given
    const rootScope = createScope();
    rootScope.registerStringProtocol('env', (path) => {
      if (path === 'APP_ENV') return 'production';
      if (path === 'API_HOST') return 'api.example.com';
      return undefined;
    });

    rootScope.set('api.baseUrl', 'https://{{env:API_HOST}}');

    const childScope = createScope({ parent: rootScope });
    childScope.set({
      'env:APP_ENV': 'development',
      'env:API_HOST': 'localhost:3000',
    });

    // When
    const res = childScope.resolve('api.baseUrl');

    // Then
    assertEquals(res, 'https://localhost:3000');
  });

  it('file-backed protocol with structured config', () => {
    // Given
    const scope = createScope();
    scope.registerStringProtocol('file', (path, _opts, { deepGet }) => {
      const fileConfig = {
        services: {
          payments: {
            retries: 5,
          },
        },
      };
      return deepGet(fileConfig, path);
    });

    // When
    const res = scope.resolve('file:services.payments.retries');

    // Then
    assertEquals(res, 5);
  });

  it('secret reference through object protocol', () => {
    // Given
    const scope = createScope();
    scope.registerObjectProtocol(
      (obj) => typeof (obj as any).$secret === 'string',
      () => 'secret-live-abc123',
    );

    scope.set({
      integrations: {
        payments: {
          apiKey: { $secret: 'payments/apiKey' },
        },
      },
    });

    // When
    const res = scope.resolve('integrations.payments.apiKey');

    // Then
    assertEquals(res, 'secret-live-abc123');
  });
});

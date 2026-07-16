import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { AuthResponse, UserProfile } from '@shared/models';
import { AuthService } from './auth';

const user: UserProfile = {
  id: 'u-01',
  email: 'demo@example.com',
  fullName: 'Demo User',
  vatId: 'DE123456789',
  address: { street: 'Main St 1', city: 'Berlin', zip: '10115', country: 'Germany' },
};

const authResponse: AuthResponse = { accessToken: 'token-1', user };

describe('AuthService', () => {
  let auth: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('starts as a guest', () => {
    expect(auth.user()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.accessToken()).toBeNull();
  });

  it('stores the token and user after login', async () => {
    const login = auth.login({ email: user.email, password: 'Demo1234!' });

    const req = httpTesting.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: user.email, password: 'Demo1234!' });
    req.flush(authResponse);
    await login;

    expect(auth.accessToken()).toBe('token-1');
    expect(auth.user()).toEqual(user);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('propagates login failures without authenticating', async () => {
    const login = auth.login({ email: user.email, password: 'wrong' });
    httpTesting
      .expectOne('/api/auth/login')
      .flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    await expect(login).rejects.toThrow();
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.accessToken()).toBeNull();
  });

  it('stores the token and user after register', async () => {
    const register = auth.register({
      email: user.email,
      password: 'Demo1234!',
      fullName: user.fullName,
      vatId: user.vatId,
      address: user.address,
    });
    httpTesting.expectOne('/api/auth/register').flush(authResponse);
    await register;

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.accessToken()).toBe('token-1');
  });

  it('refresh returns true and rotates the token on success', async () => {
    const refresh = auth.refresh();
    httpTesting.expectOne('/api/auth/refresh').flush({ accessToken: 'token-2', user });

    await expect(refresh).resolves.toBe(true);
    expect(auth.accessToken()).toBe('token-2');
    expect(auth.user()).toEqual(user);
  });

  it('refresh returns false and clears state when the session is gone', async () => {
    // Establish a session first so there is state to clear.
    const login = auth.login({ email: user.email, password: 'Demo1234!' });
    httpTesting.expectOne('/api/auth/login').flush(authResponse);
    await login;

    const refresh = auth.refresh();
    httpTesting
      .expectOne('/api/auth/refresh')
      .flush({ message: 'Expired' }, { status: 401, statusText: 'Unauthorized' });

    await expect(refresh).resolves.toBe(false);
    expect(auth.accessToken()).toBeNull();
    expect(auth.user()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('deduplicates concurrent refresh calls into one request', async () => {
    const first = auth.refresh();
    const second = auth.refresh();

    // expectOne throws if more than one request was issued.
    httpTesting.expectOne('/api/auth/refresh').flush({ accessToken: 'token-2', user });

    await expect(first).resolves.toBe(true);
    await expect(second).resolves.toBe(true);
  });

  it('issues a new request for a refresh started after the previous one settled', async () => {
    const first = auth.refresh();
    httpTesting.expectOne('/api/auth/refresh').flush({ accessToken: 'token-2', user });
    await first;

    const second = auth.refresh();
    httpTesting.expectOne('/api/auth/refresh').flush({ accessToken: 'token-3', user });
    await expect(second).resolves.toBe(true);
    expect(auth.accessToken()).toBe('token-3');
  });

  it('logout clears the session', async () => {
    const login = auth.login({ email: user.email, password: 'Demo1234!' });
    httpTesting.expectOne('/api/auth/login').flush(authResponse);
    await login;

    const logout = auth.logout();
    httpTesting.expectOne('/api/auth/logout').flush({});
    await logout;

    expect(auth.accessToken()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('logout clears the client even when the server call fails', async () => {
    const login = auth.login({ email: user.email, password: 'Demo1234!' });
    httpTesting.expectOne('/api/auth/login').flush(authResponse);
    await login;

    const logout = auth.logout();
    httpTesting
      .expectOne('/api/auth/logout')
      .flush({ message: 'Server down' }, { status: 500, statusText: 'Internal Server Error' });
    await logout;

    expect(auth.accessToken()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('restoreSession stays a guest when there is no refresh cookie session', async () => {
    const restore = auth.restoreSession();
    httpTesting
      .expectOne('/api/auth/refresh')
      .flush({ message: 'No session' }, { status: 401, statusText: 'Unauthorized' });
    await restore;

    expect(auth.isAuthenticated()).toBe(false);
  });

  it('setUser updates the in-app session', () => {
    auth.setUser(user);
    expect(auth.user()).toEqual(user);
    expect(auth.isAuthenticated()).toBe(true);
  });
});

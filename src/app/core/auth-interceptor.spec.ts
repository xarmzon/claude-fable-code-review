import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { UserProfile } from '@shared/models';
import { authInterceptor } from './auth-interceptor';
import { AuthService } from './auth';

const user: UserProfile = {
  id: 'u-01',
  email: 'demo@example.com',
  fullName: 'Demo User',
  vatId: 'DE123456789',
  address: { street: 'Main St 1', city: 'Berlin', zip: '10115', country: 'Germany' },
};

/** Lets pending promise callbacks (e.g. the refresh retry) run. */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('authInterceptor', () => {
  let http: HttpClient;
  let auth: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    auth = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  async function logInWith(token: string): Promise<void> {
    const login = auth.login({ email: user.email, password: 'Demo1234!' });
    httpTesting.expectOne('/api/auth/login').flush({ accessToken: token, user });
    await login;
  }

  it('attaches the bearer token to API requests when logged in', async () => {
    await logInWith('token-1');

    http.get('/api/orders').subscribe();
    const req = httpTesting.expectOne('/api/orders');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-1');
    req.flush([]);
  });

  it('does not attach the token to auth endpoints', async () => {
    await logInWith('token-1');

    http.post('/api/auth/logout', {}).subscribe();
    const req = httpTesting.expectOne('/api/auth/logout');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('sends requests without a token when logged out and passes a 401 through', async () => {
    let error: HttpErrorResponse | undefined;
    http.get('/api/orders').subscribe({ error: (e: HttpErrorResponse) => (error = e) });

    const req = httpTesting.expectOne('/api/orders');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    await settle();

    // No refresh attempt is made for guests: verify() in afterEach would
    // fail if a /api/auth/refresh request were left pending.
    expect(error?.status).toBe(401);
  });

  it('refreshes once and retries with the new token on a 401', async () => {
    await logInWith('stale-token');

    let response: unknown;
    http.get('/api/orders').subscribe((body) => (response = body));

    httpTesting
      .expectOne('/api/orders')
      .flush({ message: 'Expired' }, { status: 401, statusText: 'Unauthorized' });

    httpTesting.expectOne('/api/auth/refresh').flush({ accessToken: 'fresh-token', user });
    await settle();

    const retried = httpTesting.expectOne('/api/orders');
    expect(retried.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    retried.flush([{ id: 'o-01' }]);
    await settle();

    expect(response).toEqual([{ id: 'o-01' }]);
  });

  it('propagates the original 401 when the refresh fails', async () => {
    await logInWith('stale-token');

    let error: HttpErrorResponse | undefined;
    http.get('/api/orders').subscribe({ error: (e: HttpErrorResponse) => (error = e) });

    httpTesting
      .expectOne('/api/orders')
      .flush({ message: 'Expired' }, { status: 401, statusText: 'Unauthorized' });
    httpTesting
      .expectOne('/api/auth/refresh')
      .flush({ message: 'Session gone' }, { status: 401, statusText: 'Unauthorized' });
    await settle();

    expect(error?.status).toBe(401);
    expect(error?.url).toContain('/api/orders');
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('does not try to refresh on non-401 errors', async () => {
    await logInWith('token-1');

    let error: HttpErrorResponse | undefined;
    http.get('/api/orders').subscribe({ error: (e: HttpErrorResponse) => (error = e) });

    httpTesting
      .expectOne('/api/orders')
      .flush({ message: 'Boom' }, { status: 500, statusText: 'Internal Server Error' });
    await settle();

    expect(error?.status).toBe(500);
    // Still authenticated; no refresh request was issued (verify() would catch one).
    expect(auth.accessToken()).toBe('token-1');
  });
});

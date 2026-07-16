import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import {
  Router,
  provideRouter,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
  type UrlTree,
} from '@angular/router';
import type { UserProfile } from '@shared/models';
import { authGuard, guestOnlyGuard } from './auth-guards';
import { AuthService } from './auth';

const user: UserProfile = {
  id: 'u-01',
  email: 'demo@example.com',
  fullName: 'Demo User',
  vatId: 'DE123456789',
  address: { street: 'Main St 1', city: 'Berlin', zip: '10115', country: 'Germany' },
};

const route = {} as ActivatedRouteSnapshot;
const stateFor = (url: string) => ({ url }) as RouterStateSnapshot;

describe('auth guards', () => {
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  describe('authGuard', () => {
    it('allows authenticated users through', () => {
      auth.setUser(user);
      const result = TestBed.runInInjectionContext(() => authGuard(route, stateFor('/dashboard')));
      expect(result).toBe(true);
    });

    it('redirects guests to /login and preserves the return URL', () => {
      const result = TestBed.runInInjectionContext(() => authGuard(route, stateFor('/dashboard')));
      expect(router.serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fdashboard');
    });
  });

  describe('guestOnlyGuard', () => {
    it('allows guests through', () => {
      const result = TestBed.runInInjectionContext(() => guestOnlyGuard(route, stateFor('/login')));
      expect(result).toBe(true);
    });

    it('redirects authenticated users to the dashboard', () => {
      auth.setUser(user);
      const result = TestBed.runInInjectionContext(() => guestOnlyGuard(route, stateFor('/login')));
      expect(router.serializeUrl(result as UrlTree)).toBe('/dashboard');
    });
  });
});

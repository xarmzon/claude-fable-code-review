import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import type { UserProfile } from '@shared/models';
import { LoginPage } from './login-page';

const user: UserProfile = {
  id: 'u-01',
  email: 'demo@example.com',
  fullName: 'Demo User',
  vatId: 'DE123456789',
  address: { street: 'Main St 1', city: 'Berlin', zip: '10115', country: 'Germany' },
};

const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let httpTesting: HttpTestingController;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    navigateByUrl = vi
      .spyOn(TestBed.inject(Router), 'navigateByUrl')
      .mockResolvedValue(true);

    fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();
  });

  afterEach(() => {
    httpTesting.verify();
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function type(selector: string, value: string): void {
    const input = element().querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function submitForm(): Promise<void> {
    element()
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  }

  it('renders email and password fields', () => {
    expect(element().querySelector('#login-email')).toBeTruthy();
    expect(element().querySelector('#login-password')).toBeTruthy();
  });

  it('shows validation errors instead of submitting an empty form', async () => {
    await submitForm();

    expect(element().querySelector('#login-email-error')?.textContent).toContain(
      'Email is required',
    );
    expect(element().querySelector('#login-password-error')?.textContent).toContain(
      'Password is required',
    );
    // No login request was made (verify() in afterEach would also catch it).
    httpTesting.expectNone('/api/auth/login');
  });

  it('rejects a malformed email address', async () => {
    type('#login-email', 'not-an-email');
    type('#login-password', 'Demo1234!');
    await submitForm();

    expect(element().querySelector('#login-email-error')?.textContent).toContain(
      'Enter a valid email address',
    );
    httpTesting.expectNone('/api/auth/login');
  });

  it('logs in and navigates to the dashboard by default', async () => {
    type('#login-email', 'demo@example.com');
    type('#login-password', 'Demo1234!');
    await submitForm();

    const req = httpTesting.expectOne('/api/auth/login');
    expect(req.request.body).toEqual({ email: 'demo@example.com', password: 'Demo1234!' });
    req.flush({ accessToken: 'token-1', user });
    await settle();

    expect(navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('navigates to the returnUrl after login when one is provided', async () => {
    fixture.componentRef.setInput('returnUrl', '/checkout');
    await fixture.whenStable();

    type('#login-email', 'demo@example.com');
    type('#login-password', 'Demo1234!');
    await submitForm();

    httpTesting.expectOne('/api/auth/login').flush({ accessToken: 'token-1', user });
    await settle();

    expect(navigateByUrl).toHaveBeenCalledWith('/checkout');
  });

  it('shows a generic error on failed login and re-enables the form', async () => {
    type('#login-email', 'demo@example.com');
    type('#login-password', 'wrong-password');
    await submitForm();

    httpTesting
      .expectOne('/api/auth/login')
      .flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });
    await settle();
    await fixture.whenStable();

    const alert = element().querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Invalid email or password.');
    expect(element().querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(
      false,
    );
    expect(navigateByUrl).not.toHaveBeenCalled();
  });
});

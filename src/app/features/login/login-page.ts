import { Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { email, form, required, submit, FormField } from '@angular/forms/signals';
import { AuthService } from '../../core/auth';
import { fieldErrorText, fieldInvalid } from '../../shared/forms/field-utils';

@Component({
  selector: 'app-login-page',
  imports: [FormField],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  /** Bound from the query string via withComponentInputBinding (FR-4.3). */
  readonly returnUrl = input<string>();

  readonly #auth = inject(AuthService);
  readonly #router = inject(Router);

  readonly #model = signal({ email: '', password: '' });

  protected readonly loginForm = form(this.#model, (path) => {
    required(path.email, { message: 'Email is required' });
    email(path.email, { message: 'Enter a valid email address' });
    required(path.password, { message: 'Password is required' });
  });

  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected readonly invalid = fieldInvalid;
  protected readonly errorText = fieldErrorText;

  protected onSubmit(): void {
    submit(this.loginForm, async () => {
      this.busy.set(true);
      this.error.set('');
      try {
        await this.#auth.login(this.#model());
        await this.#router.navigateByUrl(this.returnUrl() || '/dashboard');
      } catch {
        // Deliberately generic — no account enumeration (FR-4.2).
        this.error.set('Invalid email or password.');
      } finally {
        this.busy.set(false);
      }
    });
  }
}

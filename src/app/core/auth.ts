import { computed, inject, signal, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { AuthResponse, LoginRequest, RegisterRequest, UserProfile } from '@shared/models';

@Service()
export class AuthService {
  readonly #http = inject(HttpClient);

  // Held in memory only — never written to web storage (FR-6.2).
  #accessToken: string | null = null;
  #refreshInFlight: Promise<boolean> | null = null;

  readonly #user = signal<UserProfile | null>(null);
  readonly user = this.#user.asReadonly();
  readonly isAuthenticated = computed(() => this.#user() !== null);

  accessToken(): string | null {
    return this.#accessToken;
  }

  /** Silently restores the session from the refresh cookie on app startup; no-op for guests. */
  async restoreSession(): Promise<void> {
    await this.refresh();
  }

  async login(credentials: LoginRequest): Promise<void> {
    this.#apply(
      await firstValueFrom(this.#http.post<AuthResponse>('/api/auth/login', credentials)),
    );
  }

  async register(request: RegisterRequest): Promise<void> {
    this.#apply(await firstValueFrom(this.#http.post<AuthResponse>('/api/auth/register', request)));
  }

  /** Rotates the refresh token; returns false (and clears state) if the session is gone. */
  refresh(): Promise<boolean> {
    this.#refreshInFlight ??= (async () => {
      try {
        this.#apply(await firstValueFrom(this.#http.post<AuthResponse>('/api/auth/refresh', {})));
        return true;
      } catch {
        this.#clear();
        return false;
      } finally {
        this.#refreshInFlight = null;
      }
    })();
    return this.#refreshInFlight;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.#http.post('/api/auth/logout', {}));
    } catch {
      // Server-side invalidation is best-effort; always clear the client.
    } finally {
      this.#clear();
    }
  }

  /** Updates the in-app session after a profile change (FR-5.3). */
  setUser(user: UserProfile): void {
    this.#user.set(user);
  }

  #apply(response: AuthResponse): void {
    this.#accessToken = response.accessToken;
    this.#user.set(response.user);
  }

  #clear(): void {
    this.#accessToken = null;
    this.#user.set(null);
  }
}

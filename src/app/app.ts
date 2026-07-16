import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth';
import { CartStore } from './core/cart-store';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly cart = inject(CartStore);
  protected readonly main = viewChild.required<ElementRef<HTMLElement>>('main');
  
  #firstNavigation = true;
  readonly #router = inject(Router);

  constructor() {
    // Move focus to the main landmark after route changes so screen-reader
    // and keyboard users land on the new content (skip the initial load).
    this.#router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (this.#firstNavigation) {
          this.#firstNavigation = false;
          return;
        }
        this.main().nativeElement.focus();
      });
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.#router.navigateByUrl('/');
  }
}

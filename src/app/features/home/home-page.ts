import { Component, effect, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import type { Product, ProductSort } from '@shared/models';
import { CartStore } from '../../core/cart-store';

const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-home-page',
  imports: [CurrencyPipe],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  readonly #cart = inject(CartStore);

  protected readonly query = signal('');
  protected readonly sort = signal<ProductSort>('name');
  readonly #debouncedQuery = signal('');

  protected readonly products = httpResource<Product[]>(
    () => ({
      url: '/api/products',
      params: { q: this.#debouncedQuery(), sort: this.sort() },
    }),
    { defaultValue: [] },
  );

  /** Announced politely to screen readers when the cart changes. */
  protected readonly announcement = signal('');

  constructor() {
    effect((onCleanup) => {
      const query = this.query();
      const timer = setTimeout(() => this.#debouncedQuery.set(query), SEARCH_DEBOUNCE_MS);
      onCleanup(() => clearTimeout(timer));
    });
  }

  protected onSearchInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected onSortChange(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as ProductSort);
  }

  protected addToCart(product: Product): void {
    this.#cart.add(product);
    this.announcement.set(`${product.name} added to cart.`);
  }

  protected artHue(product: Product): number {
    let hash = 0;
    for (const char of product.id) {
      hash = (hash * 31 + char.charCodeAt(0)) % 360;
    }
    return hash;
  }
}

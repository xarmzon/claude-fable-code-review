import { computed, effect, signal, Service } from '@angular/core';
import type { Product } from '@shared/models';

export interface CartItem {
  product: Product;
  quantity: number;
}

const STORAGE_KEY = 'fable-shop.cart';

@Service()
export class CartStore {
  readonly #items = signal<CartItem[]>(loadFromStorage());
  readonly items = this.#items.asReadonly();

  readonly count = computed(() => this.#items().reduce((sum, item) => sum + item.quantity, 0));
  readonly subtotal = computed(() =>
    roundMoney(this.#items().reduce((sum, item) => sum + item.product.price * item.quantity, 0)),
  );
  readonly isEmpty = computed(() => this.#items().length === 0);

  constructor() {
    // Persist across reloads (FR-2.5).
    effect(() => {
      const items = this.#items();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {
        // Storage may be unavailable (private mode, quota); the cart still works in memory.
      }
    });
  }

  add(product: Product, quantity = 1): void {
    this.#items.update((items) => {
      const existing = items.find((item) => item.product.id === product.id);
      if (existing) {
        return items.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item,
        );
      }
      return [...items, { product, quantity }];
    });
  }

  setQuantity(productId: string, quantity: number): void {
    const normalized = Math.max(1, Math.floor(Number.isFinite(quantity) ? quantity : 1));
    this.#items.update((items) =>
      items.map((item) =>
        item.product.id === productId ? { ...item, quantity: normalized } : item,
      ),
    );
  }

  remove(productId: string): void {
    this.#items.update((items) => items.filter((item) => item.product.id !== productId));
  }

  clear(): void {
    this.#items.set([]);
  }
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function loadFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isCartItem);
  } catch {
    return [];
  }
}

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const item = value as { product?: unknown; quantity?: unknown };
  const product = item.product as { id?: unknown; price?: unknown } | undefined;
  return (
    typeof item.quantity === 'number' &&
    item.quantity >= 1 &&
    typeof product === 'object' &&
    product !== null &&
    typeof product.id === 'string' &&
    typeof product.price === 'number'
  );
}

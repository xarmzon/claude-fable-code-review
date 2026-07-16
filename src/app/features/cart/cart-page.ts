import { Component, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartStore, type CartItem } from '../../core/cart-store';

@Component({
  selector: 'app-cart-page',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './cart-page.html',
  styleUrl: './cart-page.scss',
})
export class CartPage {
  protected readonly cart = inject(CartStore);

  protected lineTotal(item: CartItem): number {
    return Math.round(item.product.price * item.quantity * 100) / 100;
  }

  protected increment(item: CartItem): void {
    this.cart.setQuantity(item.product.id, item.quantity + 1);
  }

  protected decrement(item: CartItem): void {
    this.cart.setQuantity(item.product.id, item.quantity - 1);
  }

  protected onQuantityChange(item: CartItem, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.cart.setQuantity(item.product.id, input.valueAsNumber);
    // Reflect clamping (e.g. "0" → 1) back into the input even when the signal is unchanged.
    const current = this.cart.items().find((i) => i.product.id === item.product.id);
    if (current) {
      input.value = String(current.quantity);
    }
  }
}

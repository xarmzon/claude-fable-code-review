import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import {
  apply,
  applyWhen,
  form,
  minLength,
  required,
  submit,
  FormField,
} from '@angular/forms/signals';
import { MIN_PASSWORD_LENGTH, type DeliveryAddress, type Order } from '@shared/models';
import { AuthService } from '../../core/auth';
import { CartStore } from '../../core/cart-store';
import { OrdersApi } from '../../core/orders-api';
import { AddressFields } from '../../shared/forms/address-fields';
import { fieldErrorText, fieldInvalid } from '../../shared/forms/field-utils';
import { addressSchema, customerSchema, type CustomerDetails } from '../../shared/forms/schemas';

interface CheckoutModel {
  customer: CustomerDetails;
  address: DeliveryAddress;
  createAccount: boolean;
  password: string;
}

@Component({
  selector: 'app-checkout-page',
  imports: [CurrencyPipe, RouterLink, FormField, AddressFields],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.scss',
})
export class CheckoutPage {
  protected readonly cart = inject(CartStore);
  protected readonly auth = inject(AuthService);
  readonly #ordersApi = inject(OrdersApi);
  readonly #router = inject(Router);

  // Prefilled from the profile when logged in (FR-3.6).
  readonly #model = signal<CheckoutModel>(initialModel(this.auth));

  protected readonly checkoutForm = form(this.#model, (path) => {
    apply(path.customer, customerSchema);
    apply(path.address, addressSchema);
    applyWhen(
      path.password,
      ({ valueOf }) => valueOf(path.createAccount),
      (password) => {
        required(password, { message: 'A password is required to create an account' });
        minLength(password, MIN_PASSWORD_LENGTH, {
          message: `The password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        });
      },
    );
  });

  protected readonly busy = signal(false);
  protected readonly submitError = signal('');
  protected readonly confirmedOrder = signal<Order | null>(null);

  protected readonly invalid = fieldInvalid;
  protected readonly errorText = fieldErrorText;

  protected onSubmit(): void {
    submit(this.checkoutForm, async () => {
      this.busy.set(true);
      this.submitError.set('');
      const model = this.#model();
      const items = this.cart
        .items()
        .map(({ product, quantity }) => ({ productId: product.id, quantity }));
      try {
        if (!this.auth.isAuthenticated() && model.createAccount) {
          await this.auth.register({
            email: model.customer.email,
            password: model.password,
            fullName: model.customer.fullName,
            vatId: model.customer.vatId,
            address: model.address,
          });
        }
        const order = await this.#ordersApi.placeOrder({
          customer: model.customer,
          address: model.address,
          items,
        });
        this.cart.clear();
        if (this.auth.isAuthenticated()) {
          await this.#router.navigateByUrl('/dashboard');
        } else {
          this.confirmedOrder.set(order);
        }
      } catch (error) {
        this.submitError.set(messageFrom(error));
      } finally {
        this.busy.set(false);
      }
    });
  }
}

function initialModel(auth: AuthService): CheckoutModel {
  const user = auth.user();
  return {
    customer: {
      fullName: user?.fullName ?? '',
      email: user?.email ?? '',
      vatId: user?.vatId ?? '',
    },
    address: {
      street: user?.address.street ?? '',
      city: user?.address.city ?? '',
      zip: user?.address.zip ?? '',
      country: user?.address.country ?? '',
    },
    createAccount: false,
    password: '',
  };
}

function messageFrom(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: string } | null;
    if (body && typeof body.message === 'string') {
      return body.message;
    }
  }
  return 'Something went wrong while placing your order. Please try again.';
}

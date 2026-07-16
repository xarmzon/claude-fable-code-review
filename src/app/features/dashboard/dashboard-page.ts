import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { apply, form, submit, FormField } from '@angular/forms/signals';
import type { DeliveryAddress, Order } from '@shared/models';
import { AuthService } from '../../core/auth';
import { OrdersApi } from '../../core/orders-api';
import { AddressFields } from '../../shared/forms/address-fields';
import { fieldErrorText, fieldInvalid } from '../../shared/forms/field-utils';
import { addressSchema, customerSchema, type CustomerDetails } from '../../shared/forms/schemas';

interface ProfileModel {
  customer: CustomerDetails;
  address: DeliveryAddress;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [CurrencyPipe, DatePipe, FormField, AddressFields],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  protected readonly auth = inject(AuthService);
  readonly #api = inject(OrdersApi);

  protected readonly orders = httpResource<Order[]>(() => '/api/orders', { defaultValue: [] });

  readonly #model = signal<ProfileModel>(profileModelFrom(this.auth));

  protected readonly profileForm = form(this.#model, (path) => {
    apply(path.customer, customerSchema);
    apply(path.address, addressSchema);
  });

  protected readonly busy = signal(false);
  protected readonly saveError = signal('');
  protected readonly saved = signal(false);

  protected readonly invalid = fieldInvalid;
  protected readonly errorText = fieldErrorText;

  protected onSubmit(): void {
    submit(this.profileForm, async () => {
      this.busy.set(true);
      this.saveError.set('');
      this.saved.set(false);
      const model = this.#model();
      try {
        const updated = await this.#api.updateProfile({
          email: model.customer.email,
          fullName: model.customer.fullName,
          vatId: model.customer.vatId,
          address: model.address,
        });
        // Keep the in-app session in sync right away (FR-5.3).
        this.auth.setUser(updated);
        this.saved.set(true);
      } catch (error) {
        this.saveError.set(saveMessageFrom(error));
      } finally {
        this.busy.set(false);
      }
    });
  }
}

function profileModelFrom(auth: AuthService): ProfileModel {
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
  };
}

function saveMessageFrom(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: string } | null;
    if (body && typeof body.message === 'string') {
      return body.message;
    }
  }
  return 'Could not save your profile. Please try again.';
}

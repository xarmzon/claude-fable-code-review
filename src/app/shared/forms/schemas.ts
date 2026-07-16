import { email, required, schema, validate } from '@angular/forms/signals';
import type { DeliveryAddress } from '@shared/models';
import { isValidVatId } from './vat';

export interface CustomerDetails {
  fullName: string;
  email: string;
  vatId: string;
}

/** Delivery-address validation, shared by checkout and the dashboard (FR-3.4). */
export const addressSchema = schema<DeliveryAddress>((path) => {
  required(path.street, { message: 'Street is required' });
  required(path.city, { message: 'City is required' });
  required(path.zip, { message: 'ZIP code is required' });
  required(path.country, { message: 'Country is required' });
});

/** Contact + VAT validation, shared by checkout and the dashboard profile form. */
export const customerSchema = schema<CustomerDetails>((path) => {
  required(path.fullName, { message: 'Full name is required' });
  required(path.email, { message: 'Email is required' });
  email(path.email, { message: 'Enter a valid email address' });
  required(path.vatId, { message: 'VAT ID is required' });
  validate(path.vatId, ({ value }) =>
    value() === '' || isValidVatId(value())
      ? undefined
      : { kind: 'vatId', message: 'Enter a valid EU VAT ID, e.g. DE123456789' },
  );
});

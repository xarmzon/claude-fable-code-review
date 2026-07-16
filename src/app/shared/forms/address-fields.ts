import { Component, input } from '@angular/core';
import { FormField, type FieldTree } from '@angular/forms/signals';
import type { DeliveryAddress } from '@shared/models';
import { fieldErrorText, fieldInvalid } from './field-utils';

/** Reusable delivery-address sub-form, shared by checkout and the dashboard (FR-3.4). */
@Component({
  selector: 'app-address-fields',
  imports: [FormField],
  templateUrl: './address-fields.html',
})
export class AddressFields {
  readonly address = input.required<FieldTree<DeliveryAddress>>();
  /** Prefix for control ids, so two instances on one page never collide. */
  readonly idPrefix = input('address');

  protected readonly invalid = fieldInvalid;
  protected readonly errorText = fieldErrorText;
}

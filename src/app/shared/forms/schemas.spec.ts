import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import type { DeliveryAddress } from '@shared/models';
import { addressSchema, customerSchema, type CustomerDetails } from './schemas';

const validCustomer: CustomerDetails = {
  fullName: 'Demo User',
  email: 'demo@example.com',
  vatId: 'DE123456789',
};

const validAddress: DeliveryAddress = {
  street: 'Main St 1',
  city: 'Berlin',
  zip: '10115',
  country: 'Germany',
};

function customerForm(initial: CustomerDetails) {
  return TestBed.runInInjectionContext(() => form(signal(initial), customerSchema));
}

function addressForm(initial: DeliveryAddress) {
  return TestBed.runInInjectionContext(() => form(signal(initial), addressSchema));
}

describe('customerSchema', () => {
  it('accepts complete, valid details', () => {
    const f = customerForm(validCustomer);
    expect(f().valid()).toBe(true);
  });

  it('requires every field', () => {
    const f = customerForm({ fullName: '', email: '', vatId: '' });
    expect(f.fullName().errors().map((e) => e.message)).toEqual(['Full name is required']);
    expect(f.email().errors().map((e) => e.message)).toEqual(['Email is required']);
    expect(f.vatId().errors().map((e) => e.message)).toEqual(['VAT ID is required']);
    expect(f().invalid()).toBe(true);
  });

  it('rejects a malformed email', () => {
    const f = customerForm({ ...validCustomer, email: 'not-an-email' });
    expect(f.email().errors().map((e) => e.message)).toEqual(['Enter a valid email address']);
  });

  it('rejects a malformed VAT ID with a hint', () => {
    const f = customerForm({ ...validCustomer, vatId: 'DE1' });
    const errors = f.vatId().errors();
    expect(errors.length).toBe(1);
    expect(errors[0].kind).toBe('vatId');
    expect(errors[0].message).toBe('Enter a valid EU VAT ID, e.g. DE123456789');
  });

  it('does not double-report an empty VAT ID as malformed', () => {
    const f = customerForm({ ...validCustomer, vatId: '' });
    expect(f.vatId().errors().map((e) => e.message)).toEqual(['VAT ID is required']);
  });

  it('recovers once the value is corrected', () => {
    const f = customerForm({ ...validCustomer, vatId: 'DE1' });
    expect(f.vatId().invalid()).toBe(true);

    f.vatId().value.set('DE123456789');
    expect(f.vatId().valid()).toBe(true);
    expect(f().valid()).toBe(true);
  });
});

describe('addressSchema', () => {
  it('accepts a complete address', () => {
    const f = addressForm(validAddress);
    expect(f().valid()).toBe(true);
  });

  it('requires street, city, zip, and country', () => {
    const f = addressForm({ street: '', city: '', zip: '', country: '' });
    expect(f.street().errors().map((e) => e.message)).toEqual(['Street is required']);
    expect(f.city().errors().map((e) => e.message)).toEqual(['City is required']);
    expect(f.zip().errors().map((e) => e.message)).toEqual(['ZIP code is required']);
    expect(f.country().errors().map((e) => e.message)).toEqual(['Country is required']);
  });
});

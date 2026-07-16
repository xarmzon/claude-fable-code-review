import { isValidVatId } from './vat';

describe('isValidVatId', () => {
  it('accepts a standard German VAT ID', () => {
    expect(isValidVatId('DE123456789')).toBe(true);
  });

  it('accepts other EU shapes with letters in the suffix', () => {
    expect(isValidVatId('ATU12345678')).toBe(true);
    expect(isValidVatId('NL123456789B01')).toBe(true);
    expect(isValidVatId('IE1234567T')).toBe(true);
  });

  it('accepts the minimum suffix length of 2', () => {
    expect(isValidVatId('FR12')).toBe(true);
  });

  it('accepts the maximum suffix length of 12', () => {
    expect(isValidVatId('FR123456789012')).toBe(true);
  });

  it('rejects a plain number', () => {
    expect(isValidVatId('123')).toBe(false);
  });

  it('rejects lowercase country codes', () => {
    expect(isValidVatId('de123456789')).toBe(false);
  });

  it('rejects a suffix that is too short', () => {
    expect(isValidVatId('DE1')).toBe(false);
  });

  it('rejects a suffix that is too long', () => {
    expect(isValidVatId('DE1234567890123')).toBe(false);
  });

  it('rejects the empty string and whitespace', () => {
    expect(isValidVatId('')).toBe(false);
    expect(isValidVatId('DE 123456789')).toBe(false);
  });

  it('rejects special characters in the suffix', () => {
    expect(isValidVatId('DE12345-789')).toBe(false);
  });
});

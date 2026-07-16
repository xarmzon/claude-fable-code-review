import { VAT_ID_PATTERN } from '@shared/models';

/** Validates the generic EU VAT ID shape (FR-3.2), e.g. `DE123456789`. */
export function isValidVatId(value: string): boolean {
  return VAT_ID_PATTERN.test(value);
}

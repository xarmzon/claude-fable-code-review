import type { FieldTree } from '@angular/forms/signals';

/** True once the user has touched the field and it is invalid — when to reveal errors. */
export function fieldInvalid<T>(field: FieldTree<T>): boolean {
  const state = field();
  return state.touched() && state.invalid();
}

export function fieldErrorText<T>(field: FieldTree<T>): string {
  return field()
    .errors()
    .map((error) => error.message ?? 'This value is invalid.')
    .join(' ');
}

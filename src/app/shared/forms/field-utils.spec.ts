import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, minLength, required, validate } from '@angular/forms/signals';
import { fieldErrorText, fieldInvalid } from './field-utils';

function nameForm(initial: string) {
  return TestBed.runInInjectionContext(() =>
    form(signal({ name: initial }), (path) => {
      required(path.name, { message: 'Name is required' });
      minLength(path.name, 3, { message: 'Name is too short' });
      validate(path.name, ({ value }) =>
        value().startsWith('x') ? { kind: 'starts-with-x', message: 'No x names' } : undefined,
      );
    }),
  );
}

describe('fieldInvalid', () => {
  it('stays false for an invalid but untouched field', () => {
    const f = nameForm('');
    expect(f.name().invalid()).toBe(true);
    expect(fieldInvalid(f.name)).toBe(false);
  });

  it('becomes true once an invalid field is touched', () => {
    const f = nameForm('');
    f.name().markAsTouched();
    expect(fieldInvalid(f.name)).toBe(true);
  });

  it('stays false for a touched but valid field', () => {
    const f = nameForm('Ada');
    f.name().markAsTouched();
    expect(fieldInvalid(f.name)).toBe(false);
  });
});

describe('fieldErrorText', () => {
  it('returns the error message', () => {
    const f = nameForm('Ada Lovelace');
    f.name().value.set('');
    expect(fieldErrorText(f.name)).toContain('Name is required');
  });

  it('joins multiple error messages with a space', () => {
    // 'xy' is both too short and starts with x.
    const f = nameForm('xy');
    expect(fieldErrorText(f.name)).toBe('Name is too short No x names');
  });

  it('returns an empty string for a valid field', () => {
    const f = nameForm('Ada');
    expect(fieldErrorText(f.name)).toBe('');
  });
});

import { TestBed } from '@angular/core/testing';
import type { Product } from '@shared/models';
import { CartStore } from './cart-store';

const lamp: Product = { id: 'p-01', name: 'Lamp', description: 'A lamp', price: 49.9 };
const mug: Product = { id: 'p-02', name: 'Mug', description: 'A mug', price: 18.5 };

describe('CartStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts empty', () => {
    const store = TestBed.inject(CartStore);
    expect(store.items()).toEqual([]);
    expect(store.count()).toBe(0);
    expect(store.subtotal()).toBe(0);
    expect(store.isEmpty()).toBe(true);
  });

  it('adds products and increments quantity for an existing product', () => {
    const store = TestBed.inject(CartStore);
    store.add(lamp);
    store.add(mug, 2);
    store.add(lamp);

    expect(store.items().length).toBe(2);
    expect(store.items()[0].quantity).toBe(2);
    expect(store.items()[1].quantity).toBe(2);
    expect(store.count()).toBe(4);
  });

  it('computes the subtotal with money rounding', () => {
    const store = TestBed.inject(CartStore);
    store.add(lamp, 3); // 149.70000000000002 unrounded
    expect(store.subtotal()).toBe(149.7);
  });

  it('updates quantity and clamps it to a minimum of 1', () => {
    const store = TestBed.inject(CartStore);
    store.add(lamp, 2);

    store.setQuantity(lamp.id, 5);
    expect(store.items()[0].quantity).toBe(5);

    store.setQuantity(lamp.id, 0);
    expect(store.items()[0].quantity).toBe(1);

    store.setQuantity(lamp.id, Number.NaN);
    expect(store.items()[0].quantity).toBe(1);

    store.setQuantity(lamp.id, 2.7);
    expect(store.items()[0].quantity).toBe(2);
  });

  it('removes items and clears the cart', () => {
    const store = TestBed.inject(CartStore);
    store.add(lamp);
    store.add(mug);

    store.remove(lamp.id);
    expect(store.items().map((i) => i.product.id)).toEqual([mug.id]);

    store.clear();
    expect(store.isEmpty()).toBe(true);
  });

  it('persists to localStorage and restores from it', () => {
    const store = TestBed.inject(CartStore);
    store.add(lamp, 2);
    TestBed.tick(); // flush the persistence effect

    const raw = localStorage.getItem('fable-shop.cart');
    expect(raw).toBeTruthy();

    // A fresh injector simulates a page reload.
    TestBed.resetTestingModule();
    const restored = TestBed.inject(CartStore);
    expect(restored.items().length).toBe(1);
    expect(restored.items()[0].product.id).toBe(lamp.id);
    expect(restored.items()[0].quantity).toBe(2);
  });

  it('ignores corrupted localStorage payloads', () => {
    localStorage.setItem('fable-shop.cart', '{not json');
    const store = TestBed.inject(CartStore);
    expect(store.items()).toEqual([]);
  });
});

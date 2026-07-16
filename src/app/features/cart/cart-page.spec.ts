import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Product } from '@shared/models';
import { CartStore } from '../../core/cart-store';
import { CartPage } from './cart-page';

const lamp: Product = { id: 'p-01', name: 'Lamp', description: 'A lamp', price: 49.9 };
const mug: Product = { id: 'p-02', name: 'Mug', description: 'A mug', price: 18.5 };

describe('CartPage', () => {
  let fixture: ComponentFixture<CartPage>;
  let cart: CartStore;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [CartPage],
      providers: [provideRouter([])],
    }).compileComponents();

    cart = TestBed.inject(CartStore);
    fixture = TestBed.createComponent(CartPage);
    await fixture.whenStable();
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function buttonLabeled(label: string): HTMLButtonElement {
    return element().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
  }

  it('shows the empty state when the cart is empty', () => {
    expect(element().querySelector('.empty-state')?.textContent).toContain('Your cart is empty');
    expect(element().querySelector('.cart-table')).toBeNull();
  });

  it('renders one row per item with rounded line totals', async () => {
    cart.add(lamp, 3); // 3 × 49.90 = 149.70000000000002 unrounded
    cart.add(mug);
    await fixture.whenStable();

    const rows = element().querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Lamp');
    expect(rows[0].textContent).toContain('149.70');
    expect(element().querySelector('.cart-summary__total')?.textContent).toContain('168.20');
  });

  it('increments and decrements quantities via the stepper buttons', async () => {
    cart.add(lamp);
    await fixture.whenStable();

    buttonLabeled('Increase quantity of Lamp').click();
    expect(cart.items()[0].quantity).toBe(2);
    await fixture.whenStable();

    buttonLabeled('Decrease quantity of Lamp').click();
    expect(cart.items()[0].quantity).toBe(1);
  });

  it('disables the decrement button at quantity 1', async () => {
    cart.add(lamp);
    await fixture.whenStable();
    expect(buttonLabeled('Decrease quantity of Lamp').disabled).toBe(true);

    cart.setQuantity(lamp.id, 2);
    await fixture.whenStable();
    expect(buttonLabeled('Decrease quantity of Lamp').disabled).toBe(false);
  });

  it('clamps a typed quantity below 1 and reflects it back into the input', async () => {
    cart.add(lamp, 2);
    await fixture.whenStable();

    const input = element().querySelector<HTMLInputElement>('input[type="number"]')!;
    input.value = '0';
    input.dispatchEvent(new Event('change'));

    expect(cart.items()[0].quantity).toBe(1);
    expect(input.value).toBe('1');
  });

  it('removes an item via its remove button', async () => {
    cart.add(lamp);
    cart.add(mug);
    await fixture.whenStable();

    buttonLabeled('Remove Lamp from cart').click();
    await fixture.whenStable();

    expect(cart.items().map((i) => i.product.id)).toEqual([mug.id]);
    expect(element().querySelectorAll('tbody tr').length).toBe(1);
  });
});

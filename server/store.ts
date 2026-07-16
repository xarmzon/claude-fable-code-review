import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import type { DeliveryAddress, Order, Product, UserProfile } from '../shared/models';

export interface UserRecord extends UserProfile {
  passwordHash: string;
}

export interface OrderRecord extends Order {
  userId?: string;
  guestEmail?: string;
}

export interface RefreshSession {
  userId: string;
  expiresAt: number;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) {
    return false;
  }
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export const products: Product[] = [
  {
    id: 'p-01',
    name: 'Aurora Desk Lamp',
    description: 'Warm LED lamp with three brightness levels and a walnut base.',
    price: 49.9,
  },
  {
    id: 'p-02',
    name: 'Nimbus Ceramic Mug',
    description: 'Hand-glazed 350 ml mug that keeps coffee hot a little longer.',
    price: 18.5,
  },
  {
    id: 'p-03',
    name: 'Drift Notebook A5',
    description: 'Dot-grid notebook with 160 pages of fountain-pen friendly paper.',
    price: 12.0,
  },
  {
    id: 'p-04',
    name: 'Ember Throw Blanket',
    description: 'Recycled-wool blanket in a burnt-orange herringbone weave.',
    price: 79.0,
  },
  {
    id: 'p-05',
    name: 'Quill Fountain Pen',
    description: 'Brushed steel fountain pen with a smooth medium nib.',
    price: 64.0,
  },
  {
    id: 'p-06',
    name: 'Terra Plant Pot',
    description: 'Terracotta pot with drainage tray, sized for herbs and succulents.',
    price: 22.5,
  },
  {
    id: 'p-07',
    name: 'Echo Bluetooth Speaker',
    description: 'Pocket speaker with surprisingly deep bass and 12 h battery.',
    price: 89.9,
  },
  {
    id: 'p-08',
    name: 'Fjord Water Bottle',
    description: 'Insulated 750 ml steel bottle, keeps drinks cold for 24 hours.',
    price: 29.0,
  },
  {
    id: 'p-09',
    name: 'Loom Canvas Tote',
    description: 'Heavy-duty canvas tote with an internal zip pocket.',
    price: 24.0,
  },
  {
    id: 'p-10',
    name: 'Halo Desk Organizer',
    description: 'Modular bamboo organizer for pens, cables, and sticky notes.',
    price: 34.5,
  },
  {
    id: 'p-11',
    name: 'Pico Travel Adapter',
    description: 'Universal adapter with two USB-C ports and a compact fold.',
    price: 39.0,
  },
  {
    id: 'p-12',
    name: 'Sable Wireless Mouse',
    description: 'Silent-click ergonomic mouse with adjustable DPI.',
    price: 45.0,
  },
];

export const users = new Map<string, UserRecord>();
export const refreshSessions = new Map<string, RefreshSession>();
export const orders: OrderRecord[] = [];

export function findUserByEmail(email: string): UserRecord | undefined {
  const normalized = email.trim().toLowerCase();
  for (const user of users.values()) {
    if (user.email.toLowerCase() === normalized) {
      return user;
    }
  }
  return undefined;
}

export function toProfile(user: UserRecord): UserProfile {
  const { passwordHash: _passwordHash, ...profile } = user;
  return profile;
}

export function createOrder(
  items: Array<{ productId: string; quantity: number }>,
  attribution: { userId?: string; guestEmail?: string },
): OrderRecord | null {
  const orderItems = [];
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    const quantity = Math.floor(item.quantity);
    if (!product || !Number.isFinite(quantity) || quantity < 1) {
      return null;
    }
    orderItems.push({
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      quantity,
    });
  }
  if (orderItems.length === 0) {
    return null;
  }
  const total =
    Math.round(orderItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0) * 100) / 100;
  const order: OrderRecord = {
    id: `ORD-${randomUUID().slice(0, 8).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    items: orderItems,
    total,
    status: 'processing',
    ...attribution,
  };
  orders.push(order);
  return order;
}

function seed(): void {
  const demoAddress: DeliveryAddress = {
    street: 'Musterstraße 12',
    city: 'Berlin',
    zip: '10115',
    country: 'Germany',
  };
  const demo: UserRecord = {
    id: randomUUID(),
    email: 'demo@example.com',
    fullName: 'Demo Customer',
    vatId: 'DE123456789',
    address: demoAddress,
    passwordHash: hashPassword('Demo1234!'),
  };
  users.set(demo.id, demo);

  const daysAgo = (days: number): string =>
    new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  orders.push(
    {
      id: 'ORD-SEED0001',
      createdAt: daysAgo(21),
      items: [
        { productId: 'p-02', name: 'Nimbus Ceramic Mug', unitPrice: 18.5, quantity: 2 },
        { productId: 'p-03', name: 'Drift Notebook A5', unitPrice: 12.0, quantity: 1 },
      ],
      total: 49.0,
      status: 'delivered',
      userId: demo.id,
    },
    {
      id: 'ORD-SEED0002',
      createdAt: daysAgo(6),
      items: [{ productId: 'p-07', name: 'Echo Bluetooth Speaker', unitPrice: 89.9, quantity: 1 }],
      total: 89.9,
      status: 'shipped',
      userId: demo.id,
    },
    {
      id: 'ORD-SEED0003',
      createdAt: daysAgo(1),
      items: [
        { productId: 'p-05', name: 'Quill Fountain Pen', unitPrice: 64.0, quantity: 1 },
        { productId: 'p-09', name: 'Loom Canvas Tote', unitPrice: 24.0, quantity: 2 },
      ],
      total: 112.0,
      status: 'processing',
      userId: demo.id,
    },
  );
}

seed();

/**
 * Types shared between the Angular frontend and the Express mock backend.
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
}

export type ProductSort = 'name' | 'price-asc' | 'price-desc';

export interface DeliveryAddress {
  street: string;
  city: string;
  zip: string;
  country: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  vatId: string;
  address: DeliveryAddress;
}

export type OrderStatus = 'processing' | 'shipped' | 'delivered';

export interface OrderItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface Order {
  id: string;
  createdAt: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  vatId: string;
  address: DeliveryAddress;
}

export interface AuthResponse {
  accessToken: string;
  user: UserProfile;
}

export interface UpdateProfileRequest {
  email: string;
  fullName: string;
  vatId: string;
  address: DeliveryAddress;
}

export interface PlaceOrderRequest {
  customer: {
    fullName: string;
    email: string;
    vatId: string;
  };
  address: DeliveryAddress;
  items: Array<{ productId: string; quantity: number }>;
}

export interface ApiError {
  message: string;
}

/** Generic EU VAT ID: two uppercase letters followed by 2–12 alphanumerics. */
export const VAT_ID_PATTERN = /^[A-Z]{2}[0-9A-Z]{2,12}$/;

export const MIN_PASSWORD_LENGTH = 8;

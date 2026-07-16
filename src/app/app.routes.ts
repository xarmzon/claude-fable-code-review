import type { Routes } from '@angular/router';
import { authGuard, guestOnlyGuard } from './core/auth-guards';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home-page').then((m) => m.HomePage),
    title: 'Products — Fable Shop',
  },
  {
    path: 'cart',
    loadComponent: () => import('./features/cart/cart-page').then((m) => m.CartPage),
    title: 'Your cart — Fable Shop',
  },
  {
    path: 'checkout',
    loadComponent: () => import('./features/checkout/checkout-page').then((m) => m.CheckoutPage),
    title: 'Checkout — Fable Shop',
  },
  {
    path: 'login',
    canActivate: [guestOnlyGuard],
    loadComponent: () => import('./features/login/login-page').then((m) => m.LoginPage),
    title: 'Sign in — Fable Shop',
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
    title: 'Dashboard — Fable Shop',
  },
  { path: '**', redirectTo: '' },
];

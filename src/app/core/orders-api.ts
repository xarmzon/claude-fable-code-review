import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { Order, PlaceOrderRequest, UpdateProfileRequest, UserProfile } from '@shared/models';

@Service()
export class OrdersApi {
  readonly #http = inject(HttpClient);

  placeOrder(request: PlaceOrderRequest): Promise<Order> {
    return firstValueFrom(this.#http.post<Order>('/api/orders', request));
  }

  updateProfile(request: UpdateProfileRequest): Promise<UserProfile> {
    return firstValueFrom(this.#http.put<UserProfile>('/api/me', request));
  }
}

import { inject } from '@angular/core';
import { HttpErrorResponse, type HttpInterceptorFn, type HttpRequest } from '@angular/common/http';
import { from, switchMap, throwError, catchError } from 'rxjs';
import { AuthService } from './auth';

const withBearer = (req: HttpRequest<unknown>, token: string): HttpRequest<unknown> =>
  req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

/**
 * Attaches the in-memory access token to API requests and, on a 401,
 * performs one silent refresh-and-retry before giving up (FR-6.5).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isAuthEndpoint = req.url.startsWith('/api/auth/');
  const token = auth.accessToken();
  const outgoing = token && !isAuthEndpoint ? withBearer(req, token) : req;

  return next(outgoing).pipe(
    catchError((error: unknown) => {
      const isExpiredAccess =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isAuthEndpoint &&
        token !== null;
      if (!isExpiredAccess) {
        return throwError(() => error);
      }
      return from(auth.refresh()).pipe(
        switchMap((refreshed) => {
          const freshToken = auth.accessToken();
          if (!refreshed || freshToken === null) {
            return throwError(() => error);
          }
          return next(withBearer(req, freshToken));
        }),
      );
    }),
  );
};

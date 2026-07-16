import { randomBytes } from 'node:crypto';
import cookieParser from 'cookie-parser';
import express, { type NextFunction, type Request, type Response } from 'express';
import {
  MIN_PASSWORD_LENGTH,
  VAT_ID_PATTERN,
  type AuthResponse,
  type DeliveryAddress,
  type LoginRequest,
  type PlaceOrderRequest,
  type ProductSort,
  type RegisterRequest,
  type UpdateProfileRequest,
} from '../shared/models';
import { signJwt, verifyJwt } from './jwt';
import {
  createOrder,
  findUserByEmail,
  hashPassword,
  orders,
  products,
  refreshSessions,
  toProfile,
  users,
  verifyPassword,
  type UserRecord,
} from './store';

const PORT = 3000;
const JWT_SECRET = randomBytes(32).toString('hex');
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REFRESH_COOKIE = 'refreshToken';
// Scoped so the browser only attaches the refresh cookie to auth endpoints.
const REFRESH_COOKIE_PATH = '/api/auth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AuthedRequest extends Request {
  user?: UserRecord;
}

const app = express();
app.use(express.json());
app.use(cookieParser());

// Simulated network latency (~150–400 ms).
app.use((_req: Request, _res: Response, next: NextFunction) => {
  setTimeout(next, 150 + Math.random() * 250);
});

function issueSession(user: UserRecord, res: Response): AuthResponse {
  const refreshToken = randomBytes(32).toString('hex');
  refreshSessions.set(refreshToken, {
    userId: user.id,
    expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
  return {
    accessToken: signJwt({ sub: user.id, email: user.email }, JWT_SECRET, ACCESS_TOKEN_TTL_SECONDS),
    user: toProfile(user),
  };
}

function resolveBearerUser(req: Request): UserRecord | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return undefined;
  }
  const payload = verifyJwt(header.slice('Bearer '.length), JWT_SECRET);
  if (!payload) {
    return undefined;
  }
  return users.get(payload.sub);
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const user = resolveBearerUser(req);
  if (!user) {
    res.status(401).json({ message: 'Not authenticated' });
    return;
  }
  req.user = user;
  next();
}

function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  req.user = resolveBearerUser(req);
  next();
}

function isValidAddress(address: unknown): address is DeliveryAddress {
  if (typeof address !== 'object' || address === null) {
    return false;
  }
  const a = address as Record<string, unknown>;
  return (['street', 'city', 'zip', 'country'] as const).every(
    (key) => typeof a[key] === 'string' && (a[key] as string).trim().length > 0,
  );
}

function validateProfileFields(body: {
  email?: unknown;
  fullName?: unknown;
  vatId?: unknown;
  address?: unknown;
}): string | null {
  if (typeof body.email !== 'string' || !EMAIL_PATTERN.test(body.email)) {
    return 'A valid email is required';
  }
  if (typeof body.fullName !== 'string' || body.fullName.trim().length === 0) {
    return 'Full name is required';
  }
  if (typeof body.vatId !== 'string' || !VAT_ID_PATTERN.test(body.vatId)) {
    return 'A valid VAT ID is required';
  }
  if (!isValidAddress(body.address)) {
    return 'A complete delivery address is required';
  }
  return null;
}

app.get('/api/products', (req: Request, res: Response) => {
  const q = typeof req.query['q'] === 'string' ? req.query['q'].trim().toLowerCase() : '';
  const sort = (typeof req.query['sort'] === 'string' ? req.query['sort'] : 'name') as ProductSort;

  let result = products.filter(
    (p) => !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
  );
  result = [...result].sort((a, b) => {
    switch (sort) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      default:
        return a.name.localeCompare(b.name);
    }
  });
  res.json(result);
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const body = req.body as Partial<RegisterRequest>;
  const profileError = validateProfileFields(body);
  if (profileError) {
    res.status(400).json({ message: profileError });
    return;
  }
  if (typeof body.password !== 'string' || body.password.length < MIN_PASSWORD_LENGTH) {
    res
      .status(400)
      .json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    return;
  }
  if (findUserByEmail(body.email as string)) {
    res.status(409).json({ message: 'This email is already registered' });
    return;
  }
  const user: UserRecord = {
    id: randomBytes(8).toString('hex'),
    email: (body.email as string).trim(),
    fullName: (body.fullName as string).trim(),
    vatId: body.vatId as string,
    address: body.address as DeliveryAddress,
    passwordHash: hashPassword(body.password),
  };
  users.set(user.id, user);
  res.status(201).json(issueSession(user, res));
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const body = req.body as Partial<LoginRequest>;
  const user = typeof body.email === 'string' ? findUserByEmail(body.email) : undefined;
  if (
    !user ||
    typeof body.password !== 'string' ||
    !verifyPassword(body.password, user.passwordHash)
  ) {
    // Generic message on purpose: no account enumeration.
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }
  res.json(issueSession(user, res));
});

app.post('/api/auth/refresh', (req: Request, res: Response) => {
  const token = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
  const session = token ? refreshSessions.get(token) : undefined;
  if (token) {
    // Rotation: a presented token is single-use, valid or not.
    refreshSessions.delete(token);
  }
  if (!session || session.expiresAt <= Date.now()) {
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
    res.status(401).json({ message: 'Not authenticated' });
    return;
  }
  const user = users.get(session.userId);
  if (!user) {
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
    res.status(401).json({ message: 'Not authenticated' });
    return;
  }
  res.json(issueSession(user, res));
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const token = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
  if (token) {
    refreshSessions.delete(token);
  }
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  res.status(204).end();
});

app.get('/api/me', requireAuth, (req: AuthedRequest, res: Response) => {
  res.json(toProfile(req.user as UserRecord));
});

app.put('/api/me', requireAuth, (req: AuthedRequest, res: Response) => {
  const user = req.user as UserRecord;
  const body = req.body as Partial<UpdateProfileRequest>;
  const profileError = validateProfileFields(body);
  if (profileError) {
    res.status(400).json({ message: profileError });
    return;
  }
  const existing = findUserByEmail(body.email as string);
  if (existing && existing.id !== user.id) {
    res.status(409).json({ message: 'This email is already registered' });
    return;
  }
  user.email = (body.email as string).trim();
  user.fullName = (body.fullName as string).trim();
  user.vatId = body.vatId as string;
  user.address = body.address as DeliveryAddress;
  res.json(toProfile(user));
});

app.get('/api/orders', requireAuth, (req: AuthedRequest, res: Response) => {
  const user = req.user as UserRecord;
  const own = orders
    .filter((o) => o.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ userId: _userId, guestEmail: _guestEmail, ...order }) => order);
  res.json(own);
});

app.post('/api/orders', optionalAuth, (req: AuthedRequest, res: Response) => {
  const body = req.body as Partial<PlaceOrderRequest>;
  if (
    typeof body.customer !== 'object' ||
    body.customer === null ||
    validateProfileFields({ ...body.customer, address: body.address })
  ) {
    res.status(400).json({ message: 'Valid customer details and address are required' });
    return;
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    res.status(400).json({ message: 'The order must contain at least one item' });
    return;
  }
  const order = createOrder(
    body.items,
    req.user ? { userId: req.user.id } : { guestEmail: body.customer.email },
  );
  if (!order) {
    res.status(400).json({ message: 'One or more order items are invalid' });
    return;
  }
  const { userId: _userId, guestEmail: _guestEmail, ...publicOrder } = order;
  res.status(201).json(publicOrder);
});

app.listen(PORT, () => {
  console.log(`Mock API listening on http://localhost:${PORT}`);
});

import { createHmac, timingSafeEqual } from 'node:crypto';

export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

const encode = (value: object): string => Buffer.from(JSON.stringify(value)).toString('base64url');

const hmac = (input: string, secret: string): Buffer =>
  createHmac('sha256', secret).update(input).digest();

export function signJwt(
  claims: { sub: string; email: string },
  secret: string,
  expiresInSeconds: number,
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ ...claims, iat: now, exp: now + expiresInSeconds });
  const signature = hmac(`${header}.${payload}`, secret).toString('base64url');
  return `${header}.${payload}.${signature}`;
}

export function verifyJwt(token: string, secret: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  const [header, payload, signature] = parts;
  const expected = hmac(`${header}.${payload}`, secret);
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as JwtPayload;
    if (typeof claims.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

// @mis/auth-middleware — gateway-identity reader.
//
// AuthN is done at the Kong API gateway (jwt plugin). By the time a request
// reaches a service it is ALREADY authenticated; this middleware just reads
// the identity Kong forwarded so services can use it internally:
//   - Authorization: Bearer <jwt>  -> claims (Kong already verified signature+exp)
//   - X-Correlation-ID             -> request correlation id (set by Kong)
// authZ (what the user may do) lives in @mis/access-control.

export const PACKAGE = '@mis/auth-middleware';

export const CORRELATION_HEADER = 'x-correlation-id';

export interface AuthUser {
  id: string;
  roles: string[];
  email?: string;
  name?: string;
}

export const DEV_USER: AuthUser = {
  id: 'dev-user',
  roles: ['admin'],
  email: 'dev@mis.local',
  name: 'Dev User',
};

export interface AuthMiddlewareOptions {
  // When true, requests with no forwarded identity fall back to DEV_USER
  // (running a service directly, without going through Kong). Default true.
  allowDevFallback?: boolean;
}

const B64 =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Dependency-free base64url -> UTF-8 (the package has no @types/node, so no
// Buffer/atob). JWT payloads are small JSON; this is enough for them.
function b64urlToUtf8(input: string): string {
  let s = input.replace(/-/g, '+').replace(/_/g, '/');
  s += '='.repeat((4 - (s.length % 4)) % 4);
  const bytes: number[] = [];
  for (let i = 0; i < s.length; i += 4) {
    const n =
      (B64.indexOf(s[i]) << 18) |
      (B64.indexOf(s[i + 1]) << 12) |
      ((B64.indexOf(s[i + 2]) & 63) << 6) |
      (B64.indexOf(s[i + 3]) & 63);
    bytes.push((n >> 16) & 255);
    if (s[i + 2] !== '=') bytes.push((n >> 8) & 255);
    if (s[i + 3] !== '=') bytes.push(n & 255);
  }
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const c = bytes[i++];
    if (c < 128) out += String.fromCharCode(c);
    else if (c < 224)
      out += String.fromCharCode(((c & 31) << 6) | (bytes[i++] & 63));
    else
      out += String.fromCharCode(
        ((c & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63),
      );
  }
  return out;
}

/** Decode a JWT payload WITHOUT verifying — Kong already verified it. */
export function decodeJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(b64urlToUtf8(parts[1]));
  } catch {
    return null;
  }
}

function userFromClaims(c: Record<string, unknown>): AuthUser {
  const roles = Array.isArray(c.roles) ? (c.roles as string[]) : [];
  return {
    id: String(c.sub ?? 'unknown'),
    roles,
    email: typeof c.email === 'string' ? c.email : undefined,
    name: typeof c.name === 'string' ? c.name : undefined,
  };
}

export interface Identity {
  user: AuthUser;
  correlationId: string;
}

/** Pull the gateway-forwarded identity + correlation id off a request. */
export function extractIdentity(
  req: any,
  opts: AuthMiddlewareOptions = {},
): Identity | null {
  const { allowDevFallback = true } = opts;
  const correlationId =
    req.headers?.[CORRELATION_HEADER] ||
    `local-${Math.random().toString(36).slice(2, 10)}`;

  const auth: string = req.headers?.authorization ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const claims = token ? decodeJwtClaims(token) : null;

  if (claims) return { user: userFromClaims(claims), correlationId };
  if (allowDevFallback) return { user: DEV_USER, correlationId };
  return null;
}

/**
 * Express/NestJS-style middleware: attaches `req.user` and
 * `req.correlationId`. Mount it once in each service's bootstrap.
 */
export function gatewayIdentity(opts: AuthMiddlewareOptions = {}) {
  return (req: any, res: any, next: () => void) => {
    const id = extractIdentity(req, opts);
    if (!id) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'unauthenticated' }));
      return;
    }
    req.user = id.user;
    req.correlationId = id.correlationId;
    if (res.setHeader) res.setHeader('X-Correlation-ID', id.correlationId);
    next();
  };
}

/** @deprecated use gatewayIdentity(); kept so existing imports resolve. */
export const authMiddlewareStub = gatewayIdentity;

export function banner(): string {
  return `[${PACKAGE}] gateway-identity reader loaded`;
}

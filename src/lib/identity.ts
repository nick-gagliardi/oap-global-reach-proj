export interface RequestIdentity {
  name?: string;
  email?: string;
}

/**
 * Parse the platform-provided identity from request headers.
 *
 * PHASE 1 DISCOVERY PENDING: the iddb platform authenticates every visitor as
 * an Okta employee, but how the identity reaches the app (header/cookie/JWT)
 * is unknown until the /api/whoami probe is inspected on a real deployment.
 * Until then this checks the common reverse-proxy conventions and returns
 * null when nothing is present — every feature must work without identity.
 */
export function getRequestIdentity(headers: Headers): RequestIdentity | null {
  const email =
    headers.get("x-forwarded-email") ||
    headers.get("x-auth-request-email") ||
    headers.get("x-okta-user-email") ||
    undefined;
  const name =
    headers.get("x-forwarded-user") ||
    headers.get("x-auth-request-user") ||
    headers.get("x-okta-user-name") ||
    undefined;
  if (!email && !name) return null;
  return { name: name ?? undefined, email: email ?? undefined };
}

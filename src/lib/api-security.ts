/**
 * API Security Middleware
 * Provides rate limiting, secret key validation, and domain restriction
 */

import { NextResponse } from "next/server";
import { checkRateLimit, getClientIP } from "./rate-limiter";

export interface SecurityCheckResult {
  allowed: boolean;
  error?: string;
  status?: number;
  headers?: Record<string, string>;
}

/**
 * Validate the internal API secret header
 * The frontend must include this header to prove it's a legitimate request
 */
function validateApiSecret(request: Request): boolean {
  const secret = process.env.INTERNAL_API_SECRET;

  // If no secret configured, skip this check (dev mode)
  if (!secret) {
    console.warn("INTERNAL_API_SECRET not configured - skipping secret validation");
    return true;
  }

  const providedSecret = request.headers.get("x-api-secret");
  return providedSecret === secret;
}

/**
 * Validate the request origin/referer matches allowed domains
 */
function validateDomain(request: Request): boolean {
  const allowedDomains = process.env.ALLOWED_DOMAINS;

  // If no domains configured, skip this check (dev mode)
  if (!allowedDomains) {
    console.warn("ALLOWED_DOMAINS not configured - skipping domain validation");
    return true;
  }

  const domains = allowedDomains.split(",").map(d => d.trim().toLowerCase());

  // Check Origin header first (preferred for CORS)
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).hostname.toLowerCase();
      if (domains.some(d => originHost === d || originHost.endsWith(`.${d}`))) {
        return true;
      }
    } catch {
      // Invalid URL
    }
  }

  // Check Referer header as fallback
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const refererHost = new URL(referer).hostname.toLowerCase();
      if (domains.some(d => refererHost === d || refererHost.endsWith(`.${d}`))) {
        return true;
      }
    } catch {
      // Invalid URL
    }
  }

  // Allow localhost in development
  if (process.env.NODE_ENV === "development") {
    const host = origin || referer || "";
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      return true;
    }
  }

  return false;
}

/**
 * Main security check function
 * Apply all security layers and return result
 */
export function checkApiSecurity(
  request: Request,
  options: {
    rateLimit?: number;       // Max requests per minute (default: 20)
    requireSecret?: boolean;  // Require API secret header (default: true)
    requireDomain?: boolean;  // Require valid domain (default: true)
  } = {}
): SecurityCheckResult {
  const {
    rateLimit = 20,
    requireSecret = true,
    requireDomain = true,
  } = options;

  const clientIP = getClientIP(request);

  // 1. Rate limiting
  const rateLimitResult = checkRateLimit(clientIP, rateLimit);

  if (!rateLimitResult.allowed) {
    return {
      allowed: false,
      error: `Rate limit exceeded. Try again in ${rateLimitResult.resetIn} seconds.`,
      status: 429,
      headers: {
        "Retry-After": String(rateLimitResult.resetIn),
        "X-RateLimit-Limit": String(rateLimit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(rateLimitResult.resetIn),
      },
    };
  }

  // 2. API Secret validation
  if (requireSecret && !validateApiSecret(request)) {
    return {
      allowed: false,
      error: "Unauthorized request",
      status: 401,
    };
  }

  // 3. Domain restriction
  if (requireDomain && !validateDomain(request)) {
    return {
      allowed: false,
      error: "Request origin not allowed",
      status: 403,
    };
  }

  // All checks passed
  return {
    allowed: true,
    headers: {
      "X-RateLimit-Limit": String(rateLimit),
      "X-RateLimit-Remaining": String(rateLimitResult.remaining),
      "X-RateLimit-Reset": String(rateLimitResult.resetIn),
    },
  };
}

/**
 * Helper to create a security error response
 */
export function createSecurityErrorResponse(result: SecurityCheckResult): NextResponse {
  return NextResponse.json(
    { success: false, error: result.error },
    {
      status: result.status || 403,
      headers: result.headers,
    }
  );
}

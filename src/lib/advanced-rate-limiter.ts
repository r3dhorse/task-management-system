import { cache } from './cache';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class AdvancedRateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async checkLimit(identifier: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    totalHits: number;
  }> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();

    // Get current rate limit data
    const current = await cache.get<RateLimitEntry>(key);
    
    if (!current || current.resetTime <= now) {
      // First request or window expired
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.config.windowMs,
      };
      
      await cache.set(key, newEntry, Math.ceil(this.config.windowMs / 1000));
      
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: newEntry.resetTime,
        totalHits: 1,
      };
    }

    // Increment count
    const updatedEntry: RateLimitEntry = {
      ...current,
      count: current.count + 1,
    };
    
    await cache.set(key, updatedEntry, Math.ceil((current.resetTime - now) / 1000));
    
    const allowed = updatedEntry.count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - updatedEntry.count);
    
    return {
      allowed,
      remaining,
      resetTime: current.resetTime,
      totalHits: updatedEntry.count,
    };
  }

  async reset(identifier: string): Promise<void> {
    const key = `rate_limit:${identifier}`;
    await cache.delete(key);
  }
}

// Predefined rate limiters
export const advancedRateLimiters = {
  api: new AdvancedRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000, // 1000 requests per 15 minutes
  }),
  
  auth: new AdvancedRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 login attempts per 15 minutes
  }),
  
  upload: new AdvancedRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 uploads per minute
  }),
  
  search: new AdvancedRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 searches per minute
  }),
} as const;

// Middleware factory
export function createAdvancedRateLimitMiddleware(
  limiter: AdvancedRateLimiter,
  getIdentifier: (request: Request, userId?: string) => string = (req) => 
    req.headers.get('x-forwarded-for') || 
    req.headers.get('x-real-ip') || 
    'unknown'
) {
  return async (c: any, next: any) => {
    const request = c.req.raw;
    const user = c.get('user');
    const identifier = getIdentifier(request, user?.id);
    
    const result = await limiter.checkLimit(identifier);
    
    // Set rate limit headers
    c.header('X-RateLimit-Limit', limiter['config'].maxRequests.toString());
    c.header('X-RateLimit-Remaining', result.remaining.toString());
    c.header('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
    
    if (!result.allowed) {
      return c.json(
        {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        },
        429
      );
    }
    
    await next();
  };
}

// Helper to get user-specific identifier
export function getUserIdentifier(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  
  return (
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'anonymous'
  );
}

// Common rate limit middleware instances
export const apiRateLimit = createAdvancedRateLimitMiddleware(advancedRateLimiters.api, getUserIdentifier);
export const authRateLimit = createAdvancedRateLimitMiddleware(advancedRateLimiters.auth);
export const uploadRateLimit = createAdvancedRateLimitMiddleware(advancedRateLimiters.upload, getUserIdentifier);
export const searchRateLimit = createAdvancedRateLimitMiddleware(advancedRateLimiters.search, getUserIdentifier);
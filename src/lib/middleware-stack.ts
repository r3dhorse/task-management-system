import { createAdvancedRateLimitMiddleware, advancedRateLimiters } from './advanced-rate-limiter';
import { performanceMonitor, createPerformanceMiddleware } from './performance-monitor';
import { cache } from './cache';

interface User {
  id: string;
}

interface HonoContext {
  req: { 
    header: (key: string) => string | undefined;
    method: string;
    path: string;
    query: () => string;
  };
  res: Response;
  header: (key: string, value: string) => void;
  status: (status: number) => void;
  json: (data: unknown, status?: number) => Response;
  get: (key: string) => unknown;
}

// Compression middleware for responses
export function createCompressionMiddleware() {
  return async (c: HonoContext, next: () => Promise<void>) => {
    await next();
    
    // Only compress if response is large enough and client accepts it
    const acceptEncoding = c.req.header('accept-encoding') || '';
    const response = c.res;
    
    if (
      response &&
      acceptEncoding.includes('gzip') &&
      response.headers.get('content-length') &&
      parseInt(response.headers.get('content-length')!) > 1024
    ) {
      c.header('Content-Encoding', 'gzip');
      c.header('Vary', 'Accept-Encoding');
    }
  };
}

// Security headers middleware
export function createSecurityMiddleware() {
  return async (c: HonoContext, next: () => Promise<void>) => {
    // Security headers
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https:; " +
      "frame-ancestors 'none';"
    );
    
    await next();
  };
}

// Request validation middleware
export function createValidationMiddleware() {
  return async (c: HonoContext, next: () => Promise<void>) => {
    const contentType = c.req.header('content-type');
    const method = c.req.method;
    
    // Validate content type for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      if (!contentType || (!contentType.includes('application/json') && !contentType.includes('multipart/form-data'))) {
        return c.json({ error: 'Invalid content type' }, 400);
      }
    }
    
    // Validate request size
    const contentLength = c.req.header('content-length');
    if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) { // 50MB limit
      return c.json({ error: 'Request too large' }, 413);
    }
    
    await next();
  };
}

// Response caching middleware
export function createCachingMiddleware(
  getTtl: (path: string, method: string) => number = () => 300,
  shouldCache: (path: string, method: string) => boolean = (path, method) => 
    method === 'GET' && !path.includes('/auth/')
) {
  return async (c: HonoContext, next: () => Promise<void>) => {
    const path = c.req.path;
    const method = c.req.method;
    const user = c.get('user') as User | undefined;
    
    if (!shouldCache(path, method)) {
      await next();
      return;
    }
    
    // Create cache key including user context
    const cacheKey = `response:${method}:${path}:${user?.id || 'anonymous'}:${c.req.query()}`;
    const ttl = getTtl(path, method);
    
    // Try to get cached response
    const cached = await cache.get(cacheKey);
    if (cached) {
      c.header('X-Cache', 'HIT');
      return c.json(cached);
    }
    
    // Execute request and cache response
    await next();
    
    const response = c.res;
    if (response && response.status === 200) {
      try {
        const body = await response.clone().json();
        await cache.set(cacheKey, body, ttl);
        c.header('X-Cache', 'MISS');
      } catch {
        // Non-JSON response, skip caching
      }
    }
  };
}

// Error handling middleware
export function createErrorHandlingMiddleware() {
  return async (c: HonoContext, next: () => Promise<void>) => {
    try {
      await next();
    } catch (error) {
      console.error('API Error:', error);
      
      // Log error with performance context
      const user = c.get('user') as User | undefined;
      performanceMonitor.addMetric('api.error', 0, {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: c.req.path,
        method: c.req.method,
        userId: user?.id,
      });
      
      // Return appropriate error response
      if (error instanceof Error) {
        if (error.name === 'ValidationError') {
          return c.json({ error: 'Validation failed', details: error.message }, 400);
        }
        if (error.name === 'UnauthorizedError') {
          return c.json({ error: 'Unauthorized' }, 401);
        }
        if (error.name === 'ForbiddenError') {
          return c.json({ error: 'Forbidden' }, 403);
        }
        if (error.name === 'NotFoundError') {
          return c.json({ error: 'Not found' }, 404);
        }
      }
      
      // Generic server error
      return c.json(
        { 
          error: 'Internal server error',
          ...(process.env.NODE_ENV === 'development' && { 
            details: error instanceof Error ? error.message : 'Unknown error' 
          })
        }, 
        500
      );
    }
  };
}

// Request logging middleware
export function createLoggingMiddleware() {
  return async (c: HonoContext, next: () => Promise<void>) => {
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;
    const userAgent = c.req.header('user-agent');
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    
    await next();
    
    const duration = Date.now() - start;
    const status = c.res?.status || 0;
    const user = c.get('user') as User | undefined;
    
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      const logLevel = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
      console[logLevel](`${method} ${path} ${status} ${duration}ms ${user?.id || 'anonymous'}`);
    }
    
    // Track in performance monitor
    performanceMonitor.addMetric(`api.${method.toLowerCase()}`, duration, {
      path,
      status,
      userId: user?.id,
      ip,
      userAgent: userAgent?.substring(0, 100),
    });
  };
}

// Create the complete middleware stack
export function createMiddlewareStack(options: {
  enableRateLimit?: boolean;
  enableCaching?: boolean;
  enableCompression?: boolean;
  enablePerformanceTracking?: boolean;
} = {}) {
  const {
    enableRateLimit = true,
    enableCaching = true,
    enableCompression = true,
    enablePerformanceTracking = true,
  } = options;
  
  const middlewares = [];
  
  // 1. Security (always first)
  middlewares.push(createSecurityMiddleware());
  
  // 2. Error handling (catch all errors)
  middlewares.push(createErrorHandlingMiddleware());
  
  // 3. Logging and performance tracking
  if (enablePerformanceTracking) {
    middlewares.push(createPerformanceMiddleware());
    middlewares.push(createLoggingMiddleware());
  }
  
  // 4. Rate limiting
  if (enableRateLimit) {
    middlewares.push(createAdvancedRateLimitMiddleware(advancedRateLimiters.api));
  }
  
  // 5. Request validation
  middlewares.push(createValidationMiddleware());
  
  // 6. Compression
  if (enableCompression) {
    middlewares.push(createCompressionMiddleware());
  }
  
  // 7. Caching (after auth, before business logic)
  if (enableCaching) {
    middlewares.push(createCachingMiddleware());
  }
  
  return middlewares;
}

// Pre-configured middleware stacks for different endpoints
export const authMiddlewareStack = createMiddlewareStack({
  enableCaching: false, // Don't cache auth endpoints
  enableRateLimit: true, // Important for auth endpoints
});

export const apiMiddlewareStack = createMiddlewareStack({
  enableCaching: true,
  enableRateLimit: true,
  enableCompression: true,
  enablePerformanceTracking: true,
});

export const uploadMiddlewareStack = [
  ...createMiddlewareStack({ enableCaching: false }),
  createAdvancedRateLimitMiddleware(advancedRateLimiters.upload),
];

export const publicMiddlewareStack = createMiddlewareStack({
  enableRateLimit: false, // More lenient for public endpoints
  enableCaching: true,
});

// Utility to apply middleware stack to Hono app
interface HonoApp {
  use: (path: string, middleware: (c: HonoContext, next: () => Promise<void>) => Promise<void>) => void;
}

export function applyMiddlewareStack(app: HonoApp, middlewares: Array<(c: HonoContext, next: () => Promise<void>) => Promise<void>>) {
  middlewares.forEach(middleware => {
    app.use('*', middleware);
  });
  return app;
}
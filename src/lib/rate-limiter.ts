interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly useCache: boolean;

  constructor(windowMs: number, maxRequests: number, useCache = false) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.useCache = useCache;
  }

  private cleanupExpiredEntries() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt <= now) {
        this.store.delete(key);
      }
    }
  }

  isAllowed(identifier: string): boolean {
    this.cleanupExpiredEntries();
    
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry || entry.resetAt <= now) {
      // Create new entry or reset expired one
      this.store.set(identifier, {
        count: 1,
        resetAt: now + this.windowMs
      });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    // Increment count
    entry.count++;
    return true;
  }

  getRemainingTime(identifier: string): number {
    const entry = this.store.get(identifier);
    if (!entry) return 0;
    
    const now = Date.now();
    return Math.max(0, entry.resetAt - now);
  }

  reset(identifier: string) {
    this.store.delete(identifier);
  }
}

// Create a rate limiter for forgot password: 1 request per 24 hours
export const forgotPasswordRateLimiter = new RateLimiter(
  24 * 60 * 60 * 1000, // 24 hours in milliseconds
  1 // max 1 request per window
);

// Helper function to format remaining time
export function formatRemainingTime(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}
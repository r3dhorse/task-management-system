import { Redis } from 'ioredis';

interface CacheConfig {
  defaultTTL: number;
  keyPrefix: string;
}

class CacheManager {
  private redis?: Redis;
  private memoryCache: Map<string, { value: any; expiry: number }> = new Map();
  private config: CacheConfig;

  constructor(config: CacheConfig = { defaultTTL: 300, keyPrefix: 'task-mgmt:' }) {
    this.config = config;
    
    // Initialize Redis if available
    if (process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL, {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });
        
        this.redis.on('error', (err) => {
          console.warn('Redis connection error, falling back to memory cache:', err);
        });
      } catch (error) {
        console.warn('Failed to initialize Redis, using memory cache:', error);
      }
    }
  }

  private getKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getKey(key);

    try {
      if (this.redis) {
        const value = await this.redis.get(fullKey);
        return value ? JSON.parse(value) : null;
      }
    } catch (error) {
      console.warn('Redis get error, falling back to memory cache:', error);
    }

    // Fallback to memory cache
    const memoryEntry = this.memoryCache.get(fullKey);
    if (memoryEntry && memoryEntry.expiry > Date.now()) {
      return memoryEntry.value;
    }
    
    this.memoryCache.delete(fullKey);
    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const fullKey = this.getKey(key);
    const finalTTL = ttl ?? this.config.defaultTTL;

    try {
      if (this.redis) {
        await this.redis.setex(fullKey, finalTTL, JSON.stringify(value));
        return;
      }
    } catch (error) {
      console.warn('Redis set error, falling back to memory cache:', error);
    }

    // Fallback to memory cache
    this.memoryCache.set(fullKey, {
      value,
      expiry: Date.now() + (finalTTL * 1000),
    });
  }

  async delete(key: string): Promise<void> {
    const fullKey = this.getKey(key);

    try {
      if (this.redis) {
        await this.redis.del(fullKey);
      }
    } catch (error) {
      console.warn('Redis delete error:', error);
    }

    this.memoryCache.delete(fullKey);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const fullPattern = this.getKey(pattern);

    try {
      if (this.redis) {
        const keys = await this.redis.keys(fullPattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (error) {
      console.warn('Redis pattern invalidation error:', error);
    }

    // Fallback to memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }
  }

  // Cleanup memory cache periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiry <= now) {
        this.memoryCache.delete(key);
      }
    }
  }
}

export const cache = new CacheManager();

// Cache utility functions
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try to get from cache first
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch data and cache it
  const data = await fetcher();
  await cache.set(key, data, ttl);
  return data;
}

export function getCacheKey(
  type: string,
  id?: string | string[],
  ...params: string[]
): string {
  const parts = [type];
  
  if (id) {
    if (Array.isArray(id)) {
      parts.push(id.join(':'));
    } else {
      parts.push(id);
    }
  }
  
  parts.push(...params);
  return parts.join(':');
}

// Common cache keys
export const CacheKeys = {
  user: (id: string) => getCacheKey('user', id),
  workspace: (id: string) => getCacheKey('workspace', id),
  workspaceMembers: (workspaceId: string) => getCacheKey('workspace', workspaceId, 'members'),
  workspaceTasks: (workspaceId: string, filters?: string) => 
    getCacheKey('workspace', workspaceId, 'tasks', filters || 'all'),
  userWorkspaces: (userId: string) => getCacheKey('user', userId, 'workspaces'),
  taskHistory: (taskId: string) => getCacheKey('task', taskId, 'history'),
  taskMessages: (taskId: string) => getCacheKey('task', taskId, 'messages'),
  userNotifications: (userId: string) => getCacheKey('user', userId, 'notifications'),
  workspaceServices: (workspaceId: string) => getCacheKey('workspace', workspaceId, 'services'),
} as const;

// Cache invalidation helpers
export const CacheInvalidation = {
  userUpdated: async (userId: string) => {
    await cache.delete(CacheKeys.user(userId));
    await cache.invalidatePattern(`user:${userId}:*`);
  },
  
  workspaceUpdated: async (workspaceId: string) => {
    await cache.delete(CacheKeys.workspace(workspaceId));
    await cache.invalidatePattern(`workspace:${workspaceId}:*`);
  },
  
  taskUpdated: async (taskId: string, workspaceId: string) => {
    await cache.invalidatePattern(`task:${taskId}:*`);
    await cache.invalidatePattern(`workspace:${workspaceId}:tasks:*`);
  },
  
  membershipChanged: async (userId: string, workspaceId: string) => {
    await cache.delete(CacheKeys.userWorkspaces(userId));
    await cache.delete(CacheKeys.workspaceMembers(workspaceId));
  },
} as const;

// Cleanup interval
if (typeof window === 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 5 * 60 * 1000); // Cleanup every 5 minutes
}
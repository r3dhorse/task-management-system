import React, { useEffect } from 'react';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface DatabaseMetrics {
  queryCount: number;
  totalDuration: number;
  slowQueries: Array<{
    query: string;
    duration: number;
    timestamp: number;
  }>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private dbMetrics: DatabaseMetrics = {
    queryCount: 0,
    totalDuration: 0,
    slowQueries: [],
  };
  private readonly SLOW_QUERY_THRESHOLD = 100; // 100ms
  private readonly MAX_METRICS = 1000;

  /**
   * Start timing a performance metric
   */
  startTiming(name: string, metadata?: Record<string, unknown>): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.addMetric(name, duration, metadata);
    };
  }

  /**
   * Time a function execution
   */
  async timeFunction<T>(
    name: string,
    fn: () => Promise<T> | T,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const stopTiming = this.startTiming(name, metadata);
    
    try {
      const result = await fn();
      return result;
    } finally {
      stopTiming();
    }
  }

  /**
   * Add a performance metric
   */
  addMetric(name: string, duration: number, metadata?: Record<string, unknown>): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Keep only the latest metrics to prevent memory leaks
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Log slow operations in development
    if (process.env.NODE_ENV === 'development' && duration > 200) {
      console.warn(`🐌 Slow operation detected: ${name} took ${duration.toFixed(2)}ms`, metadata);
    }
  }

  /**
   * Track database query performance
   */
  trackDatabaseQuery(query: string, duration: number): void {
    this.dbMetrics.queryCount++;
    this.dbMetrics.totalDuration += duration;

    if (duration > this.SLOW_QUERY_THRESHOLD) {
      this.dbMetrics.slowQueries.push({
        query: query.substring(0, 200), // Truncate long queries
        duration,
        timestamp: Date.now(),
      });

      // Keep only the latest slow queries
      if (this.dbMetrics.slowQueries.length > 50) {
        this.dbMetrics.slowQueries = this.dbMetrics.slowQueries.slice(-50);
      }

      // Log slow queries in development
      if (process.env.NODE_ENV === 'development') {
        console.warn(`🐌 Slow database query: ${duration.toFixed(2)}ms`, query);
      }
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(timeWindow?: number): {
    totalMetrics: number;
    avgDuration: number;
    slowOperations: PerformanceMetric[];
    operationsByType: Record<string, { count: number; avgDuration: number }>;
    databaseMetrics: DatabaseMetrics;
  } {
    const now = Date.now();
    const windowMs = timeWindow || 5 * 60 * 1000; // Default 5 minutes
    
    const recentMetrics = this.metrics.filter(
      metric => now - metric.timestamp <= windowMs
    );

    const operationsByType: Record<string, { count: number; totalDuration: number }> = {};
    
    recentMetrics.forEach(metric => {
      if (!operationsByType[metric.name]) {
        operationsByType[metric.name] = { count: 0, totalDuration: 0 };
      }
      operationsByType[metric.name].count++;
      operationsByType[metric.name].totalDuration += metric.duration;
    });

    const operationsSummary = Object.entries(operationsByType).reduce(
      (acc, [name, data]) => {
        acc[name] = {
          count: data.count,
          avgDuration: data.totalDuration / data.count,
        };
        return acc;
      },
      {} as Record<string, { count: number; avgDuration: number }>
    );

    return {
      totalMetrics: recentMetrics.length,
      avgDuration: recentMetrics.length > 0 
        ? recentMetrics.reduce((sum, metric) => sum + metric.duration, 0) / recentMetrics.length
        : 0,
      slowOperations: recentMetrics
        .filter(metric => metric.duration > 200)
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10),
      operationsByType: operationsSummary,
      databaseMetrics: { ...this.dbMetrics },
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = [];
    this.dbMetrics = {
      queryCount: 0,
      totalDuration: 0,
      slowQueries: [],
    };
  }

  /**
   * Get real-time performance data for monitoring dashboard
   */
  getRealTimeMetrics(): {
    recentOperations: PerformanceMetric[];
    memoryUsage: NodeJS.MemoryUsage;
    processUptime: number;
  } {
    const recentOperations = this.metrics
      .slice(-20)
      .sort((a, b) => b.timestamp - a.timestamp);

    return {
      recentOperations,
      memoryUsage: process.memoryUsage(),
      processUptime: process.uptime(),
    };
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Utility decorators and helpers
export function withPerformanceTracking<T extends (...args: unknown[]) => unknown>(
  fn: T,
  name?: string
): T {
  return (async (...args: unknown[]) => {
    const functionName = name || fn.name || 'anonymous';
    return performanceMonitor.timeFunction(functionName, () => fn(...args));
  }) as T;
}

// Higher-order component for React components
export function withComponentPerformance<P extends object>(
  Component: React.ComponentType<P>,
  displayName?: string
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => {
    const componentName = displayName || Component.displayName || Component.name || 'Component';
    
    useEffect(() => {
      const stopTiming = performanceMonitor.startTiming(`${componentName}.mount`);
      return stopTiming;
    }, [componentName]);

    return React.createElement(Component, props);
  };

  WrappedComponent.displayName = `withPerformanceTracking(${displayName || Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Memory monitoring utilities
export function getMemoryUsage(): {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
} {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024), // MB
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024), // MB
    arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024), // MB
  };
}

// Performance middleware for API routes
interface HonoContext {
  req: { 
    method: string;
    path: string;
    header: (key: string) => string | undefined;
  };
  header: (key: string, value: string) => void;
}

export function createPerformanceMiddleware(operationName?: string) {
  return async (c: HonoContext, next: () => Promise<void>) => {
    const stopTiming = performanceMonitor.startTiming(
      operationName || `${c.req.method} ${c.req.path}`,
      {
        method: c.req.method,
        path: c.req.path,
        userAgent: c.req.header('user-agent'),
      }
    );

    try {
      await next();
    } finally {
      stopTiming();
    }
  };
}

// Log performance summary periodically
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const summary = performanceMonitor.getPerformanceSummary();
    if (summary.totalMetrics > 0) {
      console.log('📊 Performance Summary (last 5 minutes):', {
        operations: summary.totalMetrics,
        avgDuration: `${summary.avgDuration.toFixed(2)}ms`,
        slowOps: summary.slowOperations.length,
        dbQueries: summary.databaseMetrics.queryCount,
        dbAvgDuration: summary.databaseMetrics.queryCount > 0 
          ? `${(summary.databaseMetrics.totalDuration / summary.databaseMetrics.queryCount).toFixed(2)}ms`
          : '0ms',
        memory: getMemoryUsage(),
      });
    }
  }, 5 * 60 * 1000); // Every 5 minutes
}
/**
 * Performance Hooks - Utilities for optimizing React component performance
 *
 * This module provides hooks for:
 * - Safe timeout handling (prevents memory leaks)
 * - Debounced values
 * - Throttled callbacks
 * - Intersection observer for lazy loading
 * - Mounted state tracking
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ============================================================================
// MOUNTED STATE HOOK
// ============================================================================

/**
 * Track whether a component is currently mounted
 * Useful for preventing state updates after unmount
 */
export function useIsMounted(): boolean {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted.current;
}

/**
 * Get a callback that checks if component is mounted
 * Use this when you need to check mount status in async operations
 */
export function useIsMountedRef(): () => boolean {
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return useCallback(() => isMounted.current, []);
}

// ============================================================================
// SAFE TIMEOUT HOOK
// ============================================================================

/**
 * Safe timeout hook that automatically cleans up on unmount
 *
 * Returns a function to set a timeout that will be automatically cancelled
 * if the component unmounts before it fires.
 *
 * @example
 * const setSafeTimeout = useSafeTimeout();
 *
 * const handleClick = () => {
 *   setSafeTimeout(() => {
 *     // This won't run if component unmounts
 *     navigateToPage();
 *   }, 500);
 * };
 */
export function useSafeTimeout(): (callback: () => void, delay: number) => void {
  const timeoutIds = useRef<Set<NodeJS.Timeout>>(new Set());
  const isMounted = useIsMountedRef();

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutIds.current.forEach((id) => clearTimeout(id));
      timeoutIds.current.clear();
    };
  }, []);

  const setSafeTimeout = useCallback(
    (callback: () => void, delay: number) => {
      const timeoutId = setTimeout(() => {
        timeoutIds.current.delete(timeoutId);
        if (isMounted()) {
          callback();
        }
      }, delay);

      timeoutIds.current.add(timeoutId);
    },
    [isMounted]
  );

  return setSafeTimeout;
}

/**
 * Safe interval hook that automatically cleans up on unmount
 */
export function useSafeInterval(): (callback: () => void, delay: number) => () => void {
  const intervalIds = useRef<Set<NodeJS.Timeout>>(new Set());

  useEffect(() => {
    return () => {
      intervalIds.current.forEach((id) => clearInterval(id));
      intervalIds.current.clear();
    };
  }, []);

  const setSafeInterval = useCallback((callback: () => void, delay: number) => {
    const intervalId = setInterval(callback, delay);
    intervalIds.current.add(intervalId);

    // Return cleanup function
    return () => {
      clearInterval(intervalId);
      intervalIds.current.delete(intervalId);
    };
  }, []);

  return setSafeInterval;
}

// ============================================================================
// DEBOUNCE HOOK
// ============================================================================

/**
 * Debounce a value - only update after a period of no changes
 *
 * @param value - The value to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced value
 *
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 300);
 *
 * useEffect(() => {
 *   // Only search after user stops typing for 300ms
 *   performSearch(debouncedSearch);
 * }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounce a callback function
 *
 * @param callback - The function to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced callback
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref on each render
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  ) as T;

  return debouncedCallback;
}

// ============================================================================
// THROTTLE HOOK
// ============================================================================

/**
 * Throttle a callback - limit how often it can be called
 *
 * @param callback - The function to throttle
 * @param limit - Minimum time between calls in milliseconds
 * @returns Throttled callback
 */
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  limit: number
): T {
  const lastRun = useRef<number>(0);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastRun.current >= limit) {
        lastRun.current = now;
        callbackRef.current(...args);
      }
    },
    [limit]
  ) as T;

  return throttledCallback;
}

// ============================================================================
// INTERSECTION OBSERVER HOOK
// ============================================================================

interface UseIntersectionObserverOptions {
  /** Root element for intersection */
  root?: Element | null;
  /** Root margin */
  rootMargin?: string;
  /** Intersection threshold(s) */
  threshold?: number | number[];
  /** Only trigger once */
  triggerOnce?: boolean;
}

/**
 * Hook for Intersection Observer - useful for lazy loading and infinite scroll
 *
 * @example
 * const { ref, isIntersecting } = useIntersectionObserver({
 *   threshold: 0.1,
 *   triggerOnce: true,
 * });
 *
 * return (
 *   <div ref={ref}>
 *     {isIntersecting && <LazyComponent />}
 *   </div>
 * );
 */
export function useIntersectionObserver<T extends Element = Element>({
  root = null,
  rootMargin = "0px",
  threshold = 0,
  triggerOnce = false,
}: UseIntersectionObserverOptions = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const elementRef = useRef<T | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || (triggerOnce && hasTriggered)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const intersecting = entry.isIntersecting;
        setIsIntersecting(intersecting);

        if (intersecting && triggerOnce) {
          setHasTriggered(true);
          observer.disconnect();
        }
      },
      { root, rootMargin, threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [root, rootMargin, threshold, triggerOnce, hasTriggered]);

  const setRef = useCallback((node: T | null) => {
    elementRef.current = node;
  }, []);

  return { ref: setRef, isIntersecting };
}

// ============================================================================
// PREVIOUS VALUE HOOK
// ============================================================================

/**
 * Track the previous value of a prop or state
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

// ============================================================================
// STABLE CALLBACK HOOK
// ============================================================================

/**
 * Create a stable callback that always calls the latest version
 * Useful for callbacks passed to memoized children
 */
export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  callback: T
): T {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    ((...args: Parameters<T>) => {
      return callbackRef.current(...args);
    }) as T,
    []
  );
}

// ============================================================================
// MEMOIZED OBJECT HOOK
// ============================================================================

/**
 * Memoize an object by its contents rather than reference
 * Useful when creating objects in render that should be stable
 */
export function useMemoizedObject<T extends Record<string, unknown>>(obj: T): T {
  const ref = useRef(obj);

  return useMemo(() => {
    // Check if object contents changed
    const keys = Object.keys(obj);
    const prevKeys = Object.keys(ref.current);

    if (keys.length !== prevKeys.length) {
      ref.current = obj;
      return ref.current;
    }

    for (const key of keys) {
      if (obj[key] !== ref.current[key]) {
        ref.current = obj;
        return ref.current;
      }
    }

    return ref.current;
  }, [obj]);
}

// ============================================================================
// RENDER COUNT HOOK (DEV ONLY)
// ============================================================================

/**
 * Track render count for debugging (only in development)
 */
export function useRenderCount(componentName: string): void {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
    if (process.env.NODE_ENV === "development") {
      console.log(`[Render] ${componentName}: ${renderCount.current}`);
    }
  });
}

// ============================================================================
// CONDITIONAL EFFECT HOOK
// ============================================================================

/**
 * Run effect only when condition is true
 */
export function useConditionalEffect(
  effect: React.EffectCallback,
  condition: boolean,
  deps: React.DependencyList
): void {
  useEffect(() => {
    if (condition) {
      return effect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condition, ...deps]);
}

// ============================================================================
// UPDATE EFFECT HOOK
// ============================================================================

/**
 * Run effect only on updates (skip initial mount)
 */
export function useUpdateEffect(
  effect: React.EffectCallback,
  deps: React.DependencyList
): void {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Query Keys - Centralized query key factory for TanStack Query
 *
 * This module provides a single source of truth for all query keys,
 * ensuring consistent cache invalidation and efficient query management.
 *
 * Usage:
 * - Use queryKeys.* for queryKey options
 * - Use invalidateQueries with specific keys instead of invalidating all
 *
 * Key Structure:
 * - All keys follow a hierarchical structure: [entity, ...modifiers]
 * - Use the most specific key for targeted invalidation
 * - Use parent keys for broader invalidation
 */

// ============================================================================
// QUERY KEY FACTORY
// ============================================================================

/**
 * Centralized query key factory
 *
 * Keys are organized hierarchically to allow both:
 * - Specific cache updates (e.g., single task)
 * - Broad invalidation (e.g., all workspace tasks)
 */
export const queryKeys = {
  // =========================================================================
  // TASKS
  // =========================================================================

  tasks: {
    /** All task queries */
    all: ["tasks"] as const,

    /** Tasks for a specific workspace */
    byWorkspace: (workspaceId: string) =>
      ["tasks", "workspace", workspaceId] as const,

    /** Workspace tasks with filters */
    workspaceFiltered: (workspaceId: string, filters?: Record<string, unknown>) =>
      ["tasks", "workspace", workspaceId, "filtered", filters] as const,

    /** Single task by ID */
    detail: (taskId: string) =>
      ["tasks", "detail", taskId] as const,

    /** Tasks assigned to a member */
    byAssignee: (workspaceId: string, memberId: string) =>
      ["tasks", "workspace", workspaceId, "assignee", memberId] as const,

    /** Tasks in a specific service */
    byService: (workspaceId: string, serviceId: string) =>
      ["tasks", "workspace", workspaceId, "service", serviceId] as const,

    /** Tasks created by user */
    createdByUser: (userId?: string) =>
      userId
        ? ["tasks", "created-by", userId] as const
        : ["tasks", "created-by-user"] as const,

    /** Task history/activity */
    history: (taskId: string) =>
      ["tasks", "history", taskId] as const,

    /** Task comments */
    comments: (taskId: string) =>
      ["tasks", "comments", taskId] as const,

    /** Task attachments */
    attachments: (taskId: string) =>
      ["tasks", "attachments", taskId] as const,

    /** Subtasks */
    subtasks: (taskId: string) =>
      ["tasks", "subtasks", taskId] as const,
  },

  // =========================================================================
  // WORKSPACES
  // =========================================================================

  workspaces: {
    /** All workspace queries */
    all: ["workspaces"] as const,

    /** All workspaces list */
    list: () => ["workspaces", "list"] as const,

    /** Single workspace by ID */
    detail: (workspaceId: string) =>
      ["workspaces", "detail", workspaceId] as const,

    /** Workspace settings */
    settings: (workspaceId: string) =>
      ["workspaces", workspaceId, "settings"] as const,

    /** Workspace analytics */
    analytics: (workspaceId: string, dateRange?: { from?: Date; to?: Date }) =>
      ["workspaces", workspaceId, "analytics", dateRange] as const,
  },

  // =========================================================================
  // MEMBERS
  // =========================================================================

  members: {
    /** All member queries */
    all: ["members"] as const,

    /** Members for a workspace */
    byWorkspace: (workspaceId: string) =>
      ["members", "workspace", workspaceId] as const,

    /** Single member */
    detail: (memberId: string) =>
      ["members", "detail", memberId] as const,

    /** Current user's member record in workspace */
    current: (workspaceId: string) =>
      ["members", "workspace", workspaceId, "current"] as const,
  },

  // =========================================================================
  // SERVICES
  // =========================================================================

  services: {
    /** All service queries */
    all: ["services"] as const,

    /** Services for a workspace */
    byWorkspace: (workspaceId: string) =>
      ["services", "workspace", workspaceId] as const,

    /** Single service */
    detail: (serviceId: string) =>
      ["services", "detail", serviceId] as const,

    /** Service settings */
    settings: (serviceId: string) =>
      ["services", serviceId, "settings"] as const,
  },

  // =========================================================================
  // NOTIFICATIONS
  // =========================================================================

  notifications: {
    /** All notification queries */
    all: ["notifications"] as const,

    /** User notifications */
    byUser: (userId?: string) =>
      userId
        ? ["notifications", "user", userId] as const
        : ["notifications", "current-user"] as const,

    /** Unread count */
    unreadCount: (userId?: string) =>
      userId
        ? ["notifications", "unread-count", userId] as const
        : ["notifications", "unread-count"] as const,
  },

  // =========================================================================
  // USERS
  // =========================================================================

  users: {
    /** All user queries */
    all: ["users"] as const,

    /** Current user */
    current: () => ["users", "current"] as const,

    /** Single user */
    detail: (userId: string) =>
      ["users", "detail", userId] as const,

    /** User list (admin) */
    list: (filters?: Record<string, unknown>) =>
      ["users", "list", filters] as const,
  },

  // =========================================================================
  // AUTH
  // =========================================================================

  auth: {
    /** Session state */
    session: () => ["auth", "session"] as const,

    /** Current user profile */
    profile: () => ["auth", "profile"] as const,
  },
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type QueryKeys = typeof queryKeys;

// ============================================================================
// INVALIDATION HELPERS
// ============================================================================

import type { QueryClient } from "@tanstack/react-query";

/**
 * Invalidate all task-related queries for a workspace
 */
export async function invalidateWorkspaceTasks(
  queryClient: QueryClient,
  workspaceId: string
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byWorkspace(workspaceId) }),
    queryClient.invalidateQueries({ queryKey: ["workspace-tasks", workspaceId] }), // Legacy key
  ]);
}

/**
 * Invalidate a single task and its related data
 */
export async function invalidateTask(
  queryClient: QueryClient,
  taskId: string,
  workspaceId?: string
) {
  const promises = [
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.history(taskId) }),
    queryClient.invalidateQueries({ queryKey: ["task", taskId] }), // Legacy key
    queryClient.invalidateQueries({ queryKey: ["task-history", taskId] }), // Legacy key
  ];

  if (workspaceId) {
    promises.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byWorkspace(workspaceId) }),
      queryClient.invalidateQueries({ queryKey: ["workspace-tasks", workspaceId] }) // Legacy key
    );
  }

  await Promise.all(promises);
}

/**
 * Invalidate all member-related queries for a workspace
 */
export async function invalidateWorkspaceMembers(
  queryClient: QueryClient,
  workspaceId: string
) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.members.byWorkspace(workspaceId) });
}

/**
 * Invalidate all service-related queries for a workspace
 */
export async function invalidateWorkspaceServices(
  queryClient: QueryClient,
  workspaceId: string
) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.services.byWorkspace(workspaceId) });
}

/**
 * Invalidate notification queries
 */
export async function invalidateNotifications(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
}

/**
 * Invalidate workspace analytics
 */
export async function invalidateWorkspaceAnalytics(
  queryClient: QueryClient,
  workspaceId: string
) {
  await queryClient.invalidateQueries({
    queryKey: ["workspaces", workspaceId, "analytics"],
    exact: false, // Match any date range
  });
}

/**
 * Batch invalidate commonly related queries after task operations
 */
export async function invalidateAfterTaskMutation(
  queryClient: QueryClient,
  options: {
    taskId?: string;
    workspaceId?: string;
    memberId?: string;
    serviceId?: string;
  }
) {
  const { taskId, workspaceId, memberId, serviceId } = options;
  const promises: Promise<void>[] = [];

  // Task-specific invalidation
  if (taskId) {
    promises.push(invalidateTask(queryClient, taskId, workspaceId));
  }

  // Workspace-level invalidation
  if (workspaceId) {
    promises.push(invalidateWorkspaceTasks(queryClient, workspaceId));
    promises.push(invalidateWorkspaceAnalytics(queryClient, workspaceId));

    // Member-specific task cache
    if (memberId) {
      promises.push(
        queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.byAssignee(workspaceId, memberId),
        })
      );
    }

    // Service-specific task cache
    if (serviceId) {
      promises.push(
        queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.byService(workspaceId, serviceId),
        })
      );
    }
  }

  // User's created tasks
  promises.push(
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.createdByUser() })
  );

  await Promise.all(promises);
}

// ============================================================================
// PREFETCH HELPERS
// ============================================================================

/**
 * Prefetch common data for a workspace
 */
export async function prefetchWorkspaceData(
  queryClient: QueryClient,
  workspaceId: string,
  fetchFunctions: {
    fetchTasks?: () => Promise<unknown>;
    fetchMembers?: () => Promise<unknown>;
    fetchServices?: () => Promise<unknown>;
  }
) {
  const { fetchTasks, fetchMembers, fetchServices } = fetchFunctions;
  const promises: Promise<void>[] = [];

  if (fetchTasks) {
    promises.push(
      queryClient.prefetchQuery({
        queryKey: queryKeys.tasks.byWorkspace(workspaceId),
        queryFn: fetchTasks,
      })
    );
  }

  if (fetchMembers) {
    promises.push(
      queryClient.prefetchQuery({
        queryKey: queryKeys.members.byWorkspace(workspaceId),
        queryFn: fetchMembers,
      })
    );
  }

  if (fetchServices) {
    promises.push(
      queryClient.prefetchQuery({
        queryKey: queryKeys.services.byWorkspace(workspaceId),
        queryFn: fetchServices,
      })
    );
  }

  await Promise.all(promises);
}

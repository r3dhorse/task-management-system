import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createTaskSchema, updateTaskSchema } from "../schemas";
import { getMember } from "@/features/members/utils";
import { MemberRole } from "@/features/members/types";
import { z } from "zod";
import { TaskStatus, Task } from "../types";
import { TaskHistoryAction } from "../types/history";
import { detectTaskChanges } from "../utils/history";
import { generateTaskNumber } from "@/lib/task-number-generator";


const app = new Hono()

  .get(
    "/created-by-user",
    sessionMiddleware,
    zValidator(
      "query",
      z.object({
        search: z.string().nullish(),
        status: z.nativeEnum(TaskStatus).nullish(),
        serviceId: z.string().nullish(),
        workspaceId: z.string().nullish(),
        limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
        offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
      })
    ),
    async (c) => {
      const prisma = c.get("prisma");
      const user = c.get("user");
      const {
        search,
        status,
        serviceId,
        workspaceId,
        limit,
        offset
      } = c.req.valid("query");

      // Get all workspaces the user is a member of
      const userMemberships = await prisma.member.findMany({
        where: { userId: user.id },
        select: { workspaceId: true }
      });

      const workspaceIds = userMemberships.map(m => m.workspaceId);

      if (workspaceIds.length === 0) {
        return c.json({
          data: {
            documents: [],
            total: 0,
          },
        });
      }

      // Build the where clause for filtering
      interface TaskWhereClause {
        creatorId: string;
        workspaceId: { in: string[] } | string;
        serviceId?: string;
        status?: TaskStatus | { not: TaskStatus };
        AND?: Array<{
          OR?: Array<{
            name?: { contains: string; mode: 'insensitive' };
            taskNumber?: { contains: string; mode: 'insensitive' };
          }>;
        }>;
      }

      const where: TaskWhereClause = {
        creatorId: user.id,
        workspaceId: workspaceId ? workspaceId : { in: workspaceIds },
      };

      if (serviceId) {
        where.serviceId = serviceId;
      }

      if (status) {
        where.status = status;
      } else {
        // Exclude archived tasks by default
        where.status = { not: TaskStatus.ARCHIVED };
      }

      // Handle search - can search both task name and task number
      if (search) {
        // Check if search looks like a task number (contains only digits or "Task #" format)
        const isTaskNumberSearch = /^\d+$/.test(search.trim()) || /^Task #\d+$/i.test(search.trim());

        if (isTaskNumberSearch) {
          // Extract digits from search
          const digits = search.replace(/[^\d]/g, '');
          if (digits) {
            // Search for task numbers containing these digits in various formats
            const searchPatterns = [
              digits, // exact digits: 163
              digits.padStart(4, '0'), // 4-digit format: 0163
              digits.padStart(7, '0'), // 7-digit format: 0000163
            ];

            where.AND = [{
              OR: searchPatterns.map(pattern => ({
                taskNumber: { contains: pattern, mode: 'insensitive' as const }
              }))
            }];
          }
        } else {
          // Regular text search in task name and task number
          where.AND = [{
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { taskNumber: { contains: search, mode: 'insensitive' as const } }
            ]
          }];
        }
      }

      const tasks = await prisma.task.findMany({
        where,
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' }
        ],
        take: limit,
        skip: offset,
        include: {
          service: true,
          workspace: {
            select: {
              id: true,
              name: true,
            }
          },
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          },
          reviewer: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          },
          followers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          },
          collaborators: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          },
          _count: {
            select: {
              subTasks: true
            }
          }
        }
      });

      // Map tasks to the expected format
      const populatedTasks = tasks.map((task) => ({
        ...task,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        assignees: task.assignees.map(assignee => ({
          ...assignee,
          name: assignee.user.name,
          email: assignee.user.email,
        })),
        followedIds: JSON.stringify(task.followers.map(f => f.id)),
        collaboratorIds: JSON.stringify(task.collaborators.map(c => c.id)),
        subTaskCount: task._count.subTasks,
      }));

      // Get total count
      const totalCount = await prisma.task.count({ where });

      return c.json({
        data: {
          documents: populatedTasks,
          total: totalCount,
        },
      });
    }
  )

  .get(
    "/my-tasks-all",
    sessionMiddleware,
    zValidator(
      "query",
      z.object({
        search: z.string().nullish(),
        status: z.nativeEnum(TaskStatus).nullish(),
        includeArchived: z.string().optional().transform(val => val === "true"),
        limit: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
        offset: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
      })
    ),
    async (c) => {
      const prisma = c.get("prisma");
      const user = c.get("user");
      const {
        search,
        status,
        includeArchived,
        limit,
        offset
      } = c.req.valid("query");

      // Get all workspaces the user is a member of
      const userMemberships = await prisma.member.findMany({
        where: { userId: user.id },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      });

      if (userMemberships.length === 0) {
        return c.json({
          data: {
            documents: [],
            total: 0,
          },
        });
      }

      const memberIds = userMemberships.map(m => m.id);
      const workspaceIds = userMemberships.map(m => m.workspaceId);

      // Build the where clause for filtering
      interface TaskWhereClause {
        workspaceId: { in: string[] };
        assignees?: { some: { id: { in: string[] } } };
        status?: TaskStatus | { not: TaskStatus };
        AND?: Array<{
          OR?: Array<{
            name?: { contains: string; mode: 'insensitive' };
            taskNumber?: { contains: string; mode: 'insensitive' };
            isConfidential?: boolean;
            creatorId?: string;
            assignees?: { some: { id: { in: string[] } } };
            reviewerId?: { in: string[] };
            followers?: {
              some: {
                id: { in: string[] };
              };
            };
            collaborators?: {
              some: {
                id: { in: string[] };
              };
            };
          }>;
        }>;
        OR?: Array<{
          isConfidential?: boolean;
          creatorId?: string;
          assignees?: { some: { id: { in: string[] } } };
          reviewerId?: { in: string[] };
          followers?: {
            some: {
              id: { in: string[] };
            };
          };
          collaborators?: {
            some: {
              id: { in: string[] };
            };
          };
        }>;
      }

      const where: TaskWhereClause = {
        workspaceId: { in: workspaceIds },
        assignees: { some: { id: { in: memberIds } } }, // User is assigned to the task via one of their member records
      };

      if (status) {
        where.status = status;
      } else {
        // Only exclude archived tasks if user hasn't explicitly requested them
        if (!includeArchived) {
          where.status = { not: TaskStatus.ARCHIVED };
        }
      }

      // Handle search - can search both task name and task number
      if (search) {
        const isTaskNumberSearch = /^\d+$/.test(search.trim()) || /^Task #\d+$/i.test(search.trim());

        if (isTaskNumberSearch) {
          const digits = search.replace(/[^\d]/g, '');
          if (digits) {
            const searchPatterns = [
              digits,
              digits.padStart(4, '0'),
              digits.padStart(7, '0'),
            ];

            where.AND = [{
              OR: searchPatterns.map(pattern => ({
                taskNumber: { contains: pattern, mode: 'insensitive' as const }
              }))
            }];
          }
        } else {
          where.AND = [{
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { taskNumber: { contains: search, mode: 'insensitive' as const } }
            ]
          }];
        }
      }

      // Add confidential task filtering
      const confidentialFilter = [
        { isConfidential: false },
        { isConfidential: true, creatorId: user.id },
        { isConfidential: true, assignees: { some: { id: { in: memberIds } } } },
        { isConfidential: true, reviewerId: { in: memberIds } },
        { isConfidential: true, followers: { some: { id: { in: memberIds } } } },
        { isConfidential: true, collaborators: { some: { id: { in: memberIds } } } },
      ];

      // Combine search filter with confidential filter
      if (where.AND && where.AND.length > 0) {
        where.AND.push({ OR: confidentialFilter });
      } else {
        where.OR = confidentialFilter;
      }

      const tasks = await prisma.task.findMany({
        where,
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' }
        ],
        take: limit,
        skip: offset,
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
            }
          },
          service: true,
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          },
          reviewer: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          },
          followers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          },
          collaborators: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          },
          _count: {
            select: {
              subTasks: true
            }
          }
        }
      });

      // Map tasks to the expected format
      const populatedTasks = tasks.map((task) => ({
        ...task,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        assignees: task.assignees.map(assignee => ({
          ...assignee,
          name: assignee.user.name,
          email: assignee.user.email,
        })),
        followedIds: JSON.stringify(task.followers.map(f => f.id)),
        collaboratorIds: JSON.stringify(task.collaborators.map(c => c.id)),
        subTaskCount: task._count.subTasks,
      }));

      // Get total count
      const totalCount = await prisma.task.count({ where });

      return c.json({
        data: {
          documents: populatedTasks,
          total: totalCount,
        },
      });
    }
  )

  .delete(
    "/:taskId",
    sessionMiddleware,
    async (c) => {
      const user = c.get("user");
      const prisma = c.get("prisma");
      const { taskId } = c.req.param();

      // Validate taskId format
      if (!taskId || taskId.length > 36 || !/^[a-zA-Z0-9_-]+$/.test(taskId)) {
        return c.json({ error: "Invalid task ID format" }, 400);
      }

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          assignees: true,
          followers: true,
          collaborators: true,
        }
      });

      if (!task) {
        return c.json({ error: "Task not found" }, 404);
      }

      const member = await getMember({
        prisma,
        workspaceId: task.workspaceId,
        userId: user.id
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401)
      }

      // Check access to confidential tasks
      if (task.isConfidential) {
        const hasConfidentialAccess =
          task.creatorId === user.id || // User created the task
          task.assignees.some(a => a.id === member.id) || // User is assigned to the task
          task.reviewerId === member.id || // User is the reviewer of the task
          task.followers.some(f => f.id === member.id) || // Customer is following the task
          task.collaborators.some(c => c.id === member.id); // Team member is collaborating

        if (!hasConfidentialAccess) {
          return c.json({ error: "You don't have access to this confidential task" }, 403);
        }
      }

      // Check archive permissions based on task status
      const isWorkspaceAdmin = member.role === MemberRole.ADMIN;
      const isCreator = task.creatorId === user.id;
      const isAssignee = task.assignees.some(a => a.id === member.id);
      const isSuperAdmin = user.isAdmin || false;

      // For DONE tasks, only admins can archive
      // For other tasks, creator, assignee, or admin can archive
      const canArchive = task.status === TaskStatus.DONE
        ? (isWorkspaceAdmin || isSuperAdmin)
        : (isCreator || isAssignee || isWorkspaceAdmin || isSuperAdmin);

      if (!canArchive) {
        if (task.status === TaskStatus.DONE) {
          return c.json({ error: "Only workspace administrators can archive completed tasks" }, 403);
        } else {
          return c.json({ error: "Only the task creator, assignee, or workspace administrator can archive this task" }, 403);
        }
      }

      // Archive the task by setting status to ARCHIVED for audit purposes
      const archivedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.ARCHIVED,
        }
      });

      return c.json({ data: { id: archivedTask.id } });
    }
  )

  .get(
    "/",
    sessionMiddleware,
    zValidator(
      "query",
      z.object({
        workspaceId: z.string(),
        serviceId: z.string().nullish(),
        assigneeId: z.string().nullish(),
        status: z.nativeEnum(TaskStatus).nullish(),
        search: z.string().nullish(),
        dueDate: z.string().nullish(),
        includeArchived: z.string().optional().transform(val => val === "true"),
        limit: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
        offset: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
      })
    ),
    async (c) => {
      const prisma = c.get("prisma");
      const user = c.get("user");
      const {
        workspaceId,
        serviceId,
        status,
        search,
        assigneeId,
        dueDate,
        includeArchived,
        limit,
        offset
      } = c.req.valid("query");


      const member = await getMember({
        prisma,
        workspaceId,
        userId: user.id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Build the where clause for filtering
      interface TaskWhereClause {
        workspaceId: string;
        serviceId?: string;
        status?: TaskStatus | { not: TaskStatus };
        assignees?: { some: { id: string } };
        dueDate?: Date;
        followers?: {
          some: {
            id: string;
            userId?: string;
          };
        };
        AND?: Array<{
          OR?: Array<{
            name?: { contains: string; mode: 'insensitive' };
            taskNumber?: { contains: string; mode: 'insensitive' };
            isConfidential?: boolean;
            creatorId?: string;
            assignees?: { some: { id: string } };
            followers?: {
              some: {
                id?: string;
                userId?: string;
              };
            };
            collaborators?: {
              some: {
                id?: string;
                userId?: string;
              };
            };
          }>;
        }>;
        OR?: Array<{
          isConfidential?: boolean;
          creatorId?: string;
          assignees?: { some: { id: string } };
          followers?: {
            some: {
              id?: string;
              userId?: string;
            };
          };
          collaborators?: {
            some: {
              id?: string;
              userId?: string;
            };
          };
        }>;
      }

      const where: TaskWhereClause = {
        workspaceId,
      };

      if (serviceId) {
        where.serviceId = serviceId;
      }

      if (status) {
        where.status = status;

        // If filtering for archived status, user must have permission to view archived tasks
        if (status === TaskStatus.ARCHIVED) {
          const canViewArchived = member.role === MemberRole.ADMIN || member.role === MemberRole.MEMBER;
          if (!canViewArchived) {
            return c.json({
              data: {
                documents: [],
                total: 0
              }
            });
          }
        }
      } else {
        // Only exclude archived tasks if no specific status filter is applied
        // and user hasn't explicitly requested to include archived tasks
        const canViewArchived = member.role === MemberRole.ADMIN || member.role === MemberRole.MEMBER;
        if (!includeArchived || !canViewArchived) {
          where.status = { not: TaskStatus.ARCHIVED };
        }
      }

      if (assigneeId) {
        where.assignees = { some: { id: assigneeId } };
      }

      if (dueDate) {
        where.dueDate = new Date(dueDate);
      }

      // Handle search - can search both task name and task number
      if (search) {
        // Check if search looks like a task number (contains only digits or "Task #" format)
        const isTaskNumberSearch = /^\d+$/.test(search.trim()) || /^Task #\d+$/i.test(search.trim());

        if (isTaskNumberSearch) {
          // Extract digits from search
          const digits = search.replace(/[^\d]/g, '');
          if (digits) {
            // Search for task numbers containing these digits in various formats
            const searchPatterns = [
              digits, // exact digits: 163
              digits.padStart(4, '0'), // 4-digit format: 0163
              digits.padStart(7, '0'), // 7-digit format: 0000163
            ];

            where.AND = [{
              OR: searchPatterns.map(pattern => ({
                taskNumber: { contains: pattern, mode: 'insensitive' as const }
              }))
            }];
          }
        } else {
          // Regular text search in task name and task number
          where.AND = [{
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { taskNumber: { contains: search, mode: 'insensitive' as const } }
            ]
          }];
        }
      }

      // Add confidential task filtering to the where clause
      // Users can see confidential tasks if they are the creator, assignee, reviewer, follower, or collaborator
      const confidentialFilter = [
        { isConfidential: false }, // Non-confidential tasks are visible to everyone
        { isConfidential: true, creatorId: user.id }, // User created the task
        { isConfidential: true, assignees: { some: { id: member.id } } }, // User is assigned to the task
        { isConfidential: true, reviewerId: member.id }, // User is the reviewer of the task
        { isConfidential: true, followers: { some: { id: member.id } } }, // Customer is following the task
        { isConfidential: true, collaborators: { some: { id: member.id } } }, // Team member is collaborating
      ];

      // For customers, add additional filtering to only show tasks they are following
      if (member.role === MemberRole.CUSTOMER) {
        where.followers = { some: { id: member.id } };
      } else {
        // Combine search filter with confidential filter using AND
        if (where.AND && where.AND.length > 0) {
          // We already have search filters, add confidential filter to AND array
          where.AND.push({ OR: confidentialFilter });
        } else {
          // No search filters, just add confidential filter as OR
          where.OR = confidentialFilter;
        }
      }

      const tasks = await prisma.task.findMany({
        where,
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' }  // Secondary sort by ID for stable pagination
        ],
        take: limit,
        skip: offset,
        include: {
          service: true,
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          },
          reviewer: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          },
          followers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          },
          collaborators: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          },
          _count: {
            select: {
              subTasks: true
            }
          }
        }
      });

      // Map tasks to the expected format (filtering is now done at database level)
      const populatedTasks = tasks.map((task) => ({
        ...task,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        assignees: task.assignees.map(assignee => ({
          ...assignee,
          name: assignee.user.name,
          email: assignee.user.email,
        })),
        followedIds: JSON.stringify(task.followers.map(f => f.id)),
        collaboratorIds: JSON.stringify(task.collaborators.map(c => c.id)),
        subTaskCount: task._count.subTasks,
      }));

      // Get the actual total count AFTER loading to ensure consistency
      // We need to get total from a separate query to ensure pagination works correctly
      const totalCount = await prisma.task.count({ where });

      return c.json({
        data: {
          documents: populatedTasks,
          total: totalCount,
        },
      });
    }
  )

  .post(
    "/",
    sessionMiddleware,
    zValidator("json", createTaskSchema),
    async (c) => {
      try {
        const user = c.get("user");
        const prisma = c.get("prisma");

        const {
          name,
          status,
          workspaceId,
          serviceId,
          dueDate,
          assigneeIds,
          reviewerId,
          description,
          attachmentId,
          followedIds,
          collaboratorIds,
          isConfidential,
        } = c.req.valid("json");

        const member = await getMember({
          prisma,
          workspaceId,
          userId: user.id,
        });

        if (!member) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        const highestPositionTask = await prisma.task.findFirst({
          where: {
            status,
            workspaceId,
          },
          orderBy: {
            position: 'desc',
          },
        });

        const newPosition = highestPositionTask ? highestPositionTask.position + 1000 : 1000;

        // Generate the next task number
        const taskNumber = await generateTaskNumber(prisma);

        // Parse assignee IDs from JSON string
        let parsedAssigneeIds: string[] = [];
        if (assigneeIds) {
          try {
            const parsed = JSON.parse(assigneeIds);
            if (Array.isArray(parsed)) {
              parsedAssigneeIds = parsed.filter((id: unknown) =>
                id && typeof id === 'string' && id.trim().length > 0
              ) as string[];
            }
          } catch {
            // Invalid JSON, ignore
          }
        }

        // Prepare followers (customers following the task)
        const followerIds: string[] = [];
        if (followedIds) {
          try {
            const parsedIds = JSON.parse(followedIds);
            if (Array.isArray(parsedIds)) {
              // Filter out null, undefined, empty strings, and non-string values
              const validIds = parsedIds.filter((id: unknown) =>
                id && typeof id === 'string' && id.trim().length > 0
              ) as string[];
              followerIds.push(...validIds);
            }
          } catch {
            // Invalid JSON, ignore
          }
        }

        // Prepare collaborators (team members working on the task)
        let collaboratorIdsList: string[] = [];
        if (collaboratorIds) {
          try {
            const parsedIds = JSON.parse(collaboratorIds);
            if (Array.isArray(parsedIds)) {
              const validIds = parsedIds.filter((id: unknown) =>
                id && typeof id === 'string' && id.trim().length > 0
              ) as string[];
              collaboratorIdsList.push(...validIds);
            }
          } catch {
            // Invalid JSON, ignore
          }
        }

        // Ensure creator is always included in collaborators (if they are a team member and not an assignee)
        if (member.role !== MemberRole.CUSTOMER && !collaboratorIdsList.includes(member.id) && !parsedAssigneeIds.includes(member.id)) {
          collaboratorIdsList.push(member.id);
        }

        // IMPORTANT: Remove assignees from collaborators to avoid redundancy
        // Assignees already have full access to monitor the task
        collaboratorIdsList = collaboratorIdsList.filter(id => !parsedAssigneeIds.includes(id));

        // Also remove assignees from followers for consistency
        const filteredFollowerIds = followerIds.filter(id => !parsedAssigneeIds.includes(id));

        // Validate required fields and convert string 'undefined' to proper values
        if (!serviceId || serviceId === 'undefined' || serviceId === '') {
          return c.json({ error: "Service is required" }, 400);
        }

        const task = await prisma.task.create({
          data: {
            taskNumber,
            name,
            status,
            workspaceId,
            serviceId,
            dueDate: new Date(dueDate), // dueDate is now required
            reviewerId: reviewerId === 'undefined' || !reviewerId ? null : reviewerId,
            description,
            position: newPosition,
            attachmentId: attachmentId === 'undefined' || !attachmentId ? null : attachmentId,
            creatorId: user.id,
            isConfidential: isConfidential || false,
            assignees: {
              connect: parsedAssigneeIds.map(id => ({ id }))
            },
            followers: {
              connect: filteredFollowerIds.map(id => ({ id }))
            },
            collaborators: {
              connect: collaboratorIdsList.map(id => ({ id }))
            }
          },
          include: {
            service: true,
            assignees: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  }
                }
              }
            },
            reviewer: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  }
                }
              }
            }
          }
        });

        // Create history entry for task creation
        try {
          await prisma.taskHistory.create({
            data: {
              taskId: task.id,
              userId: user.id,
              action: TaskHistoryAction.CREATED,
            }
          });
        } catch (historyError) {
          console.error("Failed to create task history entry:", historyError);
          // Don't fail the task creation if history fails
        }

        // Create task assignment notifications for all assignees
        for (const assignee of task.assignees) {
          if (assignee.id !== member.id) {
            try {
              await prisma.notification.create({
                data: {
                  userId: assignee.userId,
                  type: "TASK_ASSIGNED",
                  title: "Task assigned to you",
                  message: `${user.name || 'Someone'} assigned you to task "${task.name}"`,
                  workspaceId: task.workspaceId,
                  taskId: task.id,
                  mentionedBy: user.id,
                }
              });
            } catch (notificationError) {
              console.error("Failed to create task assignment notification:", notificationError);
              // Don't fail task creation if notification fails
            }
          }
        }

        return c.json({ 
          data: {
            ...task,
            dueDate: task.dueDate ? task.dueDate.toISOString() : null,
            createdAt: task.createdAt.toISOString(),
            updatedAt: task.updatedAt.toISOString(),
          }
        });
      } catch (error) {
        console.error("Task creation error:", error);
        return c.json({ error: error instanceof Error ? error.message : "Failed to create task" }, 500);
      }
    }
  )

  .patch(
    "/:taskId",
    sessionMiddleware,
    zValidator("json", updateTaskSchema),
    async (c) => {
      try {
        const user = c.get("user");
        const prisma = c.get("prisma");

        const {
          name,
          status,
          serviceId,
          workspaceId,
          dueDate,
          assigneeIds,
          reviewerId,
          description,
          attachmentId,
          followedIds,
          collaboratorIds,
          isConfidential,
        } = c.req.valid("json");


        const { taskId } = c.req.param();

        // Validate taskId format
        if (!taskId || taskId.length > 36 || !/^[a-zA-Z0-9_-]+$/.test(taskId)) {
          return c.json({ error: "Invalid task ID format" }, 400);
        }

        const existingTask = await prisma.task.findUnique({
          where: { id: taskId },
          include: {
            followers: true,
            collaborators: true,
            assignees: true,
          }
        });

        if (!existingTask) {
          return c.json({ error: "Task not found" }, 404);
        }

        const member = await getMember({
          prisma,
          workspaceId: existingTask.workspaceId,
          userId: user.id,
        });

        if (!member) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        // Check access to confidential tasks
        if (existingTask.isConfidential) {
          const hasConfidentialAccess =
            existingTask.creatorId === user.id || // User created the task
            existingTask.assignees.some(a => a.id === member.id) || // User is assigned to the task
            existingTask.reviewerId === member.id || // User is the reviewer of the task
            existingTask.followers.some(f => f.id === member.id) || // Customer is following the task
            existingTask.collaborators.some(c => c.id === member.id); // Team member is collaborating

          if (!hasConfidentialAccess) {
            return c.json({ error: "You don't have access to this confidential task" }, 403);
          }
        }

        // Permission checks based on task status and user roles
        const isCurrentAssignee = existingTask.assignees.some(a => a.id === member.id);
        const isCurrentReviewer = existingTask.reviewerId === member.id;
        const isFollower = existingTask.followers.some(f => f.id === member.id);
        const isCollaborator = existingTask.collaborators.some(c => c.id === member.id);
        const isWorkspaceAdmin = member.role === MemberRole.ADMIN;
        const isWorkspaceMember = member.role === MemberRole.MEMBER;
        const isCustomer = member.role === MemberRole.CUSTOMER;

        // Global restriction: Customers cannot change task status at all
        if (isCustomer && status !== undefined && status !== existingTask.status) {
          return c.json({ error: "Customers cannot change task status" }, 403);
        }

        // Check if trying to mark task as DONE when it has incomplete sub-tasks
        if (status === TaskStatus.DONE && status !== existingTask.status) {
          const incompleteSubTasks = await prisma.task.count({
            where: {
              parentTaskId: taskId,
              status: {
                not: TaskStatus.DONE
              }
            }
          });

          if (incompleteSubTasks > 0) {
            return c.json({
              error: `Cannot mark task as done. There are ${incompleteSubTasks} incomplete sub-task(s) that must be completed first.`
            }, 400);
          }
        }

        // Check if user can update task based on current status
        if (existingTask.status === TaskStatus.TODO) {
          // TODO status: all workspace members and customers can update (except status change for customers, handled above)
          // No additional restrictions needed - everyone can update TODO tasks
        } else if (existingTask.status === TaskStatus.IN_REVIEW) {
          // In Review status: reviewers have full edit permissions, other workspace members can also update
          // This allows reviewers to perform their review duties
          if (isCurrentReviewer) {
            // Reviewer has full permissions to edit IN_REVIEW tasks
          } else if (!isWorkspaceAdmin && !isWorkspaceMember && !isCurrentAssignee && !isFollower && !isCollaborator) {
            // Only allow workspace members, assignee, followers, collaborators, or admin to edit if not the reviewer
            return c.json({ error: "Only the reviewer, assignee, followers, collaborators, or workspace members can update tasks in review" }, 403);
          }
        } else if (existingTask.status === TaskStatus.IN_PROGRESS) {
          // In Progress status: only assignee, collaborators, and followers (with member role) can update
          // Exception: Allow anyone to move task from IN_PROGRESS to IN_REVIEW
          const isMovingToReview = status === TaskStatus.IN_REVIEW && existingTask.status === TaskStatus.IN_PROGRESS;

          if (!isMovingToReview) {
            // For other updates, only assignee, collaborators, and followers can update
            const canUpdate = isCurrentAssignee ||
                             isCollaborator ||
                             (isFollower && (isWorkspaceMember || isWorkspaceAdmin)) ||
                             isWorkspaceAdmin;

            if (!canUpdate) {
              return c.json({ error: "Only the assignee, collaborators, and followers (with member role) can update tasks in progress" }, 403);
            }
          }
        } else if (existingTask.status === TaskStatus.DONE) {
          // DONE status: only workspace admins can update tasks already in DONE
          // Exception: Allow moving FROM other statuses TO DONE (e.g., from IN_REVIEW to DONE)
          const isMovingToDone = status === TaskStatus.DONE && existingTask.status !== TaskStatus.DONE;
          if (!isMovingToDone && !isWorkspaceAdmin) {
            return c.json({ error: "Only workspace administrators can update completed tasks" }, 403);
          }
        } else {
          // For other statuses (BACKLOG, ARCHIVED), no special restrictions
          // All members can update, customers can update fields but not status (handled above)
        }

        // Parse assignee IDs from JSON string for update
        let parsedAssigneeIds: string[] | undefined = undefined;
        if (assigneeIds !== undefined) {
          try {
            const parsed = JSON.parse(assigneeIds);
            if (Array.isArray(parsed)) {
              parsedAssigneeIds = parsed.filter((id: unknown) =>
                id && typeof id === 'string' && id.trim().length > 0
              ) as string[];
            } else {
              parsedAssigneeIds = [];
            }
          } catch {
            parsedAssigneeIds = [];
          }
        }

        // Assignee transfer restrictions
        const existingAssigneeIds = existingTask.assignees.map(a => a.id);
        const assigneesChanged = parsedAssigneeIds !== undefined &&
          (parsedAssigneeIds.length !== existingAssigneeIds.length ||
           !parsedAssigneeIds.every(id => existingAssigneeIds.includes(id)));

        if (assigneesChanged) {
          // Allow self-assignment if task has no assignees
          const isSelfAssignment = existingAssigneeIds.length === 0 &&
            parsedAssigneeIds!.length === 1 &&
            parsedAssigneeIds![0] === member.id;

          // Allow assignment if:
          // 1. User is workspace admin
          // 2. User is one of the current assignees (can modify assignments)
          // 3. Task has no assignees and user is assigning to themselves
          if (!isWorkspaceAdmin && !isCurrentAssignee && !isSelfAssignment) {
            return c.json({ error: "Only the current assignees or workspace admin can modify task assignments" }, 403);
          }
        }

        // Workspace change validation
        if (workspaceId !== undefined && workspaceId !== existingTask.workspaceId) {
          // Check if user is a member of the target workspace
          const targetMember = await getMember({
            prisma,
            workspaceId: workspaceId,
            userId: user.id,
          });

          if (!targetMember) {
            return c.json({ error: "You must be a member of the target workspace to move tasks" }, 403);
          }

          // Validate that the service is public if moving between workspaces
          if (serviceId) {
            const service = await prisma.service.findUnique({
              where: { id: serviceId },
            });

            if (!service) {
              return c.json({ error: "Selected service not found" }, 404);
            }

            if (service.workspaceId !== workspaceId) {
              return c.json({ error: "Service must belong to the target workspace" }, 400);
            }

            if (!service.isPublic) {
              return c.json({ error: "Only public services can be used when moving tasks between workspaces" }, 400);
            }
          } else {
            return c.json({ error: "Service selection is required when moving tasks between workspaces" }, 400);
          }

        }

        const updateData: {
          name?: string;
          serviceId?: string;
          workspaceId?: string;
          dueDate?: Date | null;
          reviewerId?: string | null;
          description?: string;
          attachmentId?: string | null;
          isConfidential?: boolean;
          status?: TaskStatus;
          position?: number;
          assignees?: { set: { id: string }[] };
          followers?: { set: { id: string }[] };
          collaborators?: { set: { id: string }[] };
        } = {};

        // Handle workspace change - filter followers who don't have access to target workspace
        const isWorkspaceTransfer = workspaceId !== undefined && workspaceId !== existingTask.workspaceId;
        if (isWorkspaceTransfer) {
          updateData.workspaceId = workspaceId;
          updateData.reviewerId = null; // Always reset reviewer

          // Set default status to TODO when transferring to new workspace
          updateData.status = TaskStatus.TODO;

          // Handle assignees based on task confidentiality
          const isConfidentialTask = isConfidential !== undefined ? isConfidential : existingTask.isConfidential;

          if (isConfidentialTask) {
            // For confidential tasks, at least one assignee must be present
            if (!parsedAssigneeIds || parsedAssigneeIds.length === 0) {
              return c.json({ error: "At least one assignee is required when transferring confidential tasks to another workspace" }, 400);
            }

            // Validate that all assignees are members of the target workspace
            for (const assigneeId of parsedAssigneeIds) {
              const targetAssignee = await prisma.member.findUnique({
                where: { id: assigneeId },
              });

              if (!targetAssignee || targetAssignee.workspaceId !== workspaceId || targetAssignee.role === MemberRole.CUSTOMER) {
                return c.json({ error: "All assignees must be members (not customers) of the target workspace for confidential tasks" }, 400);
              }
            }
          } else {
            // For non-confidential tasks, reset assignees to empty (unassigned)
            updateData.assignees = { set: [] };
          }

          // Auto-register followers as customers to the target workspace if they're not already members
          // Optimized batch processing to avoid N+1 queries
          const followerIds = existingTask.followers.map(f => f.id);

          // Batch fetch all follower member data with users
          const followerMembers = await prisma.member.findMany({
            where: { id: { in: followerIds } },
            include: { user: true },
          });

          const followerUserIds = followerMembers.map(fm => fm.userId);

          // Batch check existing memberships in target workspace
          const existingMemberships = await prisma.member.findMany({
            where: {
              userId: { in: followerUserIds },
              workspaceId: workspaceId,
            },
          });

          const existingUserIds = new Set(existingMemberships.map(m => m.userId));
          const targetFollowerMembershipIds = [];

          // Add existing memberships
          targetFollowerMembershipIds.push(...existingMemberships.map(m => m.id));

          // Identify users who need customer memberships
          const usersNeedingMembership = followerMembers.filter(
            fm => !existingUserIds.has(fm.userId)
          );

          // Batch create customer memberships for users not in target workspace
          if (usersNeedingMembership.length > 0) {
            try {
              await prisma.member.createMany({
                data: usersNeedingMembership.map(fm => ({
                  userId: fm.userId,
                  workspaceId: workspaceId,
                  role: MemberRole.CUSTOMER,
                })),
                skipDuplicates: true, // Handle concurrent creation attempts
              });

              // Get the created membership IDs
              const createdMemberships = await prisma.member.findMany({
                where: {
                  userId: { in: usersNeedingMembership.map(fm => fm.userId) },
                  workspaceId: workspaceId,
                },
              });

              targetFollowerMembershipIds.push(...createdMemberships.map(m => m.id));
            } catch (error) {
              console.error("Failed to batch create customer memberships:", error);
              // Fallback: try to find existing memberships in case of race condition
              const fallbackMemberships = await prisma.member.findMany({
                where: {
                  userId: { in: usersNeedingMembership.map(fm => fm.userId) },
                  workspaceId: workspaceId,
                },
              });
              targetFollowerMembershipIds.push(...fallbackMemberships.map(m => m.id));
            }
          }

          // Set the followers to the new membership IDs in the target workspace
          updateData.followers = {
            set: targetFollowerMembershipIds.map(id => ({ id }))
          };

          // Update all task messages to the new workspace to preserve team chat
          await prisma.taskMessage.updateMany({
            where: {
              taskId: taskId,
            },
            data: {
              workspaceId: workspaceId,
            },
          });
        }

        if (name !== undefined) updateData.name = name;
        if (serviceId !== undefined) updateData.serviceId = serviceId;
        if (workspaceId !== undefined && workspaceId === existingTask.workspaceId) updateData.workspaceId = workspaceId;
        if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
        if (parsedAssigneeIds !== undefined && !isWorkspaceTransfer) {
          updateData.assignees = { set: parsedAssigneeIds.map(id => ({ id })) };
        }
        if (reviewerId !== undefined) updateData.reviewerId = reviewerId === 'undefined' || !reviewerId ? null : reviewerId;
        if (description !== undefined) updateData.description = description;
        if (attachmentId !== undefined) updateData.attachmentId = attachmentId === 'undefined' || !attachmentId ? null : attachmentId;
        if (isConfidential !== undefined) updateData.isConfidential = isConfidential;

        // Only include status if user is not a customer
        if (member.role !== MemberRole.CUSTOMER && status !== undefined) {
          updateData.status = status;
        }

        // Handle followers update (for customers - skip if workspace is being transferred as it's already handled above)
        if (followedIds !== undefined && !isWorkspaceTransfer) {
          try {
            const parsedIds = JSON.parse(followedIds);
            if (Array.isArray(parsedIds)) {
              // Filter out null, undefined, empty strings, and non-string values
              let validIds = parsedIds.filter((id: unknown) =>
                id && typeof id === 'string' && id.trim().length > 0
              ) as string[];

              // IMPORTANT: Remove assignees from followers to avoid redundancy
              // Get the effective assignees (either new ones being set or existing ones)
              const effectiveAssigneeIds = parsedAssigneeIds !== undefined
                ? parsedAssigneeIds
                : existingTask.assignees.map(a => a.id);
              validIds = validIds.filter(id => !effectiveAssigneeIds.includes(id));

              // Use the target workspace ID if provided, otherwise use existing
              const targetWorkspaceId = updateData.workspaceId || existingTask.workspaceId;

              // Verify that these member IDs exist in the workspace
              const existingMembers = await prisma.member.findMany({
                where: {
                  id: { in: validIds },
                  workspaceId: targetWorkspaceId
                }
              });

              const existingMemberIds = existingMembers.map(m => m.id);
              updateData.followers = {
                set: existingMemberIds.map((id: string) => ({ id }))
              };
            }
          } catch (error) {
            console.error("Error processing followers:", error);
            // Invalid JSON, ignore followers update
          }
        }

        // Handle collaborators update (for team members - skip if workspace is being transferred)
        if (collaboratorIds !== undefined && !isWorkspaceTransfer) {
          try {
            const parsedIds = JSON.parse(collaboratorIds);
            if (Array.isArray(parsedIds)) {
              // Filter out null, undefined, empty strings, and non-string values
              let validIds = parsedIds.filter((id: unknown) =>
                id && typeof id === 'string' && id.trim().length > 0
              ) as string[];

              // IMPORTANT: Remove assignees from collaborators to avoid redundancy
              // Assignees already have full access to monitor the task
              const effectiveAssigneeIds = parsedAssigneeIds !== undefined
                ? parsedAssigneeIds
                : existingTask.assignees.map(a => a.id);
              validIds = validIds.filter(id => !effectiveAssigneeIds.includes(id));

              // Use the target workspace ID if provided, otherwise use existing
              const targetWorkspaceId = updateData.workspaceId || existingTask.workspaceId;

              // Verify that these member IDs exist in the workspace
              const existingMembers = await prisma.member.findMany({
                where: {
                  id: { in: validIds },
                  workspaceId: targetWorkspaceId
                }
              });

              const existingMemberIds = existingMembers.map(m => m.id);
              updateData.collaborators = {
                set: existingMemberIds.map((id: string) => ({ id }))
              };
            }
          } catch (error) {
            console.error("Error processing collaborators:", error);
            // Invalid JSON, ignore collaborators update
          }
        } else if (parsedAssigneeIds && parsedAssigneeIds.length > 0 && !isWorkspaceTransfer) {
          // If collaborators are not being explicitly updated but assignees are changing,
          // remove any new assignees from current collaborators
          const currentCollaboratorIds = existingTask.collaborators.map(c => c.id);
          const newCollaboratorIds = currentCollaboratorIds.filter(id => !parsedAssigneeIds.includes(id));

          // Only update if there are changes
          if (newCollaboratorIds.length !== currentCollaboratorIds.length) {
            updateData.collaborators = {
              set: newCollaboratorIds.map((id: string) => ({ id }))
            };
          }
        }


        // Detect what changed for history tracking
        const updatePayload = c.req.valid("json");
        // Convert Prisma task to match the expected format
        // Include assigneeIds as JSON string for comparison with update payload
        const currentAssigneeIds = JSON.stringify(existingTask.assignees.map(a => a.id));
        const taskForComparison: Task & { assigneeIds?: string } = {
          id: existingTask.id,
          taskNumber: existingTask.taskNumber,
          name: existingTask.name,
          status: existingTask.status as TaskStatus,
          workspaceId: existingTask.workspaceId,
          reviewerId: existingTask.reviewerId,
          serviceId: existingTask.serviceId,
          position: existingTask.position,
          dueDate: existingTask.dueDate?.toISOString() || null,
          description: existingTask.description,
          attachmentId: existingTask.attachmentId,
          followedIds: JSON.stringify(existingTask.followers.map(f => f.id)),
          collaboratorIds: JSON.stringify(existingTask.collaborators.map(c => c.id)),
          creatorId: existingTask.creatorId,
          isConfidential: existingTask.isConfidential,
          createdAt: existingTask.createdAt.toISOString(),
          updatedAt: existingTask.updatedAt.toISOString(),
          assigneeIds: currentAssigneeIds,
        };
        const changes = detectTaskChanges(taskForComparison, updatePayload);

        const task = await prisma.task.update({
          where: { id: taskId },
          data: updateData,
          include: {
            service: true,
            assignees: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  }
                }
              }
            },
            reviewer: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  }
                }
              }
            },
            followers: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  }
                }
              }
            },
            collaborators: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  }
                }
              }
            }
          }
        });


        // Create task assignment notifications for new assignees
        if (assigneesChanged && parsedAssigneeIds) {
          // Find new assignees (in new list but not in old list)
          const newAssignees = parsedAssigneeIds.filter(id => !existingAssigneeIds.includes(id));
          for (const assigneeId of newAssignees) {
            if (assigneeId !== member.id) {
              try {
                const assigneeMember = await prisma.member.findUnique({
                  where: { id: assigneeId },
                  include: { user: true }
                });

                if (assigneeMember) {
                  await prisma.notification.create({
                    data: {
                      userId: assigneeMember.userId,
                      type: "TASK_ASSIGNED",
                      title: "Task assigned to you",
                      message: `${user.name || 'Someone'} assigned you to task "${task.name}"`,
                      workspaceId: task.workspaceId,
                      taskId: task.id,
                      mentionedBy: user.id,
                    }
                  });
                }
              } catch (notificationError) {
                console.error("Failed to create task assignment notification:", notificationError);
                // Don't fail task update if notification fails
              }
            }
          }
        }

        // Create task update notifications for followers and collaborators (for significant changes)
        const significantChanges = changes.filter(change =>
          ['status', 'assigneeIds', 'serviceId', 'dueDate', 'name', 'description'].includes(change.field)
        );

        if (significantChanges.length > 0) {
          try {
            // Get all followers and collaborators with their user information
            const allRecipientIds = [
              ...task.followers.map(f => f.id),
              ...task.collaborators.map(c => c.id)
            ];
            const uniqueRecipientIds = [...new Set(allRecipientIds)];

            const recipients = await prisma.member.findMany({
              where: {
                id: { in: uniqueRecipientIds }
              },
              include: { user: true }
            });

            // Create notifications for all recipients except the person making the change
            const notificationPromises = recipients
              .filter(recipient => recipient.userId !== user.id) // Don't notify the person making the change
              .map(recipient => {
                const changeDescription = significantChanges.length === 1
                  ? `${significantChanges[0].field} was updated`
                  : `${significantChanges.length} fields were updated`;

                return prisma.notification.create({
                  data: {
                    userId: recipient.userId,
                    type: "TASK_UPDATE",
                    title: "Task updated",
                    message: `${user.name || 'Someone'} updated task "${task.name}" - ${changeDescription}`,
                    workspaceId: task.workspaceId,
                    taskId: task.id,
                    mentionedBy: user.id,
                  }
                });
              });

            await Promise.all(notificationPromises);
          } catch (notificationError) {
            console.error("Failed to create task update notifications:", notificationError);
            // Don't fail task update if notification fails
          }
        }

        // Create history entries for changes
        if (changes.length > 0) {
          try {
            for (const change of changes) {
              let action: TaskHistoryAction;
              let oldValue = change.oldValue || "";
              let newValue = change.newValue || "";
              
              // Map field to appropriate action and resolve user names for assignee changes
              switch (change.field) {
                case "status":
                  action = TaskHistoryAction.STATUS_CHANGED;
                  break;
                case "assigneeIds":
                  action = TaskHistoryAction.ASSIGNEE_CHANGED;
                  // Resolve assignee IDs to names
                  try {
                    const oldIds = change.oldValue ? JSON.parse(change.oldValue) : [];
                    if (Array.isArray(oldIds) && oldIds.length > 0) {
                      const oldMembers = await prisma.member.findMany({
                        where: { id: { in: oldIds } },
                        include: { user: true }
                      });
                      oldValue = oldMembers.map(m => m.user.name || "Unknown").join(", ") || "Unassigned";
                    } else {
                      oldValue = "Unassigned";
                    }
                  } catch {
                    oldValue = "Unassigned";
                  }

                  try {
                    const newIds = change.newValue ? JSON.parse(change.newValue) : [];
                    if (Array.isArray(newIds) && newIds.length > 0) {
                      const newMembers = await prisma.member.findMany({
                        where: { id: { in: newIds } },
                        include: { user: true }
                      });
                      newValue = newMembers.map(m => m.user.name || "Unknown").join(", ") || "Unassigned";
                    } else {
                      newValue = "Unassigned";
                    }
                  } catch {
                    newValue = "Unassigned";
                  }
                  break;
                case "reviewerId":
                  action = TaskHistoryAction.REVIEWER_CHANGED;
                  // Resolve reviewer IDs to names
                  if (change.oldValue) {
                    try {
                      const oldMember = await prisma.member.findUnique({
                        where: { id: change.oldValue },
                        include: { user: true }
                      });
                      oldValue = oldMember?.user.name || "Unknown User";
                    } catch {
                      oldValue = "Unknown User";
                    }
                  } else {
                    oldValue = "No Reviewer";
                  }

                  if (change.newValue) {
                    try {
                      const newMember = await prisma.member.findUnique({
                        where: { id: change.newValue },
                        include: { user: true }
                      });
                      newValue = newMember?.user.name || "Unknown User";
                    } catch {
                      newValue = "Unknown User";
                    }
                  } else {
                    newValue = "No Reviewer";
                  }
                  break;
                case "serviceId":
                  action = TaskHistoryAction.SERVICE_CHANGED;
                  // Resolve service IDs to names
                  if (change.newValue) {
                    try {
                      const service = await prisma.service.findUnique({
                        where: { id: change.newValue }
                      });
                      newValue = service?.name || "Unknown Service";
                    } catch {
                      newValue = "Unknown Service";
                    }
                  }
                  break;
                case "workspaceId":
                  action = TaskHistoryAction.WORKSPACE_CHANGED;
                  // Resolve workspace IDs to names
                  if (change.oldValue) {
                    try {
                      const oldWorkspace = await prisma.workspace.findUnique({
                        where: { id: change.oldValue }
                      });
                      oldValue = oldWorkspace?.name || "Unknown Workspace";
                    } catch {
                      oldValue = "Unknown Workspace";
                    }
                  }

                  if (change.newValue) {
                    try {
                      const newWorkspace = await prisma.workspace.findUnique({
                        where: { id: change.newValue }
                      });
                      newValue = newWorkspace?.name || "Unknown Workspace";
                    } catch {
                      newValue = "Unknown Workspace";
                    }
                  }
                  break;
                case "dueDate":
                  action = TaskHistoryAction.DUE_DATE_CHANGED;
                  break;
                case "description":
                  action = TaskHistoryAction.DESCRIPTION_UPDATED;
                  break;
                case "name":
                  action = TaskHistoryAction.NAME_CHANGED;
                  break;
                case "attachmentId":
                  action = change.newValue ? TaskHistoryAction.ATTACHMENT_ADDED : TaskHistoryAction.ATTACHMENT_REMOVED;
                  break;
                case "followedIds":
                  action = TaskHistoryAction.FOLLOWERS_CHANGED;
                  break;
                case "collaboratorIds":
                  action = TaskHistoryAction.COLLABORATORS_CHANGED;
                  break;
                case "isConfidential":
                  action = TaskHistoryAction.CONFIDENTIAL_CHANGED;
                  break;
                default:
                  action = TaskHistoryAction.UPDATED;
              }

              await prisma.taskHistory.create({
                data: {
                  taskId,
                  userId: user.id,
                  action,
                  field: change.field,
                  oldValue,
                  newValue,
                }
              });
            }
          } catch (historyError) {
            console.error("Failed to create task history entries:", historyError);
            // Don't fail the task update if history fails
          }
        }

        return c.json({ 
          data: {
            ...task,
            dueDate: task.dueDate ? task.dueDate.toISOString() : null,
            createdAt: task.createdAt.toISOString(),
            updatedAt: task.updatedAt.toISOString(),
          }
        });
      } catch (error) {
        console.error("Task update error:", error);
        return c.json({ error: error instanceof Error ? error.message : "Failed to update task" }, 500);
      }
    }
  )

  .get(
    "/:taskId",
    sessionMiddleware,
    async (c) => {
      const currentUser = c.get("user");
      const prisma = c.get("prisma");
      const { taskId } = c.req.param();

      // Validate taskId format
      if (!taskId || taskId.length > 36 || !/^[a-zA-Z0-9_-]+$/.test(taskId)) {
        return c.json({ error: "Invalid task ID format" }, 400);
      }

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          service: true,
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          },
          reviewer: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          },
          followers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          },
          collaborators: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          },
          _count: {
            select: {
              subTasks: true
            }
          }
        }
      });

      if (!task) {
        return c.json({ error: "Task not found" }, 404);
      }

      const currentMember = await getMember({
        prisma,
        workspaceId: task.workspaceId,
        userId: currentUser.id
      });

      if (!currentMember) {
        return c.json({ error: "Unauthorized" }, 401)
      }

      // Hide archived tasks from customers (treat as not found)
      // Admins and members can view archived tasks
      if (task.status === TaskStatus.ARCHIVED && currentMember.role === MemberRole.CUSTOMER) {
        return c.json({ error: "Task not found" }, 404);
      }

      // Check access to confidential tasks
      if (task.isConfidential) {
        const hasConfidentialAccess =
          task.creatorId === currentUser.id || // User created the task
          task.assignees.some(a => a.id === currentMember.id) || // User is assigned to the task
          task.reviewerId === currentMember.id || // User is the reviewer of the task
          task.followers.some(f => f.id === currentMember.id) || // Customer is following the task
          task.collaborators.some(c => c.id === currentMember.id); // Team member is collaborating

        if (!hasConfidentialAccess) {
          return c.json({ error: "You don't have access to this confidential task" }, 403);
        }
      }

      // Check general access permissions for non-confidential tasks
      // TODO tasks can be viewed by all workspace members
      if (task.status !== TaskStatus.TODO) {
        const isCreator = task.creatorId === currentUser.id;
        const isAssignee = task.assignees.some(a => a.id === currentMember.id);
        const isReviewer = task.reviewerId === currentMember.id;
        const isFollower = task.followers.some(follower => follower.id === currentMember.id);
        const isCollaborator = task.collaborators.some(collab => collab.id === currentMember.id);
        const isWorkspaceAdmin = currentMember.role === MemberRole.ADMIN;
        const isSuperAdmin = currentUser.isAdmin || currentUser.isSuperAdmin || false;

        // Check if user has permission to view this task
        if (!isCreator && !isAssignee && !isReviewer && !isFollower && !isCollaborator && !isWorkspaceAdmin && !isSuperAdmin) {
          return c.json({ error: "Unauthorized" }, 401);
        }
      }

      const assignees = task.assignees.map(assignee => ({
        ...assignee,
        name: assignee.user.name,
        email: assignee.user.email,
      }));

      return c.json({
        data: {
          ...task,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
          assignees,
          followedIds: JSON.stringify(task.followers.map(f => f.id)),
          collaboratorIds: JSON.stringify(task.collaborators.map(c => c.id)),
          subTaskCount: task._count.subTasks,
        },
      });
    }
  )

  // Get sub-tasks for a task
  .get(
    "/:taskId/sub-tasks",
    sessionMiddleware,
    zValidator("param", z.object({ taskId: z.string() })),
    async (c) => {
      const user = c.get("user");
      const prisma = c.get("prisma");
      const { taskId } = c.req.valid("param");

      // Check if parent task exists and user has access to it
      const parentTask = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          workspace: {
            include: {
              members: {
                where: { userId: user.id }
              }
            }
          }
        }
      });

      if (!parentTask) {
        return c.json({ error: "Task not found" }, 404);
      }

      if (parentTask.workspace.members.length === 0) {
        return c.json({ error: "You must be a member of the parent task's workspace to view sub-tasks" }, 403);
      }

      // Get all sub-tasks (across all workspaces where user has access)
      const subTasks = await prisma.task.findMany({
        where: {
          parentTaskId: taskId,
          workspace: {
            members: {
              some: {
                userId: user.id
              }
            }
          }
        },
        include: {
          assignees: {
            include: { user: true }
          },
          service: true,
          workspace: true,
        },
        orderBy: { createdAt: 'asc' }
      });

      return c.json({
        data: subTasks.map(task => ({
          ...task,
          dueDate: task.dueDate?.toISOString() || null,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
          assignees: task.assignees.map(a => ({
            ...a,
            name: a.user.name,
            email: a.user.email,
          })),
        }))
      });
    }
  )

  // Create a sub-task
  .post(
    "/:taskId/sub-tasks",
    sessionMiddleware,
    zValidator("param", z.object({ taskId: z.string() })),
    zValidator("json", createTaskSchema),
    async (c) => {
      try {
        const user = c.get("user");
        const prisma = c.get("prisma");
        const { taskId } = c.req.valid("param");
        const values = c.req.valid("json");

      // Check if parent task exists and user has access to it
      const parentTask = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          workspace: {
            include: {
              members: {
                where: { userId: user.id }
              }
            }
          },
          service: true
        }
      });

      if (!parentTask) {
        return c.json({ error: "Parent task not found" }, 404);
      }

      const parentTaskMember = parentTask.workspace.members[0];
      if (!parentTaskMember) {
        return c.json({ error: "You must be a member of the parent task's workspace to create sub-tasks" }, 403);
      }

      // For sub-tasks, the workspace can be different from parent task
      // Check if user has permissions in the target workspace
      const targetMember = await prisma.member.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId: values.workspaceId,
          },
        },
      });

      if (!targetMember) {
        return c.json({ error: "You must be a member of the target workspace to create sub-tasks" }, 403);
      }

      // Generate task number
      const taskNumber = await generateTaskNumber(prisma);

      // Parse assignee IDs from JSON string for sub-task
      let subTaskAssigneeIds: string[] = [];
      if (values.assigneeIds) {
        try {
          const parsed = JSON.parse(values.assigneeIds);
          if (Array.isArray(parsed)) {
            subTaskAssigneeIds = parsed.filter((id: unknown) =>
              id && typeof id === 'string' && id.trim().length > 0
            ) as string[];
          }
        } catch {
          // Invalid JSON, ignore
        }
      }

      // Create the sub-task (can be in a different workspace)
      const subTask = await prisma.task.create({
        data: {
          name: values.name,
          description: values.description,
          status: values.status,
          dueDate: new Date(values.dueDate),
          isConfidential: values.isConfidential || false,
          taskNumber,
          workspaceId: values.workspaceId,
          serviceId: values.serviceId,
          assignees: {
            connect: subTaskAssigneeIds.map(id => ({ id }))
          },
          parentTaskId: taskId,
          creatorId: user.id,
          position: 9999,
        },
        include: {
          assignees: {
            include: { user: true }
          },
          service: true,
          workspace: true,
        }
      });

      // Create history entry
      await prisma.taskHistory.create({
        data: {
          taskId: subTask.id,
          userId: user.id,
          action: TaskHistoryAction.CREATED,
          details: `Sub-task created under parent task ${parentTask.taskNumber}: ${parentTask.name}`
        }
      });

      // Also add history to parent task
      await prisma.taskHistory.create({
        data: {
          taskId: taskId,
          userId: user.id,
          action: TaskHistoryAction.SUB_TASK_ADDED,
          details: `Sub-task ${subTask.taskNumber}: ${subTask.name} was added`
        }
      });

      return c.json({
        data: {
          ...subTask,
          dueDate: subTask.dueDate?.toISOString() || null,
          createdAt: subTask.createdAt.toISOString(),
          updatedAt: subTask.updatedAt.toISOString(),
        }
      }, 201);
      } catch (error) {
        console.error("Error creating sub-task:", error);
        return c.json({ error: "Failed to create sub-task" }, 500);
      }
    }
  )

  // Update parent task to check for sub-task completion when status changes to DONE
  .patch(
    "/:taskId/validate-completion",
    sessionMiddleware,
    zValidator("param", z.object({ taskId: z.string() })),
    async (c) => {
      const prisma = c.get("prisma");
      const { taskId } = c.req.valid("param");

      // Check if task has incomplete sub-tasks
      const incompleteSubTasks = await prisma.task.count({
        where: {
          parentTaskId: taskId,
          status: {
            not: TaskStatus.DONE
          }
        }
      });

      return c.json({
        data: {
          canComplete: incompleteSubTasks === 0,
          incompleteSubTasksCount: incompleteSubTasks
        }
      });
    }
  )


export default app;
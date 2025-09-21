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
        limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
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
          assignee: {
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
          }
        }
      });

      // Map tasks to the expected format
      const populatedTasks = tasks.map((task) => ({
        ...task,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        assignees: task.assignee ? [{
          ...task.assignee,
          name: task.assignee.user.name,
          email: task.assignee.user.email,
        }] : [],
        followedIds: JSON.stringify(task.followers.map(f => f.id)),
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
          assignee: true,
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

      // Check archive permissions based on task status
      const isWorkspaceAdmin = member.role === MemberRole.ADMIN;
      const isCreator = task.creatorId === user.id;
      const isAssignee = task.assigneeId === member.id;
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
        assigneeId?: string;
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
            assigneeId?: string;
            followers?: {
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
          assigneeId?: string;
          followers?: {
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
        where.assigneeId = assigneeId;
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
      // Users can see confidential tasks if they are the creator, assignee, or follower
      const confidentialFilter = [
        { isConfidential: false }, // Non-confidential tasks are visible to everyone
        { isConfidential: true, creatorId: user.id }, // User created the task
        { isConfidential: true, assigneeId: member.id }, // User is assigned to the task
        { isConfidential: true, followers: { some: { id: member.id } } }, // User is following the task
      ];

      // For visitors, add additional filtering to only show tasks they are following
      if (member.role === MemberRole.VISITOR) {
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
          assignee: {
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
          }
        }
      });

      // Map tasks to the expected format (filtering is now done at database level)
      const populatedTasks = tasks.map((task) => ({
        ...task,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        assignees: task.assignee ? [{
          ...task.assignee,
          name: task.assignee.user.name,
          email: task.assignee.user.email,
        }] : [],
        followedIds: JSON.stringify(task.followers.map(f => f.id)),
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
          assigneeId,
          reviewerId,
          description,
          attachmentId,
          followedIds,
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

        // Prepare followers - automatically add the task creator as a follower
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
        
        // Ensure creator is always included in followers
        if (!followerIds.includes(member.id)) {
          followerIds.push(member.id);
          console.log(`✅ Auto-added creator ${member.id} as follower to task`);
        } else {
          console.log(`ℹ️ Creator ${member.id} already in followers list`);
        }

        // Ensure assignee is always included in followers (if different from creator)
        if (assigneeId && assigneeId !== 'undefined' && assigneeId !== member.id && !followerIds.includes(assigneeId)) {
          followerIds.push(assigneeId);
          console.log(`✅ Auto-added assignee ${assigneeId} as follower to task`);
        }
        
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
            assigneeId: assigneeId === 'undefined' || !assigneeId ? null : assigneeId,
            reviewerId: reviewerId === 'undefined' || !reviewerId ? null : reviewerId,
            description,
            position: newPosition,
            attachmentId: attachmentId === 'undefined' || !attachmentId ? null : attachmentId,
            creatorId: user.id,
            isConfidential: isConfidential || false,
            followers: {
              connect: followerIds.map(id => ({ id }))
            }
          },
          include: {
            service: true,
            assignee: {
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

        console.log("Task creation - Created task:", {
          id: task.id
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

        // Create task assignment notification if task is assigned to someone
        if (task.assigneeId && task.assigneeId !== member.id) {
          try {
            // Get the assignee's user ID
            const assigneeMember = await prisma.member.findUnique({
              where: { id: task.assigneeId },
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
              console.log("Task assignment notification created for user:", assigneeMember.userId);
            }
          } catch (notificationError) {
            console.error("Failed to create task assignment notification:", notificationError);
            // Don't fail task creation if notification fails
          }
        }

        console.log("Task created successfully:", task.id);
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
          assigneeId,
          reviewerId,
          description,
          attachmentId,
          followedIds,
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

        // Permission checks based on task status and user roles
        const isCurrentAssignee = existingTask.assigneeId === member.id;
        const isFollower = existingTask.followers.some(f => f.id === member.id);
        const isWorkspaceAdmin = member.role === MemberRole.ADMIN;
        const isWorkspaceMember = member.role === MemberRole.MEMBER;
        const isVisitor = member.role === MemberRole.VISITOR;

        // Global restriction: Visitors cannot change task status at all
        if (isVisitor && status !== undefined && status !== existingTask.status) {
          return c.json({ error: "Visitors cannot change task status" }, 403);
        }

        // Check if user can update task based on current status
        if (existingTask.status === TaskStatus.TODO) {
          // TODO status: all workspace members and visitors can update (except status change for visitors, handled above)
          // No additional restrictions needed - everyone can update TODO tasks
        } else if (existingTask.status === TaskStatus.IN_REVIEW) {
          // In Review status: all workspace members can update the task
          // No additional restrictions needed
        } else if (existingTask.status === TaskStatus.IN_PROGRESS) {
          // In Progress status: only assignee and followers (with member role) can update
          // Exception: Allow anyone to move task from IN_PROGRESS to IN_REVIEW
          const isMovingToReview = status === TaskStatus.IN_REVIEW && existingTask.status === TaskStatus.IN_PROGRESS;

          if (!isMovingToReview) {
            // For other updates, only assignee and followers can update
            const canUpdate = isCurrentAssignee ||
                             (isFollower && (isWorkspaceMember || isWorkspaceAdmin)) ||
                             isWorkspaceAdmin;

            if (!canUpdate) {
              return c.json({ error: "Only the assignee and followers (with member role) can update tasks in progress" }, 403);
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
          // All members can update, visitors can update fields but not status (handled above)
        }

        // Assignee transfer restrictions
        if (assigneeId !== undefined && assigneeId !== existingTask.assigneeId) {
          // Allow self-assignment if task has no assignee
          const isSelfAssignment = !existingTask.assigneeId && assigneeId === member.id;

          // Allow assignment if:
          // 1. User is workspace admin
          // 2. User is the current assignee (can unassign or reassign)
          // 3. Task has no assignee and user is assigning to themselves
          if (!isWorkspaceAdmin && !isCurrentAssignee && !isSelfAssignment) {
            return c.json({ error: "Only the current assignee or workspace admin can transfer task assignment" }, 403);
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
          assigneeId?: string | null;
          reviewerId?: string | null;
          description?: string;
          attachmentId?: string | null;
          isConfidential?: boolean;
          status?: TaskStatus;
          position?: number;
          followers?: { set: { id: string }[] };
        } = {};

        // Handle workspace change - filter followers who don't have access to target workspace
        if (workspaceId !== undefined && workspaceId !== existingTask.workspaceId) {
          updateData.workspaceId = workspaceId;
          updateData.reviewerId = null; // Always reset reviewer

          // Set default status to TODO when transferring to new workspace
          updateData.status = TaskStatus.TODO;

          // Handle assignee based on task confidentiality
          const isConfidentialTask = isConfidential !== undefined ? isConfidential : existingTask.isConfidential;

          if (isConfidentialTask) {
            // For confidential tasks, assignee must remain required
            // If no assignee is provided in the update, return error
            if (!assigneeId || assigneeId === 'undefined' || assigneeId === '') {
              return c.json({ error: "Assignee is required when transferring confidential tasks to another workspace" }, 400);
            }

            // Validate that the assignee is a member of the target workspace
            const targetAssignee = await prisma.member.findUnique({
              where: {
                id: assigneeId,
              },
            });

            if (!targetAssignee || targetAssignee.workspaceId !== workspaceId || targetAssignee.role === MemberRole.VISITOR) {
              return c.json({ error: "Assignee must be a member (not visitor) of the target workspace for confidential tasks" }, 400);
            }
          } else {
            // For non-confidential tasks, reset assignee to null (unassigned)
            updateData.assigneeId = null;
          }

          // Preserve all followers when transferring between workspaces
          // Chat history and follower relationships are maintained regardless of workspace membership
          // Access control will be handled at the UI level for displaying appropriate content

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
        if (assigneeId !== undefined) updateData.assigneeId = assigneeId === 'undefined' || !assigneeId ? null : assigneeId;
        if (reviewerId !== undefined) updateData.reviewerId = reviewerId === 'undefined' || !reviewerId ? null : reviewerId;
        if (description !== undefined) updateData.description = description;
        if (attachmentId !== undefined) updateData.attachmentId = attachmentId === 'undefined' || !attachmentId ? null : attachmentId;
        if (isConfidential !== undefined) updateData.isConfidential = isConfidential;

        // Only include status if user is not a visitor
        if (member.role !== MemberRole.VISITOR && status !== undefined) {
          updateData.status = status;
        }

        // Handle followers update
        if (followedIds !== undefined) {
          try {
            const parsedIds = JSON.parse(followedIds);
            if (Array.isArray(parsedIds)) {
              // Filter out null, undefined, empty strings, and non-string values
              const validIds = parsedIds.filter((id: unknown) => 
                id && typeof id === 'string' && id.trim().length > 0
              ) as string[];
              
              // Ensure assignee is included in followers (if assignee is being updated)
              if (updateData.assigneeId && updateData.assigneeId !== null && !validIds.includes(updateData.assigneeId)) {
                validIds.push(updateData.assigneeId);
                console.log(`✅ Auto-added assignee ${updateData.assigneeId} as follower during update`);
              }
              
              // Verify that these member IDs exist in the workspace
              const existingMembers = await prisma.member.findMany({
                where: {
                  id: { in: validIds },
                  workspaceId: existingTask.workspaceId
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
        } else if (updateData.assigneeId && updateData.assigneeId !== null) {
          // If followers are not being explicitly updated but assignee is changing,
          // add the new assignee to the existing followers
          const currentFollowerIds = existingTask.followers.map(f => f.id);
          if (!currentFollowerIds.includes(updateData.assigneeId)) {
            const newFollowerIds = [...currentFollowerIds, updateData.assigneeId];
            updateData.followers = {
              set: newFollowerIds.map((id: string) => ({ id }))
            };
            console.log(`✅ Auto-added new assignee ${updateData.assigneeId} as follower`);
          }
        }


        // Detect what changed for history tracking
        const updatePayload = c.req.valid("json");
        // Convert Prisma task to match the expected format
        const taskForComparison: Task = {
          id: existingTask.id,
          taskNumber: existingTask.taskNumber,
          name: existingTask.name,
          status: existingTask.status as TaskStatus,
          workspaceId: existingTask.workspaceId,
          assigneeId: existingTask.assigneeId,
          reviewerId: existingTask.reviewerId,
          serviceId: existingTask.serviceId,
          position: existingTask.position,
          dueDate: existingTask.dueDate?.toISOString() || null,
          description: existingTask.description,
          attachmentId: existingTask.attachmentId,
          followedIds: JSON.stringify(existingTask.followers.map(f => f.id)),
          creatorId: existingTask.creatorId,
          isConfidential: existingTask.isConfidential,
          createdAt: existingTask.createdAt.toISOString(),
          updatedAt: existingTask.updatedAt.toISOString(),
        };
        const changes = detectTaskChanges(taskForComparison, updatePayload);

        const task = await prisma.task.update({
          where: { id: taskId },
          data: updateData,
          include: {
            service: true,
            assignee: {
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
            }
          }
        });


        // Create task assignment notification if assignee changed
        const assigneeChange = changes.find(change => change.field === 'assigneeId');
        if (assigneeChange && assigneeChange.newValue && assigneeChange.newValue !== member.id) {
          try {
            // Get the assignee's user ID
            const assigneeMember = await prisma.member.findUnique({
              where: { id: assigneeChange.newValue },
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
              console.log("Task assignment notification created for user:", assigneeMember.userId);
            }
          } catch (notificationError) {
            console.error("Failed to create task assignment notification:", notificationError);
            // Don't fail task update if notification fails
          }
        }

        // Create task update notifications for followers (for significant changes)
        const significantChanges = changes.filter(change => 
          ['status', 'assigneeId', 'serviceId', 'dueDate', 'name', 'description'].includes(change.field)
        );

        if (significantChanges.length > 0) {
          try {
            // Get all followers with their user information
            const followers = await prisma.member.findMany({
              where: {
                id: { in: task.followers.map(f => f.id) }
              },
              include: { user: true }
            });

            // Create notifications for all followers except the person making the change
            const notificationPromises = followers
              .filter(follower => follower.userId !== user.id) // Don't notify the person making the change
              .map(follower => {
                const changeDescription = significantChanges.length === 1 
                  ? `${significantChanges[0].field} was updated`
                  : `${significantChanges.length} fields were updated`;

                return prisma.notification.create({
                  data: {
                    userId: follower.userId,
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
            console.log(`Task update notifications created for ${notificationPromises.length} followers`);
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
                case "assigneeId":
                  action = TaskHistoryAction.ASSIGNEE_CHANGED;
                  // Resolve assignee IDs to names
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
                    oldValue = "Unassigned";
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
          assignee: {
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

      // Hide archived tasks from visitors (treat as not found)
      // Admins and members can view archived tasks
      if (task.status === TaskStatus.ARCHIVED && currentMember.role === MemberRole.VISITOR) {
        return c.json({ error: "Task not found" }, 404);
      }

      // If user is a visitor, only allow access to tasks they are following
      if (currentMember.role === MemberRole.VISITOR) {
        const isFollowing = task.followers.some(follower => follower.id === currentMember.id);
        if (!isFollowing) {
          return c.json({ error: "Unauthorized" }, 401);
        }
      }

      const assignees = task.assignee ? [{
        ...task.assignee,
        name: task.assignee.user.name,
        email: task.assignee.user.email,
      }] : [];

      return c.json({
        data: {
          ...task,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
          assignees,
          followedIds: JSON.stringify(task.followers.map(f => f.id)),
        },
      });
    }
  )


export default app;
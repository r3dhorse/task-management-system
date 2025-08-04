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


const app = new Hono()

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

      // Visitors cannot archive tasks
      if (member.role === MemberRole.VISITOR) {
        return c.json({ error: "Forbidden" }, 403);
      }

      // Only the task creator or workspace admin can archive the task
      const isTaskCreator = task.creatorId && task.creatorId === user.id;
      const isWorkspaceAdmin = member.role === MemberRole.ADMIN;
      
      if (!isTaskCreator && !isWorkspaceAdmin) {
        return c.json({ error: "Forbidden" }, 403);
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
        includeArchived
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
      const where: {
        workspaceId: string;
        serviceId?: string;
        status?: TaskStatus | { not: TaskStatus };
        assigneeId?: string | null;
        isConfidential?: boolean;
        dueDate?: Date;
        name?: { contains: string; mode: 'insensitive' };
      } = {
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

      if (search) {
        where.name = { contains: search, mode: 'insensitive' };
      }

      const tasks = await prisma.task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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

      let populatedTasks = tasks.map((task) => ({
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

      // If user is a visitor, only show tasks they are following
      if (member.role === MemberRole.VISITOR) {
        populatedTasks = populatedTasks.filter((task) => {
          return task.followers.some(follower => follower.id === member.id);
        });
      }

      // Filter confidential tasks - only visible to creator, assignee, and followers
      populatedTasks = populatedTasks.filter((task) => {
        // If task is not confidential, everyone can see it
        if (!task.isConfidential) {
          return true;
        }

        // If task is confidential, check permissions:
        // 1. Task creator can always see it
        if (task.creatorId === user.id) {
          return true;
        }

        // 2. Task assignee can see it
        if (task.assigneeId === member.id) {
          return true;
        }

        // 3. Followers can see it
        if (task.followers.some(follower => follower.id === member.id)) {
          return true;
        }

        // If none of the above conditions are met, deny access
        return false;
      });

      return c.json({
        data: {
          documents: populatedTasks,
          total: populatedTasks.length,
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
          description,
          attachmentId,
          followedIds,
          isConfidential,
        } = c.req.valid("json");

        console.log("Creating task with data:", {
          name,
          status,
          workspaceId,
          serviceId,
          dueDate,
          assigneeId,
          description,
          attachmentId,
          followedIds,
          isConfidential,
        });

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
        
        // Validate required fields and convert string 'undefined' to proper values
        if (!serviceId || serviceId === 'undefined' || serviceId === '') {
          return c.json({ error: "Service is required" }, 400);
        }

        const task = await prisma.task.create({
          data: {
            name,
            status,
            workspaceId,
            serviceId,
            dueDate: dueDate ? new Date(dueDate) : null,
            assigneeId: assigneeId === 'undefined' || !assigneeId ? null : assigneeId,
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
          dueDate,
          assigneeId,
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

        // Visitors can update tasks but cannot change status
        if (member.role === MemberRole.VISITOR && status !== undefined) {
          return c.json({ error: "Visitors cannot update task status" }, 403);
        }

        const updateData: {
          name?: string;
          serviceId?: string;
          dueDate?: Date | null;
          assigneeId?: string | null;
          description?: string;
          attachmentId?: string | null;
          isConfidential?: boolean;
          status?: TaskStatus;
          position?: number;
          followers?: { set: { id: string }[] };
        } = {};

        if (name !== undefined) updateData.name = name;
        if (serviceId !== undefined) updateData.serviceId = serviceId;
        if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
        if (assigneeId !== undefined) updateData.assigneeId = assigneeId === 'undefined' || !assigneeId ? null : assigneeId;
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
        }

        // Detect what changed for history tracking
        const updatePayload = c.req.valid("json");
        // Convert Prisma task to match the expected format
        const taskForComparison: Task = {
          id: existingTask.id,
          name: existingTask.name,
          status: existingTask.status as TaskStatus,
          workspaceId: existingTask.workspaceId,
          assigneeId: existingTask.assigneeId,
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
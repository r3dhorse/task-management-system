import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createTaskSchema, updateTaskSchema } from "../schemas";
import { getMember } from "@/features/members/utils";
import { MemberRole } from "@/features/members/types";
import { DATABASE_ID, MEMBERS_ID, SERVICES_ID, TASKS_ID, TASK_HISTORY_ID } from "@/config";
import { ID, Query } from "node-appwrite";
import { z } from "zod";
import { Task, TaskStatus } from "../types";
import { createAdminClient } from "@/lib/appwrite";
import { Service } from "@/features/services/types";
import { TaskHistoryAction } from "../types/history";
import { detectTaskChanges } from "../utils/history";


const app = new Hono()

  .delete(
    "/:taskId",
    sessionMiddleware,
    async (c) => {
      const user = c.get("user");
      const databases = c.get("databases");
      const { taskId } = c.req.param();

      // Validate taskId format
      if (!taskId || taskId.length > 36 || !/^[a-zA-Z0-9_-]+$/.test(taskId)) {
        return c.json({ error: "Invalid task ID format" }, 400);
      }

      let task: Task;
      try {
        task = await databases.getDocument<Task>(
          DATABASE_ID,
          TASKS_ID,
          taskId,
        );
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'type' in error && error.type === 'document_not_found') {
          return c.json({ error: "Task not found" }, 404);
        }
        throw error;
      }

      const prisma = c.get("prisma");
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
      const isTaskCreator = task.creatorId && task.creatorId === user.$id;
      const isWorkspaceAdmin = member.role === MemberRole.ADMIN;
      
      if (!isTaskCreator && !isWorkspaceAdmin) {
        return c.json({ error: "Forbidden" }, 403);
      }

      // Archive the task by setting status to ARCHIVED for audit purposes
      const archivedTask = await databases.updateDocument(
        DATABASE_ID,
        TASKS_ID,
        taskId,
        {
          status: TaskStatus.ARCHIVED,
        }
      );

      return c.json({ data: { $id: archivedTask.$id } });
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
      const { users } = await createAdminClient();
      const databases = c.get("databases");
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

      const prisma = c.get("prisma");
      const member = await getMember({
        prisma,
        workspaceId,
        userId: user.id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const query = [
        Query.equal("workspaceId", workspaceId),
        Query.orderDesc("$createdAt")
      ];

      if (serviceId) {
        query.push(Query.equal("serviceId", serviceId));
      }

      if (status) {
        query.push(Query.equal("status", status));
        
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
          query.push(Query.notEqual("status", TaskStatus.ARCHIVED));
        }
      }

      if (assigneeId) {
        query.push(Query.equal("assigneeId", assigneeId));
      }

      if (dueDate) {
        query.push(Query.equal("dueDate", dueDate));
      }

      if (search) {
        query.push(Query.search("name", search));
      }

      const tasks = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        query,
      );


      const serviceIds = tasks.documents.map((task) => task.serviceId);
      const assigneeIds = [...new Set(tasks.documents.map((task) => task.assigneeId).filter(Boolean))];

      const services = await databases.listDocuments<Service>(
        DATABASE_ID,
        SERVICES_ID,
        serviceIds.length > 0 ? [Query.contains("$id", serviceIds)] : [],
      );

      const members = await databases.listDocuments(
        DATABASE_ID,
        MEMBERS_ID,
        assigneeIds.length > 0 ? [Query.contains("$id", assigneeIds)] : [],
      );

      const assignees = await Promise.all(
        members.documents.map(async (member) => {
          const user = await users.get(member.userId);

          return {
            ...member,
            name: user.name,
            email: user.email,
          }
        })
      );

      let populatedTasks = tasks.documents.map((task) => {
        const service = services.documents.find(
          (service) => service.$id === task.serviceId,
        );
        const taskAssignee = assignees.find(
          (assignee) => assignee.$id === task.assigneeId,
        );
        const taskAssignees = taskAssignee ? [taskAssignee] : [];

        return {
          ...task,
          service,
          assignees: taskAssignees,
        };
      });

      // If user is a visitor, only show tasks they are following
      if (member.role === MemberRole.VISITOR) {
        populatedTasks = populatedTasks.filter((task) => {
          const followedIds = (task as unknown as { followedIds?: string }).followedIds;
          if (!followedIds) return false;
          try {
            const parsedFollowedIds = JSON.parse(followedIds);
            // Use member.$id instead of user.$id for comparison
            return Array.isArray(parsedFollowedIds) && parsedFollowedIds.includes(member.$id);
          } catch {
            return false;
          }
        });
      }

      // Filter confidential tasks - only visible to creator, assignee, and followers
      populatedTasks = populatedTasks.filter((task) => {
        const taskData = task as unknown as Task;
        
        // If task is not confidential, everyone can see it
        if (!taskData.isConfidential) {
          return true;
        }

        // If task is confidential, check permissions:
        // 1. Task creator can always see it
        if (taskData.creatorId === user.$id) {
          return true;
        }

        // 2. Task assignee can see it
        if (taskData.assigneeId && taskData.assigneeId === member.$id) {
          return true;
        }

        // 3. Followers can see it
        if (taskData.followedIds) {
          try {
            const parsedFollowedIds = JSON.parse(taskData.followedIds);
            if (Array.isArray(parsedFollowedIds) && parsedFollowedIds.includes(member.$id)) {
              return true;
            }
          } catch {
            // If followedIds parsing fails, deny access
          }
        }

        // If none of the above conditions are met, deny access
        return false;
      });

      return c.json({
        data: {
          ...tasks,
          documents: populatedTasks,
          total: populatedTasks.length, // Update total to reflect filtered count
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
        const databases = c.get("databases");

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
          databases,
          workspaceId,
          userId: user.id,
        });

        if (!member) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        const highestPositionTask = await databases.listDocuments(
          DATABASE_ID,
          TASKS_ID,
          [
            Query.equal("status", status),
            Query.equal("workspaceId", workspaceId),
            Query.orderDesc("position"),
            Query.limit(1),
          ]
        );

        const newPosition =
          highestPositionTask.documents.length > 0
            ? highestPositionTask.documents[0].position + 1000
            : 1000;


        // Automatically add the task creator as a follower
        let creatorFollowedIds: string[] = [];
        if (followedIds) {
          try {
            creatorFollowedIds = JSON.parse(followedIds);
          } catch {
            creatorFollowedIds = [];
          }
        }
        
        // Ensure creator is always included in followers
        if (!creatorFollowedIds.includes(member.$id)) {
          creatorFollowedIds.push(member.$id);
          console.log(`✅ Auto-added creator ${member.$id} as follower to task`);
        } else {
          console.log(`ℹ️ Creator ${member.$id} already in followers list`);
        }
        
        const taskData: Record<string, unknown> = {
          name,
          status,
          workspaceId,
          serviceId,
          dueDate,
          assigneeId,
          description,
          position: newPosition,
          attachmentId: attachmentId || "", // Always include attachmentId, empty string if not provided
          followedIds: JSON.stringify(creatorFollowedIds), // Include creator in followers
          creatorId: user.$id, // Track who created the task
          isConfidential: isConfidential || false, // Track if task is confidential
        };

        console.log("Task creation - Data being sent to database:", taskData);
        
        const task = await databases.createDocument(
          DATABASE_ID,
          TASKS_ID,
          ID.unique(),
          taskData
        );

        console.log("Task creation - Created task:", {
          id: task.$id
        });

        // Create history entry for task creation
        try {
          const { users } = await createAdminClient();
          const userInfo = await users.get(user.$id);
          
          await databases.createDocument(
            DATABASE_ID,
            TASK_HISTORY_ID,
            ID.unique(),
            {
              taskId: task.$id,
              userId: user.id,
              userName: userInfo.name,
              action: TaskHistoryAction.CREATED,
              timestamp: new Date().toISOString(),
            }
          );
        } catch (historyError) {
          console.error("Failed to create task history entry:", historyError);
          // Don't fail the task creation if history fails
        }

        console.log("Task created successfully:", task.$id);
        return c.json({ data: task });
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
        const databases = c.get("databases");

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

        let existingTask: Task;
        try {
          existingTask = await databases.getDocument<Task>(
            DATABASE_ID,
            TASKS_ID,
            taskId,
          );
        } catch (error: unknown) {
          if (error && typeof error === 'object' && 'type' in error && error.type === 'document_not_found') {
            return c.json({ error: "Task not found" }, 404);
          }
          throw error;
        }

        const member = await getMember({
          databases,
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

        const updateData: Record<string, unknown> = {
          name,
          serviceId,
          dueDate,
          assigneeId,
          description,
        };

        // Only include status if user is not a visitor
        if (member.role !== MemberRole.VISITOR) {
          updateData.status = status;
        }

        // Handle isConfidential - include if provided
        if (isConfidential !== undefined) {
          updateData.isConfidential = isConfidential;
        }

        // Handle followedIds - always include if provided
        if (followedIds !== undefined) {
          updateData.followedIds = followedIds;
        }

        // Handle attachmentId - always include if provided, allow empty string to clear attachment
        if (attachmentId !== undefined) {
          updateData.attachmentId = attachmentId; // Include attachmentId even if empty to clear it
        }


        // Detect what changed for history tracking
        const updatePayload = c.req.valid("json");
        const changes = detectTaskChanges(existingTask, updatePayload);

        const task = await databases.updateDocument<Task>(
          DATABASE_ID,
          TASKS_ID,
          taskId,
          updateData
        );

        // Create history entries for changes
        if (changes.length > 0) {
          try {
            const { users } = await createAdminClient();
            const userInfo = await users.get(user.$id);
            
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
                      const oldMember = await databases.getDocument(DATABASE_ID, MEMBERS_ID, change.oldValue);
                      const oldUser = await users.get(oldMember.userId);
                      oldValue = oldUser.name;
                    } catch {
                      oldValue = "Unknown User";
                    }
                  } else {
                    oldValue = "Unassigned";
                  }
                  
                  if (change.newValue) {
                    try {
                      const newMember = await databases.getDocument(DATABASE_ID, MEMBERS_ID, change.newValue);
                      const newUser = await users.get(newMember.userId);
                      newValue = newUser.name;
                    } catch {
                      newValue = "Unknown User";
                    }
                  } else {
                    newValue = "Unassigned";
                  }
                  break;
                case "serviceId":
                  action = TaskHistoryAction.UPDATED; // Temporary: Use UPDATED until SERVICE_CHANGED is added to DB
                  // Resolve service IDs to names
                  if (change.newValue) {
                    try {
                      const service = await databases.getDocument(DATABASE_ID, SERVICES_ID, change.newValue);
                      newValue = service.name;
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
                  action = TaskHistoryAction.UPDATED; // Temporary: Use UPDATED until FOLLOWERS_CHANGED is added to DB
                  break;
                default:
                  action = TaskHistoryAction.UPDATED;
              }

              const historyData = {
                taskId,
                userId: user.id,
                userName: userInfo.name,
                action: action as string, // Convert enum to string
                field: change.field,
                oldValue,
                newValue,
                timestamp: new Date().toISOString(),
              };
              await databases.createDocument(
                DATABASE_ID,
                TASK_HISTORY_ID,
                ID.unique(),
                historyData
              );
            }
          } catch (historyError) {
            console.error("Failed to create task history entries:", historyError);
            // Don't fail the task update if history fails
          }
        }

        return c.json({ data: task });
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
      const databases = c.get("databases")
      const { users } = await createAdminClient();
      const { taskId } = c.req.param();

      // Validate taskId format
      if (!taskId || taskId.length > 36 || !/^[a-zA-Z0-9_-]+$/.test(taskId)) {
        return c.json({ error: "Invalid task ID format" }, 400);
      }

      let task: Task;
      try {
        task = await databases.getDocument<Task>(
          DATABASE_ID,
          TASKS_ID,
          taskId
        );
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'type' in error && error.type === 'document_not_found') {
          return c.json({ error: "Task not found" }, 404);
        }
        throw error;
      }

      const currentMember = await getMember({
        databases,
        workspaceId: task.workspaceId,
        userId: currentUser.$id
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
        const followedIds = task.followedIds ? JSON.parse(task.followedIds) : [];
        if (!followedIds.includes(currentMember.$id)) {
          return c.json({ error: "Unauthorized" }, 401);
        }
      }

      const service = await databases.getDocument<Service>(
        DATABASE_ID,
        SERVICES_ID,
        task.serviceId,
      );

      const members = await databases.listDocuments(
        DATABASE_ID,
        MEMBERS_ID,
        task.assigneeId ? [Query.equal("$id", task.assigneeId)] : [],
      );

      const assignees = await Promise.all(
        members.documents.map(async (member) => {
          const user = await users.get(member.userId);
          return {
            ...member,
            name: user.name,
            email: user.email,
          };
        })
      );

      return c.json({
        data: {
          ...task,
          service,
          assignees,
        },
      });
    }
  )


export default app;
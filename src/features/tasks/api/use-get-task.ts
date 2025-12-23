import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";
import type { TaskChecklist } from "../types";

interface UseGetTaskProps {
  taskId: string;
}

// Extended task type to include checklist
interface TaskWithChecklist {
  id: string;
  taskNumber: string;
  name: string;
  status: string;
  workspaceId: string;
  reviewerId: string | null;
  serviceId: string;
  position: number;
  dueDate: string | null;
  description?: string | null;
  attachmentId?: string | null;
  followedIds?: string;
  collaboratorIds?: string;
  creatorId?: string | null;
  isConfidential?: boolean;
  parentTaskId?: string | null;
  checklist?: TaskChecklist | null;
  createdAt: string;
  updatedAt: string;
  service?: { id: string; name: string } | null;
  assignees?: Array<{
    id: string;
    userId: string;
    name: string | null;
    email: string;
    workspaceId: string;
    role: string;
    joinedAt: string;
    user: { id: string; name: string | null; email: string };
  }>;
  reviewer?: {
    id: string;
    userId: string;
    workspaceId: string;
    role: string;
    joinedAt: string;
    user: { id: string; name: string | null; email: string };
  } | null;
  followers?: Array<{
    id: string;
    userId: string;
    workspaceId: string;
    role: string;
    joinedAt: string;
    user: { id: string; name: string | null; email: string };
  }>;
  collaborators?: Array<{
    id: string;
    userId: string;
    workspaceId: string;
    role: string;
    joinedAt: string;
    user: { id: string; name: string | null; email: string };
  }>;
  subTaskCount?: number;
  _count?: { subTasks: number };
}

export const useGetTask = ({ taskId }: UseGetTaskProps) => {
  const query = useQuery<TaskWithChecklist>({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const response = await client.api.tasks[":taskId"].$get({
        param: {
          taskId,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch task");
      }

      const { data } = await response.json();
      return data as TaskWithChecklist;
    },
    enabled: !!taskId,
  });

  return query;
};

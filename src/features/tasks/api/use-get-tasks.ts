import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";
import { TaskStatus } from "../types";

interface UseGetTasksProps {
  workspaceId: string;
  serviceId?: string | null;
  status?: TaskStatus | null;
  assigneeId?: string | null;
  search?: string | null;
  dueDate?: string | null;
  includeArchived?: boolean;
};


export const useGetTasks = ({
  workspaceId,
  serviceId,
  status,
  search,
  assigneeId,
  dueDate,
  includeArchived,

}: UseGetTasksProps) => {
  const query = useQuery({
    queryKey: [
      "tasks",
      workspaceId,
      serviceId,
      status,
      search,
      assigneeId,
      dueDate,
      includeArchived,
    ],
    queryFn: async () => {
      const response = await client.api.tasks.$get({
        query: {
          workspaceId,
          serviceId: serviceId ?? undefined,
          status: status ?? undefined,
          assigneeId: assigneeId ?? undefined,
          search: search ?? undefined,
          dueDate: dueDate ?? undefined,
          includeArchived: includeArchived ? "true" : undefined,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tasks")
      }

      const { data } = await response.json();
      return data;

    },

  });

  return query;
};
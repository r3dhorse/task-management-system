import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";
import { TaskStatus } from "../types";

interface UseGetCreatedTasksProps {
  search?: string | null;
  status?: TaskStatus | null;
  serviceId?: string | null;
  workspaceId?: string | null;
  page?: number;
  limit?: number;
};

export const useGetCreatedTasks = ({
  search,
  status,
  serviceId,
  workspaceId,
  page = 1,
  limit = 10,
}: UseGetCreatedTasksProps) => {
  const query = useQuery({
    queryKey: [
      "created-tasks",
      search,
      status,
      serviceId,
      workspaceId,
      page,
      limit,
    ],
    queryFn: async () => {
      const response = await client.api.tasks["created-by-user"].$get({
        query: {
          search: search ?? undefined,
          status: status ?? undefined,
          serviceId: serviceId ?? undefined,
          workspaceId: workspaceId ?? undefined,
          limit: limit.toString(),
          offset: ((page - 1) * limit).toString(),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch created tasks")
      }

      const { data } = await response.json();
      return data;
    },
  });

  return query;
};
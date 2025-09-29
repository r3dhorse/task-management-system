import { useQuery } from "@tanstack/react-query";
import { TaskStatus } from "../types";

interface UseGetAllMyTasksProps {
  status?: TaskStatus | null;
  search?: string | null;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

export const useGetAllMyTasks = ({
  status,
  search,
  includeArchived,
  limit,
  offset,
}: UseGetAllMyTasksProps = {}) => {
  const query = useQuery({
    queryKey: [
      "my-tasks-all",
      status,
      search,
      includeArchived,
      limit,
      offset,
    ],
    queryFn: async () => {
      // Build query parameters
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (search) params.append("search", search);
      if (includeArchived) params.append("includeArchived", "true");
      if (limit) params.append("limit", limit.toString());
      if (offset) params.append("offset", offset.toString());

      const response = await fetch(`/api/tasks/my-tasks-all?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }

      const { data } = await response.json();
      return data;
    },
  });

  return query;
};
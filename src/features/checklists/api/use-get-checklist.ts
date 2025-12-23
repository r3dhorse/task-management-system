import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface UseGetChecklistProps {
  serviceId: string;
}

export const useGetChecklist = (
  { serviceId }: UseGetChecklistProps,
  options?: { enabled?: boolean }
) => {
  const query = useQuery({
    queryKey: ["checklist", serviceId],
    queryFn: async () => {
      const response = await client.api.checklists.$get({
        query: { serviceId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch checklist");
      }

      const { data } = await response.json();
      return data;
    },
    enabled: options?.enabled !== false && !!serviceId,
  });

  return query;
};

import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface ReorderChecklistItemsRequest {
  checklistId: string;
  serviceId: string;
  itemIds: string[];
}

export const useReorderChecklistItems = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<unknown, Error, ReorderChecklistItemsRequest>({
    mutationFn: async ({ checklistId, itemIds }) => {
      const response = await client.api.checklists[":checklistId"].items.reorder.$put({
        param: { checklistId },
        json: { itemIds },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
        throw new Error(errorData.error || "Failed to reorder checklist items");
      }

      return await response.json();
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["checklist", variables.serviceId] });
    },

    onError: (error) => {
      toast.error(error.message || "Failed to reorder checklist items");
    },
  });

  return mutation;
};

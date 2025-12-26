import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface MoveChecklistItemRequest {
  checklistId: string;
  itemId: string;
  targetSectionId: string;
  newOrder: number;
  serviceId: string;
}

export const useMoveChecklistItem = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<unknown, Error, MoveChecklistItemRequest>({
    mutationFn: async ({ checklistId, itemId, targetSectionId, newOrder }) => {
      const response = await client.api.checklists[":checklistId"].items[":itemId"].move.$put({
        param: { checklistId, itemId },
        json: { targetSectionId, newOrder },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
        throw new Error(errorData.error || "Failed to move checklist item");
      }

      return await response.json();
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["checklist", variables.serviceId] });
    },

    onError: (error) => {
      toast.error(error.message || "Failed to move checklist item");
    },
  });

  return mutation;
};

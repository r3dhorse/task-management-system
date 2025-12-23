import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface DeleteChecklistItemRequest {
  checklistId: string;
  itemId: string;
  serviceId: string;
}

export const useDeleteChecklistItem = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<unknown, Error, DeleteChecklistItemRequest>({
    mutationFn: async ({ checklistId, itemId }) => {
      const response = await client.api.checklists[":checklistId"].items[":itemId"].$delete({
        param: { checklistId, itemId },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
        throw new Error(errorData.error || "Failed to delete checklist item");
      }

      return await response.json();
    },

    onSuccess: (_, variables) => {
      toast.success("Item deleted");
      queryClient.invalidateQueries({ queryKey: ["checklist", variables.serviceId] });
    },

    onError: (error) => {
      toast.error(error.message || "Failed to delete checklist item");
    },
  });

  return mutation;
};

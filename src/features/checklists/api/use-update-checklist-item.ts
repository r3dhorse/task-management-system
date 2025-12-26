import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface UpdateChecklistItemRequest {
  checklistId: string;
  sectionId: string;
  itemId: string;
  serviceId: string;
  title?: string;
  description?: string | null;
  order?: number;
  requirePhoto?: boolean;
  requireRemarks?: boolean;
}

export const useUpdateChecklistItem = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<unknown, Error, UpdateChecklistItemRequest>({
    mutationFn: async ({ checklistId, sectionId, itemId, title, description, order, requirePhoto, requireRemarks }) => {
      const response = await client.api.checklists[":checklistId"].sections[":sectionId"].items[":itemId"].$patch({
        param: { checklistId, sectionId, itemId },
        json: { title, description, order, requirePhoto, requireRemarks },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
        throw new Error(errorData.error || "Failed to update checklist item");
      }

      return await response.json();
    },

    onSuccess: (_, variables) => {
      toast.success("Item updated");
      queryClient.invalidateQueries({ queryKey: ["checklist", variables.serviceId] });
    },

    onError: (error) => {
      toast.error(error.message || "Failed to update checklist item");
    },
  });

  return mutation;
};

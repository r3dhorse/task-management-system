import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface AddChecklistItemRequest {
  checklistId: string;
  serviceId: string;
  title: string;
  description?: string;
}

export const useAddChecklistItem = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<unknown, Error, AddChecklistItemRequest>({
    mutationFn: async ({ checklistId, title, description }) => {
      const response = await client.api.checklists[":checklistId"].items.$post({
        param: { checklistId },
        json: { title, description },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
        throw new Error(errorData.error || "Failed to add checklist item");
      }

      return await response.json();
    },

    onSuccess: (_, variables) => {
      toast.success("Item added");
      queryClient.invalidateQueries({ queryKey: ["checklist", variables.serviceId] });
    },

    onError: (error) => {
      toast.error(error.message || "Failed to add checklist item");
    },
  });

  return mutation;
};

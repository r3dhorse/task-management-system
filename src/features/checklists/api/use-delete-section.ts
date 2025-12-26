import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface DeleteSectionRequest {
  checklistId: string;
  sectionId: string;
  serviceId: string;
}

export const useDeleteSection = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<unknown, Error, DeleteSectionRequest>({
    mutationFn: async ({ checklistId, sectionId }) => {
      const response = await client.api.checklists[":checklistId"].sections[":sectionId"].$delete({
        param: { checklistId, sectionId },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
        throw new Error(errorData.error || "Failed to delete section");
      }

      return await response.json();
    },

    onSuccess: (_, variables) => {
      toast.success("Section deleted");
      queryClient.invalidateQueries({ queryKey: ["checklist", variables.serviceId] });
    },

    onError: (error) => {
      toast.error(error.message || "Failed to delete section");
    },
  });

  return mutation;
};

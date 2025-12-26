import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface UpdateSectionRequest {
  checklistId: string;
  sectionId: string;
  serviceId: string;
  name: string;
}

export const useUpdateSection = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<unknown, Error, UpdateSectionRequest>({
    mutationFn: async ({ checklistId, sectionId, name }) => {
      const response = await client.api.checklists[":checklistId"].sections[":sectionId"].$patch({
        param: { checklistId, sectionId },
        json: { name },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
        throw new Error(errorData.error || "Failed to update section");
      }

      return await response.json();
    },

    onSuccess: (_, variables) => {
      toast.success("Section updated");
      queryClient.invalidateQueries({ queryKey: ["checklist", variables.serviceId] });
    },

    onError: (error) => {
      toast.error(error.message || "Failed to update section");
    },
  });

  return mutation;
};

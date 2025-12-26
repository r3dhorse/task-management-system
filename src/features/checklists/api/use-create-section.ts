import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface CreateSectionRequest {
  checklistId: string;
  serviceId: string;
  name: string;
}

export const useCreateSection = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<unknown, Error, CreateSectionRequest>({
    mutationFn: async ({ checklistId, name }) => {
      const response = await client.api.checklists[":checklistId"].sections.$post({
        param: { checklistId },
        json: { name },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
        throw new Error(errorData.error || "Failed to create section");
      }

      return await response.json();
    },

    onSuccess: (_, variables) => {
      toast.success("Section created");
      queryClient.invalidateQueries({ queryKey: ["checklist", variables.serviceId] });
    },

    onError: (error) => {
      toast.error(error.message || "Failed to create section");
    },
  });

  return mutation;
};

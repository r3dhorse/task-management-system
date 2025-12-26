import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface ReorderSectionsRequest {
  checklistId: string;
  serviceId: string;
  sectionIds: string[];
}

export const useReorderSections = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<unknown, Error, ReorderSectionsRequest>({
    mutationFn: async ({ checklistId, sectionIds }) => {
      const response = await client.api.checklists[":checklistId"].sections.reorder.$put({
        param: { checklistId },
        json: { sectionIds },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
        throw new Error(errorData.error || "Failed to reorder sections");
      }

      return await response.json();
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["checklist", variables.serviceId] });
    },

    onError: (error) => {
      toast.error(error.message || "Failed to reorder sections");
    },
  });

  return mutation;
};

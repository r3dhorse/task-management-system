import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";

type ResponseType = InferResponseType<typeof client.api.checklists["$post"], 200>;
type RequestType = InferRequestType<typeof client.api.checklists["$post"]>;

export const useCreateChecklist = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await client.api.checklists["$post"]({ json });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
        throw new Error(errorData.error || "Failed to create checklist");
      }

      return await response.json();
    },

    onSuccess: (data) => {
      toast.success("Checklist created");
      queryClient.invalidateQueries({ queryKey: ["checklist", data.data.serviceId] });
    },

    onError: (error) => {
      toast.error(error.message || "Failed to create checklist");
    },
  });

  return mutation;
};

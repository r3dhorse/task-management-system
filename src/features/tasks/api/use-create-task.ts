import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";


type ResponseType = InferResponseType<typeof client.api.tasks["$post"], 200>;
type RequestType = InferRequestType<typeof client.api.tasks["$post"]>;

export const useCreateTask = () => {
  const queryClient = useQueryClient();


  const mutation = useMutation<
    ResponseType,
    Error,
    RequestType
  >({

    mutationFn: async ({ json }) => {
      const response = await client.api.tasks["$post"]({ json });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
        throw new Error(errorData.error || `Failed to create task (${response.status})`);
      }
      return await response.json();
    },

    onError: (error) => {
      toast.error(error.message || "Failed to create task");
    },

    onSuccess: () => {
      toast.success("Task created");
      queryClient.invalidateQueries();
    },

  });
  return mutation;
};
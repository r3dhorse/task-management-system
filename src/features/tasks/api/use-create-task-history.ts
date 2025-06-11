import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { toast } from "sonner";

type ResponseType = InferResponseType<typeof client.api["task-history"]["$post"]>;
type RequestType = InferRequestType<typeof client.api["task-history"]["$post"]>;

export const useCreateTaskHistory = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await client.api["task-history"]["$post"]({ json });

      if (!response.ok) {
        throw new Error("Failed to create task history entry");
      }

      return await response.json();
    },
    onSuccess: (response) => {
      // Invalidate and refetch task history
      if ('data' in response) {
        queryClient.invalidateQueries({
          queryKey: ["task-history", response.data.taskId],
        });
      }
    },
    onError: () => {
      toast.error("Failed to log activity");
    },
  });

  return mutation;
};
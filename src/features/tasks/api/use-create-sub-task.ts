import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { toast } from "sonner";

type ResponseType = InferResponseType<
  typeof client.api.tasks[":taskId"]["sub-tasks"]["$post"]
>;
type RequestType = InferRequestType<
  typeof client.api.tasks[":taskId"]["sub-tasks"]["$post"]
>["json"];

interface UseCreateSubTaskProps {
  taskId: string;
}

export const useCreateSubTask = ({ taskId }: UseCreateSubTaskProps) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.tasks[":taskId"]["sub-tasks"].$post({
        param: { taskId },
        json,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error("error" in error ? error.error : "Failed to create sub-task");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Sub-task created successfully");
      queryClient.invalidateQueries({ queryKey: ["sub-tasks", taskId] });
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-history", taskId] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create sub-task");
    },
  });

  return mutation;
};
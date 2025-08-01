import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { useRouter } from "next/navigation";


type ResponseType = InferResponseType<typeof client.api.tasks[":taskId"]["$patch"], 200>;
type RequestType = InferRequestType<typeof client.api.tasks[":taskId"]["$patch"]>;

export const useUpdateTask = (options?: { showSuccessToast?: boolean }) => {
  const router = useRouter();
  const queryClient = useQueryClient();


  const mutation = useMutation<
    ResponseType,
    Error,
    RequestType
  >({

    mutationFn: async ({ json, param }) => {
      const response = await client.api.tasks[":taskId"]["$patch"]({ json, param, });

      if (!response.ok) {
        let errorMessage = `Failed to update task (${response.status})`;
        try {
          const errorData = await response.json();
          console.log("Update task error response:", errorData);
          
          // Handle different error formats
          if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (errorData.error) {
            errorMessage = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
        }
        
        throw new Error(errorMessage);
      }
      return await response.json();
    },

    onError: (error) => {
      console.error("Task update error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update task";
      toast.error(errorMessage);
    },

    onSuccess: (data, variables) => {
      router.refresh();
      
      // Only show success toast if explicitly requested (default: true)
      if (options?.showSuccessToast !== false) {
        toast.success("Task updated successfully");
      }
      
      // Invalidate all queries to ensure fresh data
      queryClient.invalidateQueries();
      
      // Specifically invalidate task history to ensure activity timeline updates
      queryClient.invalidateQueries({ 
        queryKey: ["task-history", variables.param.taskId] 
      });
      
      // Also invalidate the specific task
      queryClient.invalidateQueries({ 
        queryKey: ["task", variables.param.taskId] 
      });
    },

  });
  return mutation;
};
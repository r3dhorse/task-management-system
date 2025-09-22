import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { useRouter } from "next/navigation";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";


type ResponseType = InferResponseType<typeof client.api.tasks["$post"], 200>;
type RequestType = InferRequestType<typeof client.api.tasks["$post"]>;

// Extend the response type to include taskNumber which exists at runtime
interface TaskCreationResponse extends Omit<ResponseType, 'data'> {
  data: ResponseType['data'] & {
    taskNumber?: string;
  };
}

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const workspaceId = useWorkspaceId();


  const mutation = useMutation<
    TaskCreationResponse,
    Error,
    RequestType
  >({

    mutationFn: async ({ json }) => {
      const response = await client.api.tasks["$post"]({ json });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          
          // Handle Zod validation errors (direct response)
          if ('issues' in errorData && Array.isArray(errorData.issues)) {
            const errorMessage = errorData.issues[0]?.message || "Validation error";
            throw new Error(errorMessage);
          }
          
          // Handle standard error format: { error: "message" }
          if ('error' in errorData && errorData.error) {
            if (typeof errorData.error === 'string') {
              throw new Error(errorData.error);
            } else if (typeof errorData.error === 'object' && errorData.error !== null) {
              // Try to handle nested Zod error: { error: { issues: [...] } }
              const errorObj = errorData.error as { issues?: { message?: string }[] };
              if (errorObj.issues && Array.isArray(errorObj.issues)) {
                const errorMessage = errorObj.issues[0]?.message || "Validation error";
                throw new Error(errorMessage);
              } else {
                throw new Error(JSON.stringify(errorData.error));
              }
            }
          }
          
          // Handle alternative format: { message: "message" }
          if ('message' in errorData && errorData.message) {
            const errorMsg = typeof errorData.message === 'string' ? errorData.message : JSON.stringify(errorData.message);
            throw new Error(errorMsg);
          }
          
          // Handle string error
          if (typeof errorData === 'string') {
            throw new Error(errorData);
          }
          
          // Fallback
          throw new Error(`Failed to create task (${response.status})`);
        
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          throw new Error(`Failed to create task (${response.status})`);
        }
      }
      return await response.json();
    },

    onError: (error) => {
      toast.error(error.message || "Failed to create task");
    },

    onSuccess: (data) => {
      const taskNumber = data.data?.taskNumber;
      const taskId = data.data?.id;


      // Navigate to the created task after toast dismissal
      const navigateToTask = () => {
        if (taskId && workspaceId) {
          const url = `/workspaces/${workspaceId}/tasks/${taskId}`;
          router.push(url);
        } else {
          console.error("Missing taskId or workspaceId:", { taskId, workspaceId });
        }
      };

      toast.success(
        taskNumber
          ? `Success! ${taskNumber} has been created. Redirecting you to the task...`
          : "Task created successfully! Redirecting you to the task...",
        {
          duration: 1000,
        }
      );

      // Navigate after a short delay to allow users to see the success toast
      setTimeout(() => {
        navigateToTask();
      }, 500);
      queryClient.invalidateQueries();
    },

  });
  return mutation;
};
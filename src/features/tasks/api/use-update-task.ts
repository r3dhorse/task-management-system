import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { useRouter } from "next/navigation";


type ResponseType = InferResponseType<typeof client.api.tasks[":taskId"]["$patch"], 200>;
type RequestType = InferRequestType<typeof client.api.tasks[":taskId"]["$patch"]>;

export const useUpdateTask = (options?: { showSuccessToast?: boolean; originalWorkspaceId?: string }) => {
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
          } else if ('error' in errorData && errorData.error) {
            errorMessage = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
          } else if ('message' in errorData && errorData.message) {
            errorMessage = typeof errorData.message === 'string' ? errorData.message : JSON.stringify(errorData.message);
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

    onSuccess: async (data, variables) => {
      router.refresh();

      // Check if workspace was changed for special handling
      const wasWorkspaceChanged = variables.json.workspaceId &&
        options?.originalWorkspaceId &&
        variables.json.workspaceId !== options.originalWorkspaceId;

      if (wasWorkspaceChanged) {
        // Handle workspace transfer
        try {
          // Fetch workspace name for the toast
          const workspaceResponse = await client.api.workspaces.$get({
            query: { search: "", limit: "100", offset: "0" }
          });

          if (workspaceResponse.ok) {
            const workspacesData = await workspaceResponse.json();
            const newWorkspace = workspacesData.data.documents.find(w => w.id === data.data.workspaceId);
            const workspaceName = newWorkspace?.name || "the new workspace";

            toast.success(`Task successfully transferred to ${workspaceName}!`);
          } else {
            toast.success("Task successfully transferred to new workspace!");
          }

          // Route to default workspace
          try {
            const defaultWorkspaceResponse = await fetch('/api/users/default-workspace');
            if (defaultWorkspaceResponse.ok) {
              const defaultData = await defaultWorkspaceResponse.json();
              if (defaultData.defaultWorkspaceId) {
                router.push(`/workspaces/${defaultData.defaultWorkspaceId}`);
              } else {
                // If no default workspace, go to the first available workspace
                if (defaultData.availableWorkspaces && defaultData.availableWorkspaces.length > 0) {
                  router.push(`/workspaces/${defaultData.availableWorkspaces[0].id}`);
                } else {
                  router.push('/workspaces/create');
                }
              }
            } else {
              // Fallback: go to home page
              router.push('/');
            }
          } catch (routingError) {
            console.error("Failed to route to default workspace:", routingError);
            // Fallback: go to home page
            router.push('/');
          }
        } catch (error) {
          console.error("Failed to handle workspace transfer:", error);
          toast.success("Task successfully transferred!");
          router.push('/');
        }
      } else {
        // Normal task update (no workspace change)
        // Only show success toast if explicitly requested (default: true)
        if (options?.showSuccessToast !== false) {
          toast.success("Task updated successfully");
        }
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
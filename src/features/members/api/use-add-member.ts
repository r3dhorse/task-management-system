import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/rpc";

type ResponseType = InferResponseType<typeof client.api.members["add-user"]["$post"]>;
type RequestType = InferRequestType<typeof client.api.members["add-user"]["$post"]>;

export const useAddMember = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await client.api.members["add-user"].$post({ json });

      if (!response.ok) {
        let errorMessage = "Failed to add member";
        try {
          const errorData = await response.json() as { error?: string };
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          errorMessage = `Failed to add member (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    },
    onSuccess: (data) => {
      toast.success("Member added successfully");
      
      // Invalidate members list to refresh the data
      if ('data' in data && data.data && typeof data.data === 'object' && 'workspaceId' in data.data) {
        queryClient.invalidateQueries({ 
          queryKey: ["members", (data.data as { workspaceId: string }).workspaceId] 
        });
      }
    },
    onError: (error) => {
      console.error("Add member error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to add member";
      toast.error(errorMessage);
    },
  });

  return mutation;
};
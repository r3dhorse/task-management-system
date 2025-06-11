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
        const errorData = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(errorData.error || "Failed to add member");
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
      toast.error(error.message || "Failed to add member");
    },
  });

  return mutation;
};
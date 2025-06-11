import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";


type ResponseType = InferResponseType<typeof client.api.workspaces["$post"], 200>;
type RequestType = InferRequestType<typeof client.api.workspaces["$post"]>;

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();


  const mutation = useMutation<
    ResponseType,
    Error,
    RequestType
  >({

    mutationFn: async ({ json }) => {
      const response = await client.api.workspaces["$post"]({ json });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        if (response.status === 403) {
          throw new Error(errorData.error || "Unauthorized to create workspace");
        }
        throw new Error("Failed to create workspace");
      }

      return await response.json();
    },

    onSuccess: () => {
      toast.success("Workspace created");
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });

    },

    onError: (error) => {
      if (error.message.includes("Unauthorized") || error.message.includes("admin")) {
        toast.error("Only admin users can create workspaces");
      } else {
        toast.error("Failed to create workspace");
      }
    },

  });
  return mutation;
};
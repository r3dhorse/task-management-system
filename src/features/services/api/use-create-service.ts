import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";


type ResponseType = InferResponseType<typeof client.api.services["$post"], 200>;
type RequestType = InferRequestType<typeof client.api.services["$post"]>;

export const useCreateService = () => {
  const queryClient = useQueryClient();


  const mutation = useMutation<
    ResponseType,
    Error,
    RequestType
  >({

    mutationFn: async ({ form }) => {
      const response = await client.api.services["$post"]({ form });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
        throw new Error(errorData.error || "Failed to create service");
      }

      return await response.json();
    },

    onSuccess: () => {
      toast.success("Service created");
      queryClient.invalidateQueries();

    },

    onError: (error) => {
      toast.error(error.message || "Failed to create service");
    },

  });
  return mutation;
};
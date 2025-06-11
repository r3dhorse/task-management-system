import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { useRouter } from "next/navigation";


type ResponseType = InferResponseType<typeof client.api.services[":serviceId"]["$delete"], 200>;
type RequestType = InferRequestType<typeof client.api.services[":serviceId"]["$delete"]>;

export const useDeleteService = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation<
    ResponseType,
    Error,
    RequestType
  >({

    mutationFn: async ({  param }) => {

      const response = await client.api.services[":serviceId"]["$delete"]({param });

      if (!response.ok) {
        throw new Error("Failed to delete service");
      }

      return await response.json();
    },

    onSuccess: () => {
      toast.success("Service deleted");
      router.refresh()
      queryClient.invalidateQueries();

    },

    onError: () => {
      toast.error("Failed to delete service");
    },

  });
  return mutation;
};
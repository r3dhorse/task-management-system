import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { useRouter } from "next/navigation";


type ResponseType = InferResponseType<typeof client.api.services[":serviceId"]["$patch"], 200>;
type RequestType = InferRequestType<typeof client.api.services[":serviceId"]["$patch"]>;

export const useUpdateService = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation<
    ResponseType,
    Error,
    RequestType
  >({

    mutationFn: async ({ form, param }) => {

      const response = await client.api.services[":serviceId"]["$patch"]({ form, param });

      if (!response.ok) {
        throw new Error("Failed to update service");
      }

      return await response.json();
    },

    onSuccess: () => {
      toast.success("Service updated");
      router.refresh()
      queryClient.invalidateQueries();

    },

    onError: () => {
      toast.error("Failed to update service");
    },

  });
  return mutation;
};
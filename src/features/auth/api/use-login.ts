import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { useRouter } from "next/navigation";
import { toast } from "sonner"

type ResponseType = InferResponseType<typeof client.api.auth.login["$post"], 200>;
type RequestType = InferRequestType<typeof client.api.auth.login["$post"]>;

export const useLogin = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation<
    ResponseType,
    Error,
    RequestType
  >({

    mutationFn: async ({ json }) => {
      const response = await client.api.auth.login["$post"]({ json });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error || "Failed to login");
      }

      return await response.json();
    },

    onSuccess: () => {
      toast.success("Welcome to Task Manager");
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["current"] });
      router.refresh();
    },

    onError: (error: Error) => {
      toast.error(error.message || "Login failed");
      router.refresh();
    },

  });
  return mutation;
};
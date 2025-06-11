import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";

type ResponseType = InferResponseType<typeof client.api.auth["change-password"]["$post"], 200>;
type RequestType = InferRequestType<typeof client.api.auth["change-password"]["$post"]>;

export const useChangePassword = () => {
  const mutation = useMutation<
    ResponseType,
    Error,
    RequestType
  >({
    mutationFn: async ({ json }) => {
      const response = await client.api.auth["change-password"]["$post"]({ json });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || "Failed to change password");
      }

      return await response.json();
    },

    onSuccess: () => {
      toast.success("Password changed successfully");
    },

    onError: (error) => {
      toast.error(error.message);
    },
  });

  return mutation;
};
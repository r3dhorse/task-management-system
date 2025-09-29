import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { toast } from "sonner";

type RequestType = InferRequestType<typeof client.api.auth["forgot-password"]["$post"]>;
type ResponseType = InferResponseType<typeof client.api.auth["forgot-password"]["$post"]>;

export const useForgotPassword = () => {
  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await client.api.auth["forgot-password"]["$post"]({ json });
      
      if (!response.ok) {
        const error = await response.json() as { error: string };
        throw new Error(error.error || "Failed to send recovery email");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Recovery email sent! Please check your inbox.");
    },
    onError: (error) => {
      // Check if it's a rate limit error
      if (error.message.includes("once per day")) {
        toast.error(error.message, {
          duration: 6000, // Show for longer since it contains important info
        });
      } else {
        toast.error(error.message || "Failed to send recovery email");
      }
    },
  });

  return mutation;
};
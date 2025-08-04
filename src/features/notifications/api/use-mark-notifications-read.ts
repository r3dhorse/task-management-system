import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { toast } from "sonner";

type ResponseType = InferResponseType<typeof client.api.notifications.read.$post>;
type RequestType = InferRequestType<typeof client.api.notifications.read.$post>;

export const useMarkNotificationsRead = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await client.api.notifications.read.$post({ json });

      if (!response.ok) {
        throw new Error("Failed to mark notifications as read");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      toast.error("Failed to mark notifications as read");
      console.error("Mark notifications read error:", error);
    },
  });

  return mutation;
};
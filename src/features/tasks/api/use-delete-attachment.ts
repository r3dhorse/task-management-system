import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface DeleteAttachmentRequest {
  attachmentId: string;
  parentTaskId: string; // Used for cache invalidation
}

interface DeleteAttachmentResponse {
  data: {
    success: boolean;
    message: string;
  };
}

export const useDeleteAttachment = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    DeleteAttachmentResponse,
    Error,
    DeleteAttachmentRequest
  >({
    mutationFn: async ({ attachmentId }) => {
      const response = await fetch(`/api/attachments/${encodeURIComponent(attachmentId)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error || "Failed to delete attachment";
        throw new Error(errorMessage);
      }

      return await response.json();
    },

    onError: (error) => {
      toast.error(error.message || "Failed to delete attachment");
    },

    onSuccess: (_, variables) => {
      toast.success("Attachment deleted successfully");
      // Invalidate the attachments query for the parent task
      queryClient.invalidateQueries({
        queryKey: ["all-attachments", variables.parentTaskId],
      });
    },
  });

  return mutation;
};

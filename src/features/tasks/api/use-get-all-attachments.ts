import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface UseGetAllAttachmentsProps {
  taskId: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  taskNumber: string;
  taskName: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  isParentTask: boolean;
}

export const useGetAllAttachments = ({ taskId }: UseGetAllAttachmentsProps) => {
  const query = useQuery({
    queryKey: ["all-attachments", taskId],
    queryFn: async () => {
      const response = await client.api.tasks[":taskId"]["all-attachments"].$get({
        param: { taskId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch attachments");
      }

      const { data } = await response.json();
      return data as TaskAttachment[];
    },
    enabled: !!taskId,
  });

  return query;
};

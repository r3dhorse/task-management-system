import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/rpc";
import { TaskMessage } from "../types/messages";

type ResponseType = InferResponseType<typeof client.api.tasks.messages.$post>;
type RequestType = InferRequestType<typeof client.api.tasks.messages.$post>;

export const useCreateTaskMessage = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await client.api.tasks.messages.$post({ json });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: string; details?: string };
        const errorMessage = errorData.error || errorData.details || "Failed to send message";
        throw new Error(errorMessage);
      }

      return await response.json();
    },
    
    // Optimistic update - show message immediately
    onMutate: async ({ json }) => {
      const queryKey = ["task-messages", json.taskId];
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });
      
      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(queryKey);
      
      // Get current user data for optimistic message
      const currentUser = queryClient.getQueryData(['current-user']) as { $id: string; name: string } | undefined;
      
      // Create optimistic message
      const optimisticMessage: TaskMessage = {
        $id: `temp-${Date.now()}`,
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString(),
        $permissions: [],
        $databaseId: "",
        $collectionId: "",
        taskId: json.taskId,
        senderId: currentUser?.$id || "temp-user",
        senderName: currentUser?.name || "You",
        content: json.content,
        timestamp: new Date().toISOString(),
        workspaceId: json.workspaceId,
        attachmentId: json.attachmentId,
        attachmentName: json.attachmentName,
        attachmentSize: json.attachmentSize,
        attachmentType: json.attachmentType,
      };
      
      // Optimistically update the cache
      queryClient.setQueryData(queryKey, (old: { documents: TaskMessage[] } | undefined) => {
        if (!old) return { documents: [optimisticMessage] };
        return {
          ...old,
          documents: [...old.documents, optimisticMessage]
        };
      });
      
      return { previousMessages };
    },
    
    onSuccess: (data) => {
      // Check if response has data property (success case)
      if ('data' in data) {
        const queryKey = ["task-messages", (data as { data: TaskMessage }).data.taskId];
        queryClient.setQueryData(queryKey, (old: { documents: TaskMessage[] } | undefined) => {
          if (!old) return { documents: [(data as { data: TaskMessage }).data] };
          
          // Remove temporary message and add real one
          const filteredMessages = old.documents.filter(
            (msg: TaskMessage) => !msg.$id.startsWith('temp-')
          );
          
          return {
            ...old,
            documents: [...filteredMessages, (data as { data: TaskMessage }).data]
          };
        });
      }
    },
    
    onError: (error, variables, context) => {
      console.error("Message creation error:", error);
      toast.error(error.message || "Failed to send message");
      
      // Revert optimistic update
      if (context && typeof context === 'object' && 'previousMessages' in context) {
        queryClient.setQueryData(
          ["task-messages", variables.json.taskId], 
          (context as { previousMessages: unknown }).previousMessages
        );
      }
    },
  });

  return mutation;
};
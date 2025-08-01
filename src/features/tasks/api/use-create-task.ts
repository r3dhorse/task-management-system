import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";


type ResponseType = InferResponseType<typeof client.api.tasks["$post"], 200>;
type RequestType = InferRequestType<typeof client.api.tasks["$post"]>;

export const useCreateTask = () => {
  const queryClient = useQueryClient();


  const mutation = useMutation<
    ResponseType,
    Error,
    RequestType
  >({

    mutationFn: async ({ json }) => {
      const response = await client.api.tasks["$post"]({ json });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          console.log("Raw error response:", errorData);
          
          // Handle Zod validation errors (direct response)
          if (errorData.issues && Array.isArray(errorData.issues)) {
            const errorMessage = errorData.issues[0]?.message || "Validation error";
            console.log("Using Zod validation error:", errorMessage);
            throw new Error(errorMessage);
          }
          
          // Handle standard error format: { error: "message" }
          if (errorData.error) {
            if (typeof errorData.error === 'string') {
              console.log("Using error field (string):", errorData.error);
              throw new Error(errorData.error);
            } else if (errorData.error.issues && Array.isArray(errorData.error.issues)) {
              // Nested Zod error: { error: { issues: [...] } }
              const errorMessage = errorData.error.issues[0]?.message || "Validation error";
              console.log("Using nested Zod error:", errorMessage);
              throw new Error(errorMessage);
            } else {
              console.log("Using error field (object):", errorData.error);
              throw new Error(JSON.stringify(errorData.error));
            }
          }
          
          // Handle alternative format: { message: "message" }
          if (errorData.message) {
            const errorMsg = typeof errorData.message === 'string' ? errorData.message : JSON.stringify(errorData.message);
            console.log("Using message field:", errorMsg);
            throw new Error(errorMsg);
          }
          
          // Handle string error
          if (typeof errorData === 'string') {
            console.log("Using string error:", errorData);
            throw new Error(errorData);
          }
          
          // Fallback
          console.log("Using fallback error message");
          throw new Error(`Failed to create task (${response.status})`);
        
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          console.error("Parse error message:", parseError instanceof Error ? parseError.message : String(parseError));
          throw new Error(`Failed to create task (${response.status})`);
        }
      }
      return await response.json();
    },

    onError: (error) => {
      toast.error(error.message || "Failed to create task");
    },

    onSuccess: () => {
      toast.success("Task created");
      queryClient.invalidateQueries();
    },

  });
  return mutation;
};
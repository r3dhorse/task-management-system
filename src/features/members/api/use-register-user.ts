import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MemberRole } from "../types";

interface RegisterUserRequest {
  name: string;
  email: string;
  password: string;
  workspaceId: string;
  role: MemberRole;
}

interface RegisterUserResponse {
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    isAdmin: boolean;
    createdAt: string;
  };
}

export const useRegisterUser = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<RegisterUserResponse, Error, RegisterUserRequest>({
    mutationFn: async ({ name, email, password, workspaceId, role }) => {
      // First, register the user
      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to register user");
      }

      const registerResult = await registerResponse.json();

      // Then, add them as a member to the workspace
      const addMemberResponse = await fetch("/api/members/add-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId,
          userId: registerResult.user.id,
          role,
        }),
      });

      if (!addMemberResponse.ok) {
        const errorData = await addMemberResponse.json().catch(() => ({}));
        // If adding to workspace fails, we should still consider the user creation successful
        console.error("Failed to add user to workspace:", errorData.error);
        toast.error("User created but failed to add to workspace. Please add them manually.");
      }

      return registerResult;
    },
    
    onSuccess: (data) => {
      toast.success(`User ${data.user.name} has been created successfully!`);
      
      // Invalidate members list to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    
    onError: (error) => {
      console.error("User registration error:", error);
      toast.error(error.message || "Failed to register user");
    },
  });

  return mutation;
};
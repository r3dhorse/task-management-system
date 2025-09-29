import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

type ChangePasswordRequest = {
  json: {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
};

type ChangePasswordResponse = {
  success: boolean;
};

export const useChangePassword = () => {
  const mutation = useMutation<
    ChangePasswordResponse,
    Error,
    ChangePasswordRequest
  >({
    mutationFn: async ({ json }) => {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(json),
      });

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
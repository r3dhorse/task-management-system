import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signIn } from "next-auth/react";

type LoginRequest = {
  json: {
    email: string;
    password: string;
  };
};

export const useLogin = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation<
    { ok?: boolean; error?: string },
    Error,
    LoginRequest
  >({
    mutationFn: async ({ json }) => {
      const result = await signIn("credentials", {
        email: json.email,
        password: json.password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      if (!result?.ok) {
        throw new Error("Invalid credentials");
      }

      return { ok: result.ok };
    },

    onSuccess: () => {
      toast.success("Welcome to Task Manager");
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["current"] });
      router.push("/");
      router.refresh();
    },

    onError: (error: Error) => {
      const friendlyMessage = error.message === "Invalid credentials" 
        ? "Incorrect email or password. Please check your credentials and try again."
        : error.message === "CredentialsSignin"
        ? "Incorrect email or password. Please check your credentials and try again."
        : error.message || "Unable to sign in. Please try again.";
      
      toast.error(friendlyMessage);
    },
  });

  return mutation;
};
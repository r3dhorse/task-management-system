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

      return result;
    },

    onSuccess: () => {
      toast.success("Welcome to Task Manager");
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["current"] });
      router.push("/");
      router.refresh();
    },

    onError: (error: Error) => {
      toast.error(error.message || "Login failed");
    },
  });

  return mutation;
};
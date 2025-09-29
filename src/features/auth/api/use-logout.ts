import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signOut } from "next-auth/react";

export const useLogout = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation<void, Error>({
    mutationFn: async () => {
      await signOut({ redirect: false });
    },

    onSuccess: () => {
      toast.success("Signed out successfully");
      queryClient.clear(); // Clear all queries
      router.push("/sign-in");
      router.refresh();
    },

    onError: () => {
      toast.error("Failed to sign out");
    },
  });

  return mutation;
};

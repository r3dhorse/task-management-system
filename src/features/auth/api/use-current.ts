import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

export const useCurrent = () => {
  const { data: session, status } = useSession();

  const query = useQuery({
    queryKey: ["current"],
    queryFn: async () => {
      if (status === "loading") return null;
      if (!session?.user) return null;
      
      return {
        $id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        isAdmin: (session.user as any).isAdmin || false,
      };
    },
    enabled: status !== "loading",
  });

  return query;
};
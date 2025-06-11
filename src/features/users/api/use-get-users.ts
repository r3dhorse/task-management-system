import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

export const useGetUsers = () => {
  const query = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await client.api.users.$get();

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const { data } = await response.json();
      return data;
    },
  });

  return query;
};
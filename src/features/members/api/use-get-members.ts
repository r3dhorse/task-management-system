import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface useGetMembersProps {
  workspaceId: string | undefined;
}


export const useGetMembers = ({
  workspaceId,
}: useGetMembersProps) => {
  const query = useQuery({
    queryKey: ["members", workspaceId],
    queryFn: async () => {
      if (!workspaceId) {
        throw new Error("Workspace ID is required");
      }

      // Fetch all members (limit: 100) for analytics and dashboard purposes
      const response = await client.api.members.$get({
        query: {
          workspaceId,
          limit: "100" // Fetch all members, not just 6
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch members")
      }

      const { data } = await response.json();
      return data;

    },
    enabled: !!workspaceId, // Only run query if workspaceId is truthy

  });

  return query;
};
export enum MemberRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
  VISITOR = "VISITOR"
};

export interface Member {
  $id: string;
  $collectionId: string;
  $databaseId: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  name: string;
  email: string;
  userId: string;
  role: MemberRole;
  workspaceId: string;
}
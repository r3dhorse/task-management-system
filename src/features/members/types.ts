export enum MemberRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
  CUSTOMER = "CUSTOMER"
};

export interface Member {
  id: string;
  $id?: string; // For backward compatibility
  name: string;
  email: string;
  userId: string;
  role: MemberRole;
  workspaceId: string;
  joinedAt: string;
  // Legacy Appwrite fields for backward compatibility
  $collectionId?: string;
  $databaseId?: string;
  $createdAt?: string;
  $updatedAt?: string;
  $permissions?: string[];
}
export type Workspace = {
  id: string;
  name: string;
  description?: string | null;
  inviteCode: string;
  userId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
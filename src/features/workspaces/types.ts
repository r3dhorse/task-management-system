import { Models } from "node-appwrite";

export type Workspace = Models.Document & {
  name: string;
  description?: string;
  inviteCode: string;
  userId: string;
}
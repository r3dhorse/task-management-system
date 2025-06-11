import { Models } from "node-appwrite";

export type Service = Models.Document & {
  name: string;
  workspaceId: string;

};
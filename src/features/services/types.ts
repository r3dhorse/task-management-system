import { RoutinaryFrequency } from "./schemas";

export type Service = {
  id: string;
  name: string;
  workspaceId: string;
  isPublic: boolean;
  slaDays?: number | null;
  includeWeekends: boolean;
  // Routinary fields
  isRoutinary: boolean;
  routinaryFrequency?: RoutinaryFrequency | null;
  routinaryStartDate?: Date | null;
  routinaryNextRunDate?: Date | null;
  routinaryLastRunDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type { RoutinaryFrequency };

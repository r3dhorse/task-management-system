import { Models } from "node-appwrite";

/**
 * Check if a user has admin privileges based on their labels
 * @param user - The user object from Appwrite
 * @returns boolean indicating if user is admin
 */
export const isAdminUser = (user: Models.User<Models.Preferences> | null): boolean => {
  if (!user || !user.labels) {
    return false;
  }
  
  return user.labels.includes("admin");
};

/**
 * Check if a user has member privileges based on their labels
 * @param user - The user object from Appwrite
 * @returns boolean indicating if user is a member
 */
export const isMemberUser = (user: Models.User<Models.Preferences> | null): boolean => {
  if (!user || !user.labels) {
    return false;
  }
  
  return user.labels.includes("member");
};

/**
 * Check if a user is authorized (admin or member)
 * @param user - The user object from Appwrite
 * @returns boolean indicating if user is authorized
 */
export const isAuthorizedUser = (user: Models.User<Models.Preferences> | null): boolean => {
  return isAdminUser(user) || isMemberUser(user);
};

/**
 * Check if a user can create workspaces (admin users or new users with no workspaces)
 * @param user - The user object from Appwrite
 * @returns boolean indicating if user can create workspaces
 */
export const canCreateWorkspace = (user: Models.User<Models.Preferences> | null): boolean => {
  if (!user) return false;
  
  // Admin users can always create workspaces
  if (isAdminUser(user)) return true;
  
  // Allow any authenticated user to create their first workspace
  return true;
};
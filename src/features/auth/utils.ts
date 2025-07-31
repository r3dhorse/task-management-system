// NextAuth.js user type
interface AuthUser {
  id?: string;
  $id?: string; // For backward compatibility
  name?: string | null;
  email?: string | null;
  isAdmin?: boolean;
}

/**
 * Check if a user has admin privileges
 * @param user - The user object from NextAuth.js or legacy format
 * @returns boolean indicating if user is admin
 */
export const isAdminUser = (user: AuthUser | null): boolean => {
  if (!user) {
    return false;
  }
  
  // Check for NextAuth.js format
  if ('isAdmin' in user) {
    return user.isAdmin === true;
  }
  
  // Legacy Appwrite format support
  if ('labels' in user && Array.isArray((user as any).labels)) {
    return (user as any).labels.includes("admin");
  }
  
  return false;
};

/**
 * Check if a user has member privileges (legacy support)
 * @param user - The user object
 * @returns boolean indicating if user is a member
 */
export const isMemberUser = (user: AuthUser | null): boolean => {
  if (!user) {
    return false;
  }
  
  // In NextAuth.js, all authenticated users are members
  return true;
};

/**
 * Check if a user is authorized (authenticated)
 * @param user - The user object
 * @returns boolean indicating if user is authorized
 */
export const isAuthorizedUser = (user: AuthUser | null): boolean => {
  return user !== null;
};

/**
 * Check if a user can create workspaces
 * @param user - The user object
 * @returns boolean indicating if user can create workspaces
 */
export const canCreateWorkspace = (user: AuthUser | null): boolean => {
  if (!user) return false;
  
  // Only admin users can create workspaces
  return isAdminUser(user);
};
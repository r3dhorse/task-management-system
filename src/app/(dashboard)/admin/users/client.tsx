"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Search, Edit, Trash2, Loader2, Key, Shield, ShieldCheck, Copy, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Switch } from "@/components/ui/switch";

interface User {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    ownedWorkspaces: number;
    memberships: number;
  };
}

interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export function UserManagementClient() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tempPasswordDialogOpen, setTempPasswordDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ 
    name: "", 
    email: "", 
    isAdmin: false, 
    isSuperAdmin: false 
  });
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    temporaryPassword: "",
    isAdmin: false,
    isSuperAdmin: false,
  });
  const [tempPassword, setTempPassword] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [createdUserPassword, setCreatedUserPassword] = useState("");

  const queryClient = useQueryClient();

  // Fetch users
  const { data, isLoading, error } = useQuery<UsersResponse>({
    queryKey: ["users", page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        ...(search && { search }),
      });
      const response = await fetch(`/api/users?${params}`);
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      temporaryPassword: string;
      isAdmin: boolean;
      isSuperAdmin: boolean;
    }) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create user");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created successfully");
      setCreatedUserPassword(data.temporaryPassword);
      setCreateForm({
        name: "",
        email: "",
        temporaryPassword: "",
        isAdmin: false,
        isSuperAdmin: false,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { 
      userId: string; 
      data: { name?: string; email?: string; isAdmin?: boolean; isSuperAdmin?: boolean } 
    }) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated successfully");
      setEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted successfully");
      setDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Set temporary password mutation
  const setTempPasswordMutation = useMutation({
    mutationFn: async ({ userId, temporaryPassword }: { userId: string; temporaryPassword: string }) => {
      const response = await fetch(`/api/users/${userId}/set-temp-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temporaryPassword }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to set temporary password");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast.success("Temporary password set successfully");
      setGeneratedPassword(data.temporaryPassword);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
    });
    setEditDialogOpen(true);
  };

  const handleTempPassword = (user: User) => {
    setSelectedUser(user);
    setTempPassword("");
    setGeneratedPassword("");
    setTempPasswordDialogOpen(true);
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTempPassword(password);
  };

  const generateCreatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCreateForm({ ...createForm, temporaryPassword: password });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Password copied to clipboard");
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleCreateUser = () => {
    setCreateForm({
      name: "",
      email: "",
      temporaryPassword: "",
      isAdmin: false,
      isSuperAdmin: false,
    });
    setCreatedUserPassword("");
    setCreateDialogOpen(true);
  };

  const handleCreateSubmit = () => {
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.temporaryPassword.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    createUserMutation.mutate(createForm);
  };

  const handleUpdateSubmit = () => {
    if (!selectedUser) return;
    
    const updates: { name?: string; email?: string; isAdmin?: boolean; isSuperAdmin?: boolean } = {};
    if (editForm.name !== selectedUser.name) updates.name = editForm.name;
    if (editForm.email !== selectedUser.email) updates.email = editForm.email;
    if (editForm.isAdmin !== selectedUser.isAdmin) updates.isAdmin = editForm.isAdmin;
    if (editForm.isSuperAdmin !== selectedUser.isSuperAdmin) updates.isSuperAdmin = editForm.isSuperAdmin;
    
    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save");
      return;
    }

    updateUserMutation.mutate({ userId: selectedUser.id, data: updates });
  };

  const handleSetTempPassword = () => {
    if (!selectedUser || !tempPassword.trim()) {
      toast.error("Please enter a temporary password");
      return;
    }
    
    setTempPasswordMutation.mutate({ 
      userId: selectedUser.id, 
      temporaryPassword: tempPassword 
    });
  };

  const handleDeleteConfirm = () => {
    if (!selectedUser) return;
    deleteUserMutation.mutate(selectedUser.id);
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">Error loading users: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>User Management</CardTitle>
            <Button onClick={handleCreateUser} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create User
            </Button>
          </div>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Workspaces</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name || "No name"}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.isSuperAdmin && (
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-semibold">
                            Super Admin
                          </span>
                        )}
                        {!user.isSuperAdmin && user.isAdmin && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                            Admin
                          </span>
                        )}
                        {!user.isSuperAdmin && !user.isAdmin && (
                          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                            User
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Owned: {user._count.ownedWorkspaces}</div>
                          <div>Member: {user._count.memberships}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(user.createdAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(user)}
                            title="Edit user"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTempPassword(user)}
                            title="Set temporary password"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(user)}
                            disabled={user.isSuperAdmin}
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {data && data.pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
                  <div className="text-sm text-gray-600">
                    Showing {((page - 1) * 15) + 1} to {Math.min(page * 15, data.pagination.totalCount)} of {data.pagination.totalCount} users
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(
                          data.pagination.totalPages - 4,
                          Math.max(1, page - 2)
                        )) + i;
                        
                        if (pageNum > data.pagination.totalPages) return null;
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === page ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            className="w-10 h-8"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page === data.pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Changes will take effect immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                placeholder="Enter name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                placeholder="Enter email"
              />
            </div>
            
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-sm text-gray-900">User Roles</h4>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <Label htmlFor="isAdmin" className="text-sm">
                    Admin
                  </Label>
                  <span className="text-xs text-gray-500">
                    Can create workspaces
                  </span>
                </div>
                <Switch
                  id="isAdmin"
                  checked={editForm.isAdmin}
                  onCheckedChange={(checked) =>
                    setEditForm({ ...editForm, isAdmin: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="h-4 w-4 text-purple-600" />
                  <Label htmlFor="isSuperAdmin" className="text-sm">
                    Super Admin
                  </Label>
                  <span className="text-xs text-gray-500">
                    Full system access
                  </span>
                </div>
                <Switch
                  id="isSuperAdmin"
                  checked={editForm.isSuperAdmin}
                  onCheckedChange={(checked) =>
                    setEditForm({ ...editForm, isSuperAdmin: checked })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updateUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateSubmit}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new user account with a temporary password. The user should change their password after first login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="createName">Name *</Label>
              <Input
                id="createName"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
                placeholder="Enter full name"
              />
            </div>
            <div>
              <Label htmlFor="createEmail">Email *</Label>
              <Input
                id="createEmail"
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, email: e.target.value })
                }
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="createPassword">Temporary Password *</Label>
              <div className="flex gap-2">
                <Input
                  id="createPassword"
                  type="text"
                  value={createForm.temporaryPassword}
                  readOnly
                  placeholder="Click Generate to create password"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateCreatePassword}
                  disabled={createUserMutation.isPending}
                >
                  Generate
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 8 characters long
              </p>
            </div>
            
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-sm text-gray-900">User Roles</h4>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <Label htmlFor="createIsAdmin" className="text-sm">
                    Admin
                  </Label>
                  <span className="text-xs text-gray-500">
                    Can create workspaces
                  </span>
                </div>
                <Switch
                  id="createIsAdmin"
                  checked={createForm.isAdmin}
                  onCheckedChange={(checked) =>
                    setCreateForm({ ...createForm, isAdmin: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="h-4 w-4 text-purple-600" />
                  <Label htmlFor="createIsSuperAdmin" className="text-sm">
                    Super Admin
                  </Label>
                  <span className="text-xs text-gray-500">
                    Full system access
                  </span>
                </div>
                <Switch
                  id="createIsSuperAdmin"
                  checked={createForm.isSuperAdmin}
                  onCheckedChange={(checked) =>
                    setCreateForm({ ...createForm, isSuperAdmin: checked })
                  }
                />
              </div>
            </div>

            {createdUserPassword && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      User created successfully!
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Temporary password: <strong>{createdUserPassword}</strong>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(createdUserPassword)}
                    className="ml-2"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={createUserMutation.isPending}
            >
              {createdUserPassword ? "Close" : "Cancel"}
            </Button>
            {!createdUserPassword && (
              <Button
                onClick={handleCreateSubmit}
                disabled={createUserMutation.isPending || !createForm.name.trim() || !createForm.email.trim() || !createForm.temporaryPassword.trim()}
              >
                {createUserMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create User"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              user account for <strong>{selectedUser?.email}</strong> and remove
              all of their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUserMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteUserMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete User"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Temporary Password Dialog */}
      <Dialog open={tempPasswordDialogOpen} onOpenChange={setTempPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Temporary Password</DialogTitle>
            <DialogDescription>
              Set a temporary password for <strong>{selectedUser?.email}</strong>. 
              The user can use this to log in and should change it immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tempPassword">Temporary Password</Label>
              <div className="flex gap-2">
                <Input
                  id="tempPassword"
                  type="text"
                  value={tempPassword}
                  readOnly
                  placeholder="Click Generate to create password"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateRandomPassword}
                  disabled={setTempPasswordMutation.isPending}
                >
                  Generate
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 8 characters long
              </p>
            </div>
            
            {generatedPassword && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Temporary password has been set!
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Share this password with the user: <strong>{generatedPassword}</strong>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(generatedPassword)}
                    className="ml-2"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTempPasswordDialogOpen(false)}
              disabled={setTempPasswordMutation.isPending}
            >
              {generatedPassword ? "Close" : "Cancel"}
            </Button>
            {!generatedPassword && (
              <Button
                onClick={handleSetTempPassword}
                disabled={setTempPasswordMutation.isPending || !tempPassword.trim()}
              >
                {setTempPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting...
                  </>
                ) : (
                  "Set Password"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
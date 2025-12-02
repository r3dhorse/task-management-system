"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
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
  DialogOverlay,
  DialogPortal,
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
import { Search, Edit, Trash2, Loader2, Key, Shield, ShieldCheck, Copy, Plus, X } from "@/lib/lucide-icons";
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

interface UserManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserManagementModal({ open, onOpenChange }: UserManagementModalProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300); // 300ms debounce
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
  const [emailErrors, setEmailErrors] = useState({ edit: false, create: false });

  const queryClient = useQueryClient();

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Reset states when modal closes
  useEffect(() => {
    if (!open) {
      setPage(1);
      setSearch("");
      setSelectedUser(null);
      setEditDialogOpen(false);
      setCreateDialogOpen(false);
      setDeleteDialogOpen(false);
      setTempPasswordDialogOpen(false);
      setCreatedUserPassword("");
      setGeneratedPassword("");
    }
  }, [open]);

  // Cleanup queries when component unmounts
  useEffect(() => {
    return () => {
      queryClient.removeQueries({ queryKey: ["users"] });
    };
  }, [queryClient]);

  // Fetch users with optimizations
  const { data, isLoading, error } = useQuery<UsersResponse>({
    queryKey: ["users", page, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        ...(debouncedSearch && { search: debouncedSearch }),
      });
      const response = await fetch(`/api/users?${params}`);
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    enabled: open, // Only fetch when modal is open
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
      // Optimized invalidation - only invalidate current page
      queryClient.invalidateQueries({
        queryKey: ["users", page, debouncedSearch],
        exact: true
      });
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
      // Optimized invalidation - only invalidate current page
      queryClient.invalidateQueries({
        queryKey: ["users", page, debouncedSearch],
        exact: true
      });
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
      // Optimized invalidation - only invalidate current page
      queryClient.invalidateQueries({
        queryKey: ["users", page, debouncedSearch],
        exact: true
      });
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


  // Memoized handlers to prevent re-renders
  const handleCreateUser = useCallback(() => {
    setCreateForm({
      name: "",
      email: "",
      temporaryPassword: "",
      isAdmin: false,
      isSuperAdmin: false,
    });
    setCreatedUserPassword("");
    setCreateDialogOpen(true);
  }, []);

  const handleEdit = useCallback((user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
    });
    setEditDialogOpen(true);
  }, []);

  const handleDelete = useCallback((user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  }, []);

  const handleTempPassword = useCallback((user: User) => {
    setSelectedUser(user);
    setTempPassword("");
    setGeneratedPassword("");
    setTempPasswordDialogOpen(true);
  }, []);

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

  // Memoized pagination info to prevent recalculation
  const paginationInfo = useMemo(() => {
    if (!data) return null;

    const { pagination } = data;
    const startItem = ((page - 1) * 15) + 1;
    const endItem = Math.min(page * 15, pagination.totalCount);

    return {
      startItem,
      endItem,
      totalCount: pagination.totalCount,
      totalPages: pagination.totalPages,
      hasMultiplePages: pagination.totalPages > 1,
    };
  }, [data, page]);

  // Memoized page numbers for pagination
  const pageNumbers = useMemo(() => {
    if (!paginationInfo) return [];

    const { totalPages } = paginationInfo;
    const maxPages = Math.min(5, totalPages);
    const startPage = Math.max(1, Math.min(
      totalPages - 4,
      Math.max(1, page - 2)
    ));

    return Array.from({ length: maxPages }, (_, i) => {
      const pageNum = startPage + i;
      return pageNum <= totalPages ? pageNum : null;
    }).filter(Boolean) as number[];
  }, [paginationInfo, page]);

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl h-[80vh] p-0">
          <DialogTitle className="sr-only">User Management Error</DialogTitle>
          <div className="p-6">
            <p className="text-red-500">Error loading users: {error.message}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPortal>
          <DialogOverlay className="bg-white/70 backdrop-blur-md" />
          <DialogContent className="max-w-6xl h-[80vh] p-0 gap-0 bg-white/95 backdrop-blur-sm border shadow-lg"
            style={{ transform: "translate(-50%, -50%)", left: "50%", top: "50%", position: "fixed" }}
            hideCloseButton={true}
          >
          <div className="flex flex-col h-full">
            {/* Header with close button */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-purple-600" />
                <DialogTitle className="text-xl font-semibold">User Management</DialogTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-auto p-6">
                <div className="space-y-4">
                  {/* Action bar */}
                  <div className="flex justify-between items-center">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                        autoComplete="off"
                      />
                    </div>
                    <Button onClick={handleCreateUser} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Create User
                    </Button>
                  </div>

                  {/* Table */}
                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <div className="border rounded-lg bg-white">
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
                    </div>
                  )}

                  {/* Pagination */}
                  {paginationInfo?.hasMultiplePages && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
                      <div className="text-sm text-gray-600">
                        Showing {paginationInfo.startItem} to {paginationInfo.endItem} of {paginationInfo.totalCount} users
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
                          {pageNumbers.map((pageNum) => (
                            <Button
                              key={pageNum}
                              variant={pageNum === page ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => setPage(pageNum)}
                              className="w-10 h-8"
                            >
                              {pageNum}
                            </Button>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => p + 1)}
                          disabled={page === paginationInfo.totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

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
                type="text"
                value={editForm.email}
                onChange={(e) => {
                  const email = e.target.value;
                  setEditForm({ ...editForm, email });
                  const isValid = email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
                  setEmailErrors(prev => ({ ...prev, edit: !isValid }));
                }}
                placeholder="Enter email"
                className={emailErrors.edit ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}
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
                type="text"
                value={createForm.email}
                onChange={(e) => {
                  const email = e.target.value;
                  setCreateForm({ ...createForm, email });
                  const isValid = email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
                  setEmailErrors(prev => ({ ...prev, create: !isValid }));
                }}
                placeholder="Enter email address"
                className={emailErrors.create ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}
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
    </>
  );
}
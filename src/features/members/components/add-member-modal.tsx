"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  UserPlusIcon, 
  SearchIcon, 
  MailIcon, 
  UserIcon,
  CheckIcon,
  AlertCircleIcon 
} from "lucide-react";
import { useSearchUsers } from "../api/use-search-users";
import { useAddMember } from "../api/use-add-member";
import { MemberRole } from "../types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

interface User {
  $id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

export const AddMemberModal = ({ isOpen, onClose, workspaceId }: AddMemberModalProps) => {
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<MemberRole>(MemberRole.MEMBER);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);

  const { data: searchResults, isLoading: isSearching } = useSearchUsers({
    workspaceId,
    search,
    enabled: isOpen && search.length >= 2,
  });

  const { mutate: addMember, isPending: isAddingMember } = useAddMember();

  const handleAddUser = (user: User) => {
    setAddingUserId(user.$id);
    addMember(
      {
        json: {
          workspaceId,
          userId: user.$id,
          role: selectedRole,
        },
      },
      {
        onSuccess: () => {
          setAddingUserId(null);
          setSearch("");
          onClose();
        },
        onError: () => {
          setAddingUserId(null);
        },
      }
    );
  };

  const handleClose = () => {
    setSearch("");
    setAddingUserId(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlusIcon className="h-5 w-5 text-blue-600" />
            Add Member to Workspace
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Search users by name or email
            </label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
            {search.length > 0 && search.length < 2 && (
              <p className="text-xs text-gray-500">Type at least 2 characters to search</p>
            )}
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Default role for new members
            </label>
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as MemberRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MemberRole.MEMBER}>
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    <span>Member</span>
                    <span className="text-xs text-gray-500">- Standard access</span>
                  </div>
                </SelectItem>
                <SelectItem value={MemberRole.ADMIN}>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4" />
                    <span>Administrator</span>
                    <span className="text-xs text-gray-500">- Full access</span>
                  </div>
                </SelectItem>
                <SelectItem value={MemberRole.VISITOR}>
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    <span>Visitor</span>
                    <span className="text-xs text-gray-500">- Limited access</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Results */}
          <div className="space-y-2">
            {search.length >= 2 && (
              <div className="border rounded-lg bg-gray-50 max-h-64 overflow-y-auto">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2 text-sm text-gray-600">Searching users...</span>
                  </div>
                ) : searchResults && searchResults.length > 0 ? (
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 mb-2 px-2">
                      Found {searchResults.length} user{searchResults.length !== 1 ? 's' : ''}
                    </div>
                    <div className="space-y-1">
                      {searchResults.map((user: User) => (
                        <div
                          key={user.$id}
                          className="flex items-center justify-between p-3 rounded-md bg-white border hover:border-blue-200 hover:bg-blue-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold">
                                {user.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {user.name}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <MailIcon className="h-3 w-3" />
                                <span className="truncate">{user.email}</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAddUser(user)}
                            disabled={isAddingMember || addingUserId === user.$id}
                            className="shrink-0 bg-blue-600 hover:bg-blue-700"
                          >
                            {addingUserId === user.$id ? (
                              <LoadingSpinner size="sm" className="mr-1" />
                            ) : (
                              <UserPlusIcon className="h-3 w-3 mr-1" />
                            )}
                            {addingUserId === user.$id ? "Adding..." : "Add"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : search.length >= 2 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircleIcon className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 font-medium">No users found</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Try searching with a different name or email
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Helper Text */}
          {search.length < 2 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="h-5 w-5 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <UserPlusIcon className="h-3 w-3 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900">
                    Search for existing users
                  </p>
                  <p className="text-xs text-blue-700">
                    Start typing to find users by their name or email address. Only users who have already registered on the platform will appear in the search results.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isAddingMember}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
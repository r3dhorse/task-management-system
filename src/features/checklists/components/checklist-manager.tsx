"use client";

import { useState } from "react";
import { useGetChecklist } from "../api/use-get-checklist";
import { useCreateChecklist } from "../api/use-create-checklist";
import { useAddChecklistItem } from "../api/use-add-checklist-item";
import { useUpdateChecklistItem } from "../api/use-update-checklist-item";
import { useDeleteChecklistItem } from "../api/use-delete-checklist-item";
import { useReorderChecklistItems } from "../api/use-reorder-checklist-items";
import { ChecklistItem } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical, Loader2, Edit, Check, X, ClipboardList, Camera, MessageSquare } from "@/lib/lucide-icons";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 4;

interface ChecklistManagerProps {
  serviceId: string;
  serviceName: string;
}

export const ChecklistManager = ({ serviceId, serviceName }: ChecklistManagerProps) => {
  const { data: checklist, isLoading } = useGetChecklist({ serviceId });
  const { mutate: createChecklist, isPending: isCreating } = useCreateChecklist();
  const { mutate: addItem, isPending: isAdding } = useAddChecklistItem();
  const { mutate: updateItem, isPending: isUpdating } = useUpdateChecklistItem();
  const { mutate: deleteItem, isPending: isDeleting } = useDeleteChecklistItem();
  const { mutate: reorderItems } = useReorderChecklistItems();

  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemRequirePhoto, setNewItemRequirePhoto] = useState(false);
  const [newItemRequireRemarks, setNewItemRequireRemarks] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRequirePhoto, setEditRequirePhoto] = useState(false);
  const [editRequireRemarks, setEditRequireRemarks] = useState(false);
  const [isGlpiEnabled, setIsGlpiEnabled] = useState(false); // For future GLPI ticket integration
  const [page, setPage] = useState(1);

  const handleCreateChecklist = () => {
    createChecklist({ json: { serviceId } });
  };

  const handleAddItem = () => {
    if (!newItemTitle.trim() || !checklist) return;
    addItem({
      checklistId: checklist.id,
      serviceId,
      title: newItemTitle.trim(),
      description: newItemDescription.trim() || undefined,
      requirePhoto: newItemRequirePhoto,
      requireRemarks: newItemRequireRemarks,
    });
    setNewItemTitle("");
    setNewItemDescription("");
    setNewItemRequirePhoto(false);
    setNewItemRequireRemarks(false);
  };

  const handleStartEdit = (item: { id: string; title: string; description?: string | null; requirePhoto?: boolean; requireRemarks?: boolean }) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDescription(item.description || "");
    setEditRequirePhoto(item.requirePhoto ?? false);
    setEditRequireRemarks(item.requireRemarks ?? false);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editTitle.trim() || !checklist) return;
    updateItem({
      checklistId: checklist.id,
      itemId: editingId,
      serviceId,
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      requirePhoto: editRequirePhoto,
      requireRemarks: editRequireRemarks,
    });
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
    setEditRequirePhoto(false);
    setEditRequireRemarks(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
    setEditRequirePhoto(false);
    setEditRequireRemarks(false);
  };

  const handleDeleteItem = (itemId: string) => {
    if (!checklist) return;
    deleteItem({
      checklistId: checklist.id,
      itemId,
      serviceId,
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !checklist?.items) return;

    // Calculate global indexes from paginated indexes
    const globalSourceIndex = startIndex + result.source.index;
    const globalDestIndex = startIndex + result.destination.index;

    const allItems = [...(checklist.items as ChecklistItem[])];
    const [reorderedItem] = allItems.splice(globalSourceIndex, 1);
    allItems.splice(globalDestIndex, 0, reorderedItem);

    reorderItems({
      checklistId: checklist.id,
      serviceId,
      itemIds: allItems.map((item) => item.id),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!checklist) {
    return (
      <Card className="border-dashed border-2 border-gray-300">
        <CardContent className="py-12 text-center">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Checklist for {serviceName}
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Create a checklist to define items that will be automatically added to tasks
            created for this service.
          </p>
          <Button onClick={handleCreateChecklist} disabled={isCreating}>
            {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create Checklist
          </Button>
        </CardContent>
      </Card>
    );
  }

  const items = checklist.items || [];
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  // Ensure current page is valid
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedItems = items.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Add New Item */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Checklist Item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Item title (required)"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
          />
          <Textarea
            placeholder="Description (optional)"
            value={newItemDescription}
            onChange={(e) => setNewItemDescription(e.target.value)}
            rows={2}
          />
          {/* Required Photo and Remarks toggles */}
          <div className="flex flex-wrap gap-6 pt-2">
            <div className="flex items-center gap-2">
              <Switch
                id="require-photo"
                checked={newItemRequirePhoto}
                onCheckedChange={setNewItemRequirePhoto}
              />
              <Label htmlFor="require-photo" className="flex items-center gap-1.5 text-sm cursor-pointer">
                <Camera className="h-4 w-4 text-gray-500" />
                Required Photo
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="require-remarks"
                checked={newItemRequireRemarks}
                onCheckedChange={setNewItemRequireRemarks}
              />
              <Label htmlFor="require-remarks" className="flex items-center gap-1.5 text-sm cursor-pointer">
                <MessageSquare className="h-4 w-4 text-gray-500" />
                Required Remarks
              </Label>
            </div>
          </div>
          <Button
            onClick={handleAddItem}
            disabled={!newItemTitle.trim() || isAdding}
          >
            {isAdding && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardContent>
      </Card>

      {/* Checklist Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              Checklist Items
              <span className="text-sm font-normal text-gray-500">
                ({items.length} item{items.length !== 1 ? "s" : ""})
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="glpi-switch" className="text-sm text-gray-600">
                GLPI
              </Label>
              <Switch
                id="glpi-switch"
                checked={isGlpiEnabled}
                onCheckedChange={setIsGlpiEnabled}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Drag to reorder items. The order will be preserved when copying to tasks.
          </p>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No items yet. Add your first checklist item above.</p>
            </div>
          ) : (
            <>
              {/* Items count and pagination info */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, items.length)} of {items.length} items
                </span>
                {totalPages > 1 && (
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                )}
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="checklist-items">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-4"
                    >
                      {paginatedItems.map((item: ChecklistItem, index: number) => {
                        const globalIndex = startIndex + index;
                        return (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={cn(
                                  "flex items-start gap-4 p-4 rounded-lg border transition-colors",
                                  snapshot.isDragging
                                    ? "bg-blue-50 border-blue-300 shadow-lg"
                                    : "bg-white border-gray-200 hover:border-gray-300"
                                )}
                              >
                                <div
                                  {...provided.dragHandleProps}
                                  className="mt-1 cursor-grab active:cursor-grabbing"
                                >
                                  <GripVertical className="h-5 w-5 text-gray-400" />
                                </div>

                                {editingId === item.id ? (
                                  <div className="flex-1 space-y-3">
                                    <Input
                                      value={editTitle}
                                      onChange={(e) => setEditTitle(e.target.value)}
                                      className="h-9"
                                      autoFocus
                                    />
                                    <Textarea
                                      value={editDescription}
                                      onChange={(e) => setEditDescription(e.target.value)}
                                      rows={2}
                                      placeholder="Description (optional)"
                                    />
                                    {/* Required Photo and Remarks toggles */}
                                    <div className="flex flex-wrap gap-4">
                                      <div className="flex items-center gap-2">
                                        <Switch
                                          id={`edit-require-photo-${item.id}`}
                                          checked={editRequirePhoto}
                                          onCheckedChange={setEditRequirePhoto}
                                        />
                                        <Label htmlFor={`edit-require-photo-${item.id}`} className="flex items-center gap-1 text-xs cursor-pointer">
                                          <Camera className="h-3.5 w-3.5 text-gray-500" />
                                          Req. Photo
                                        </Label>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Switch
                                          id={`edit-require-remarks-${item.id}`}
                                          checked={editRequireRemarks}
                                          onCheckedChange={setEditRequireRemarks}
                                        />
                                        <Label htmlFor={`edit-require-remarks-${item.id}`} className="flex items-center gap-1 text-xs cursor-pointer">
                                          <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
                                          Req. Remarks
                                        </Label>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={handleSaveEdit}
                                        disabled={!editTitle.trim() || isUpdating}
                                      >
                                        {isUpdating && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                                        <Check className="h-3 w-3 mr-1" />
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCancelEdit}
                                      >
                                        <X className="h-3 w-3 mr-1" />
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3">
                                        <span className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                                          {globalIndex + 1}
                                        </span>
                                        <p className="font-medium text-gray-900 truncate">
                                          {item.title}
                                        </p>
                                        {/* Required badges */}
                                        {(item.requirePhoto || item.requireRemarks) && (
                                          <div className="flex items-center gap-1.5">
                                            {item.requirePhoto && (
                                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                                <Camera className="h-3 w-3" />
                                              </span>
                                            )}
                                            {item.requireRemarks && (
                                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                                <MessageSquare className="h-3 w-3" />
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      {item.description && (
                                        <p className="text-sm text-gray-500 mt-2 ml-10">
                                          {item.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleStartEdit(item)}
                                        className="h-9 w-9 p-0"
                                      >
                                        <Edit className="h-4 w-4 text-gray-500" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteItem(item.id)}
                                        disabled={isDeleting}
                                        className="h-9 w-9 p-0 hover:text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>

                      {/* Page Numbers */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                        // Show first page, last page, current page, and pages around current
                        const showPage = pageNum === 1 ||
                                       pageNum === totalPages ||
                                       Math.abs(pageNum - currentPage) <= 1;

                        if (!showPage) {
                          // Show ellipsis for gaps
                          if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                            return (
                              <PaginationItem key={pageNum}>
                                <span className="px-2 text-muted-foreground">...</span>
                              </PaginationItem>
                            );
                          }
                          return null;
                        }

                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setPage(pageNum)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
